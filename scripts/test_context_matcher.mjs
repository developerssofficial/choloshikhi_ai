import { findPrimaryTextbookContext } from "../src/lib/knowledge/primaryTextbooks.ts";

console.log("=== TEST 1: 'class 2 bangla boi te koyta chapter ase?' ===");
const res1 = findPrimaryTextbookContext("class 2 bangla boi te koyta chapter ase?");
console.log(res1?.slice(0, 300));

console.log("\n=== TEST 2: Multi-turn 'ki ki?' with history ===");
const history = [
  { role: "user", content: "class 2 bangla boi te koyta chapter ase?" },
  { role: "assistant", content: "দ্বিতীয় শ্রেণির 'আমার বাংলা বই'-এ মোট ২৯টি পাঠ রয়েছে।" }
];
const res2 = findPrimaryTextbookContext("ki ki?", history);
console.log(res2?.slice(0, 300));

console.log("\n=== TEST 3: 'koto prishtta?' with history ===");
const res3 = findPrimaryTextbookContext("koto prishtta?", history);
console.log(res3?.slice(0, 300));

console.log("\n=== TEST 4: 'Class 3 biggan boi er chapter gula ki ki?' ===");
const res4 = findPrimaryTextbookContext("Class 3 biggan boi er chapter gula ki ki?");
console.log(res4?.slice(0, 300));
