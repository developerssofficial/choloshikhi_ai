import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

for (let c = 1; c <= 5; c++) {
  const filePath = path.resolve(`debug_nctb/class_${c}.html`);
  if (!fs.existsSync(filePath)) continue;
  const html = fs.readFileSync(filePath, "utf-8");
  const $ = cheerio.load(html);

  console.log(`\n======================================================`);
  console.log(`CLASS ${c} TABLE EXTRACTION`);
  console.log(`======================================================`);

  $("table tr").each((rIdx, tr) => {
    const tds = $(tr).find("th, td");
    if (tds.length === 0) return;

    if (rIdx === 0) {
      console.log("HEADERS:", tds.map((i, el) => $(el).text().trim().replace(/\s+/g, " ")).get());
      return;
    }

    const sl = $(tds[0]).text().trim();
    const bnName = $(tds[1]).text().trim().replace(/\s+/g, " ");
    const bnLinks = $(tds[2]).find("a").map((i, a) => ({ text: $(a).text().trim(), href: $(a).attr("href") })).get();
    
    let enName = "";
    let enLinks = [];
    if (tds.length >= 5) {
      enName = $(tds[3]).text().trim().replace(/\s+/g, " ");
      enLinks = $(tds[4]).find("a").map((i, a) => ({ text: $(a).text().trim(), href: $(a).attr("href") })).get();
    }

    console.log(`\n[${sl}] ${bnName}`);
    console.log(`   Bangla Version Links:`, bnLinks);
    if (enName) {
      console.log(`   English Version [${enName}] Links:`, enLinks);
    }
  });
}
