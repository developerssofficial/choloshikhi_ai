import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

async function test() {
  const destPath = path.resolve("data/2026/primary/class-2/class-2-bangla/source/original.pdf");
  const dataBuffer = fs.readFileSync(destPath);
  console.log("Creating PDFParse...");
  const parser = new PDFParse({ data: dataBuffer });
  console.log("Methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
  const textResult = await parser.getText();
  console.log("Text Result total pages:", textResult.pages?.length || textResult.numpages || "N/A");
  console.log("Text preview:", textResult.text?.substring(0, 500) || textResult.substring?.(0, 500) || textResult);
}
test();
