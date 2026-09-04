import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

async function testPdfParse() {
  const destPath = path.resolve("data/2026/primary/class-2/class-2-bangla/source/original.pdf");
  const dataBuffer = fs.readFileSync(destPath);
  const fn = typeof pdf === "function" ? pdf : pdf.default;
  const parsed = await fn(dataBuffer);
  console.log(`Total Pages: ${parsed.numpages}`);
  console.log(`Text Length: ${parsed.text.length}`);
  console.log(`Sample Text:\n`, parsed.text.substring(0, 1000));
}

testPdfParse();
