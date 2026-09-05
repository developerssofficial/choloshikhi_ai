import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const pdfFn = typeof pdf === "function" ? pdf : pdf.default;

const root = "C:\\Users\\user\\Downloads\\All class book PDF";

async function inspectPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    // Extract first 10 pages for TOC detection
    let maxPages = 10;
    const parsed = await pdfFn(dataBuffer, { max: maxPages });
    return {
      numpages: parsed.numpages,
      text: parsed.text
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  const subdirs = fs.readdirSync(root);
  const results = {};

  for (const dir of subdirs) {
    const fullDir = path.join(root, dir);
    if (!fs.statSync(fullDir).isDirectory()) continue;
    
    console.log(`\n==============================================`);
    console.log(`DIRECTORY: ${dir}`);
    console.log(`==============================================`);
    
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith(".pdf"));
    results[dir] = [];

    for (const f of files) {
      const p = path.join(fullDir, f);
      const res = await inspectPDF(p);
      console.log(`\n--- BOOK: ${f} (${res.numpages || 0} pages) ---`);
      if (res.error) {
        console.log(`ERROR: ${res.error}`);
      } else {
        // Let's print the first 1200 characters of the text
        const snippet = res.text.replace(/\r\n/g, "\n").substring(0, 1500);
        console.log(snippet);
      }
    }
  }
}

run();
