import {
  findPrimaryTextbookContext,
  detectClassNumber,
  detectSubject,
  detectPageNumber,
  detectPedagogyIntent
} from "../src/lib/knowledge/primaryTextbooks.js";

console.log("=================================================================");
console.log("🧪 TESTING CLASS 1-5 PRIMARY TEACHER & PAGE-BY-PAGE INTELLIGENCE");
console.log("=================================================================\n");

const testCases = [
  {
    title: "TEST 1: Class 1 Bangla Page 15 Query",
    query: "Class 1 এর বাংলা বইয়ের ১৫ পৃষ্ঠায় কি কি আছে?",
  },
  {
    title: "TEST 2: Class 2 Bangla Page 3 Query (Banglish)",
    query: "Class 2 bangla boi er 3 number prishtay ki ache?",
  },
  {
    title: "TEST 3: Class 1 Math Pedagogy ('kivabe shikhano jay')",
    query: "১ম শ্রেণির ছোট বাচ্চাকে কীভাবে ছবি ও বাস্তব জিনিস দিয়ে গণনা বা যোগ শেখাবো?",
  },
  {
    title: "TEST 4: Class 3 Science Lesson 1 Query",
    query: "Class 3 বিজ্ঞান বইয়ের প্রথম অধ্যায়ে কি কি আছে ও কীভাবে পড়াতে হবে?",
  },
  {
    title: "TEST 5: Class 5 Science First Chapter Query",
    query: "৫ম শ্রেণির প্রাথমিক বিজ্ঞান বইয়ের প্রথম অধ্যায়ের নাম ও বিষয়বস্তু কী?",
  }
];

for (const t of testCases) {
  console.log(`\n─────────────────────────────────────────────────────────────────`);
  console.log(`📌 ${t.title}`);
  console.log(`🗣️ Query: "${t.query}"`);
  console.log(`- Detected Class: ${detectClassNumber(t.query)}`);
  console.log(`- Detected Subject: ${detectSubject(t.query)}`);
  console.log(`- Detected Page: ${detectPageNumber(t.query)}`);
  console.log(`- Pedagogy Intent: ${detectPedagogyIntent(t.query)}`);
  console.log(`\n📚 Grounded Context Output:`);
  
  const ctx = findPrimaryTextbookContext(t.query);
  if (ctx) {
    console.log(ctx.slice(0, 500) + (ctx.length > 500 ? "\n... [Remaining context truncated for display]" : ""));
  } else {
    console.log("❌ No context found!");
  }
}
