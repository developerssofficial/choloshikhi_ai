import fs from "fs";
import path from "path";

const testPrompts = [
  {
    category: "Class 5 Science (খাদ্য জাল ও খাদ্য শৃঙ্খল - ১ম অধ্যায়)",
    prompt: "৫ম শ্রেণির প্রাথমিক বিজ্ঞান বইয়ের প্রথম অধ্যায়ের নাম কী? সেখানে খাদ্য শৃঙ্খল ও খাদ্য জাল নিয়ে কী কী প্রশ্ন ও অনুশীলনীর আলোচনা আছে পৃষ্ঠা নম্বর সহ বলো।",
  },
  {
    category: "Class 4 Bangla (পাখির জগৎ)",
    prompt: "৪র্থ শ্রেণির বাংলা বইয়ের পাখির জগৎ গল্পটি কত নম্বর পাঠ ও কোন কোন পৃষ্ঠায় আছে? সেখানে দোয়েল ও বাবুই পাখি সম্পর্কে কী বলা হয়েছে?",
  },
  {
    category: "Class 3 English (Unit 1 to 5)",
    prompt: "Class 3 English for Today বইয়ে কয়টি ইউনিট আছে এবং Unit 1 ও Unit 2 এর নাম ও পৃষ্ঠা নম্বর কত?",
  },
  {
    category: "Class 2 Math (যোগ ও বিয়োগ)",
    prompt: "২য় শ্রেণির প্রাথমিক গণিত বইয়ের যোগ ও বিয়োগ অধ্যায় কত নম্বর অধ্যায় এবং পৃষ্ঠা কত থেকে কত?",
  },
  {
    category: "Class 1 Bangla (ট্রেন ও মামার বাড়ি ছড়া)",
    prompt: "১ম শ্রেণির বাংলা বইয়ে ট্রেন ও মামার বাড়ি ছড়া কোন কোন পাঠে আছে এবং পৃষ্ঠা কত?",
  }
];

async function runTests() {
  console.log("=================================================================");
  console.log("🧪 CHOLOSHIKHI AI - LIVE TEXTBOOK INTELLIGENCE & ACCURACY TEST");
  console.log("=================================================================\n");

  for (let i = 0; i < testPrompts.length; i++) {
    const t = testPrompts[i];
    console.log(`\n─────────────────────────────────────────────────────────────────`);
    console.log(`📌 TEST ${i + 1}: [${t.category}]`);
    console.log(`🗣️ Query: "${t.prompt}"`);
    console.log(`─────────────────────────────────────────────────────────────────`);

    try {
      const startTime = Date.now();
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: t.prompt,
          memory: [],
          role: "teacher",
        }),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (res.ok) {
        const data = await res.json();
        console.log(`⏱️ Response Time: ${elapsed}s`);
        console.log(`🤖 AI Live Authentic Response:`);
        console.log(`-----------------------------------------------------------------`);
        console.log(data.reply || "[No reply received]");
        console.log(`-----------------------------------------------------------------`);
      } else {
        const errText = await res.text();
        console.log(`⚠️ API returned ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.log(`⚠️ Fetch failed:`, err.message);
    }
  }

  console.log("\n=================================================================");
  console.log("🎉 ALL ACCURACY TESTS COMPLETED!");
  console.log("=================================================================");
}

runTests();
