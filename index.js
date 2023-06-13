const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");

const base_url = "https://www.formula1.com";

const crawler = async (year) => {
  const { data: html } = await axios.get(
    `${base_url}/en/results.html/${year}/races.html`
  );
  const $ = cheerio.load(html);
  const result = [];

  const grand_prixs = $(
    ".resultsarchive-filter-container .resultsarchive-filter-wrap:nth-child(3) li:not(:first-child)"
  );
  const grand_prix_data = [];

  $(grand_prixs).each((_, grand_prix) => {
    const a = $(grand_prix).find("a");
    const href = a.prop("href");
    const name = a.text().trim();
    grand_prix_data.push({ name, href });
  });

  for (let i = 0; i < grand_prix_data.length; i++) {
    const { data: html } = await axios.get(
      `${base_url}${grand_prix_data[i].href}`
    );
    const $ = cheerio.load(html);

    const archives = $(".resultsarchive-col-left li:not(:first-child)");
    const archive_data = [];
    const archive = {};

    $(archives).each((_, archive) => {
      const a = $(archive).find("a");
      const href = a.prop("href");
      const name = a.text().trim();
      archive_data.push({ name, href });
    });

    for (let j = 0; j < archive_data.length; j++) {
      const { data: html } = await axios.get(
        `${base_url}${archive_data[j].href}`
      );
      const $ = cheerio.load(html);

      const table = $(".resultsarchive-col-right table");
      const table_data = [];

      const headings = $(table).find("thead tr th:not(.limiter)");
      const heading_data = [];

      $(headings).each((_, heading) => {
        heading_data.push($(heading).text().trim());
      });

      const rows = $(table).find("tbody tr");

      $(rows).each((i, row) => {
        const cells = $(row).find("td:not(.limiter)");
        const row_data = {};
        $(cells).each((i, cell) => {
          let content;
          if (i === 2) {
            const first_name = $(cell)
              .find("span.hide-for-table")
              .text()
              .trim();
            const last_name = $(cell)
              .find("span.hide-for-mobile")
              .text()
              .trim();
            const uppercase = $(cell)
              .find("span.hide-for-desktop")
              .text()
              .trim();
            content = { first_name, last_name, uppercase };
          } else {
            content = $(cell).text().trim();
          }
          row_data[heading_data[i]] = content;
        });
        table_data.push(row_data);
      });
      archive[archive_data[j].name] = table_data;
    }
    result.push({
      grand_prix: grand_prix_data[i].name,
      ...archive,
    });
  }

  return result;
};

const main = async () => {
  try {
    for (let i = 1950; i <= 2023; i++) {
      const data = await crawler(i);

      fs.writeFile(`data/${i}.json`, JSON.stringify(data), (error) => {
        if (error) console.log(error);
        console.log(`Save file ${i} from f1 data year ${i} successfully`);
      });
    }
  } catch (error) {
    throw error;
  }
};

main();
