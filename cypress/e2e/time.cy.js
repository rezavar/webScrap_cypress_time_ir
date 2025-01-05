import { baseUrlTime, occasionTpes } from "./constants";
import { convertArabicToPersian, convertEnglishNumbersToPersian, convertPersianToEnglish } from "./helpers";
import { writeFileSync } from "fs"


describe('time ', () => {
  it('passes', () => {

    cy.intercept('GET', '*', (req) => {
      const text = req.url;
      const keywords = ["css", 'js','png','jpg','woff','image','autofill'];
      const regex = new RegExp(keywords.join("|"), "g"); // ایجاد یک عبارت منظم با کلمات کلیدی

      if ( text.match(regex))
        req.reply({
          statusCode: 404,
          body: '',
        });

    }).as('blockAssets');


    let BaseDate = new Date();

    do {
      let {MDate,PDate,Year} = getDates(BaseDate)
      if(Year === 1410)
        break;

      const nextYear = Year+1;
      const csvName = `occasion_data_${Year}.csv`;
      cy.writeFile(csvName, 'ID,MDate,Events\n');

      while(Year !== nextYear){
        parseDay(MDate,PDate,csvName)
        const newDate = getDates(BaseDate)
          MDate = newDate.MDate
          PDate = newDate.PDate
          Year = newDate.Year
      }
    }while (1)

  })
})

function getDates (BaseDate){
  let options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  BaseDate.setDate(BaseDate.getDate() + 1);
  const MDate = BaseDate.toISOString().slice(0, 10).replace(/-/g, "/")
  const PDate = convertPersianToEnglish(BaseDate.toLocaleDateString('fa-IR', options));
  const Year = PDate.slice(0,4) *1
  return {
    MDate,
    PDate,
    Year
  }
}

function parseDay(MDate,PDate,csvName){
  const ID = PDate.replaceAll('/', '')
  getOccasion(PDate).then((Events) => {
    if (Events.length > 0) {
      Events = Events.sort((a, b) => a.type - b.type);
      const eventsJson = JSON.stringify(Events).replaceAll("'", '"');
      const csvContent = `${ID},'${MDate}','${eventsJson}'\n`;
      cy.writeFile(csvName, csvContent, { flag: 'a+' });
    }

  });


}

function getOccasion(PDate) {
  const url = baseUrlTime + convertPersianToEnglish(PDate);

  cy.visit(url);

  return cy.get('.panel-body').then(($ele) => {
    let events = [];

    if ($ele.find('ul.list-unstyled > li').length > 0) {
      cy.get('ul.list-unstyled > li').each(($el) => {
        let description = $el.text().trim().replace(/[\n\r\t\v\f\b\0]/g, '').replace(/\s+/g, ' ');
        description = convertArabicToPersian(description);
        description = convertEnglishNumbersToPersian(description);
        let type = occasionTpes.Shamsi;
        if (description.toLowerCase().match(/\[.*?(january|february|march|april|may|june|july|august|september|october|november|december).*?\]/i)) {
          type = occasionTpes.Miladi;
        }
        else if (description.match(/\[.*?(محرم|صفر|رجب|شعبان|رمضان|شوال|ذی‌القعده|ذی‌الحجه).*?\]/i)) {
          type = occasionTpes.Ghamari;
        }
        events.push({ description, type });
      });
    }
    return cy.wrap(events);
  });
}
