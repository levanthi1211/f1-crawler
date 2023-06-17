const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const https = require("https");

const httpsAgent = new https.Agent({ keepAlive: true });

const base_url = "https://www.formula1.com";

const kebabCase = (string) =>
  string
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const races_crawler = async (year) => {
  const { data: html } = await axios.get(
    `${base_url}/en/results.html/${year}/races.html`,
    { httpsAgent }
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
      `${base_url}${grand_prix_data[i].href}`,
      { httpsAgent }
    );
    const $ = cheerio.load(html);
    const table = $(".resultsarchive-col-right table");
    const table_data = [];
    const date = $(".date span.full-date").text().trim();
    const circuit = $(".date span.circuit-info").text().trim();
    if (table) {
      const headings = $(table).find("thead tr th:not(.limiter)");
      const heading_data = [];

      $(headings).each((_, heading) => {
        heading_data.push($(heading).text().trim());
      });

      const rows = $(table).find("tbody tr");

      $(rows).each((_, row) => {
        const cells = $(row).find("td:not(.limiter)");
        const row_data = {};
        $(cells).each((i, cell) => {
          let content;
          if (i === 2) {
            const first_name = $(cell)
              .find("span.hide-for-tablet")
              .text()
              .trim();
            const last_name = $(cell)
              .find("span.hide-for-mobile")
              .text()
              .trim();
            content = `${first_name} ${last_name}`;
          } else if (i === 0 || i === 1 || i === 4 || i === 6) {
            content = parseInt($(cell).text().trim());
          } else {
            content = $(cell).text().trim();
          }
          row_data[heading_data[i].replace(/\//g, "-").toLowerCase()] = content;
        });
        table_data.push({
          ...row_data,
          driver_name_code: kebabCase(row_data.driver),
          car_name_code: kebabCase(row_data.car),
        });
      });
    }

    result.push({
      grand_prix: grand_prix_data[i].name,
      race_name: `${year} ${grand_prix_data[i].name} GP`,
      race_name_code: kebabCase(grand_prix_data[i].name),
      race_results: table_data,
      date,
      circuit,
    });
  }

  return result;
};

const driver_crawler = async (year) => {
  const { data: html } = await axios.get(
    `${base_url}/en/results.html/${year}/drivers.html`,
    { httpsAgent }
  );
  const $ = cheerio.load(html);
  const result = [];

  const table = $("table.resultsarchive-table");
  if (table) {
    const headings = $(table).find("thead tr th:not(.limiter)");
    const heading_data = [];

    $(headings).each((_, heading) => {
      heading_data.push($(heading).text().trim());
    });

    const rows = $(table).find("tbody tr");

    $(rows).each((_, row) => {
      const cells = $(row).find("td:not(.limiter)");
      const row_data = {};
      $(cells).each((i, cell) => {
        let content;
        if (i === 1) {
          const first_name = $(cell).find("span.hide-for-tablet").text().trim();
          const last_name = $(cell).find("span.hide-for-mobile").text().trim();
          content = `${first_name} ${last_name}`;
        } else if (i === 0 || i === 4) {
          content = parseInt($(cell).text().trim());
        } else {
          content = $(cell).text().trim();
        }
        row_data[heading_data[i].replace(/\//g, "-").toLowerCase()] = content;
      });
      result.push({
        ...row_data,
        driver_name_code: kebabCase(row_data.driver),
        car_name_code: kebabCase(row_data.car),
      });
    });
  }

  return result;
};

const main = async () => {
  try {
    const data = [];
    for (let i = 1950; i <= 2023; i++) {
      console.log(`Progress: ${i - 1950}/${2023 - 1950}`);
      const result = await races_crawler(i);
      const drivers = await driver_crawler(i);
      data.push({
        year: i,
        result,
        drivers,
      });
    }
    fs.writeFile(`data.json`, JSON.stringify(data), (error) => {
      if (error) console.log(error);
      console.log(`Save file successfully`);
    });
  } catch (error) {
    throw error;
  }
};

main();
