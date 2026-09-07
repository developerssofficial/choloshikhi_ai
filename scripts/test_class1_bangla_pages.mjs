import fs from "fs";
import path from "path";

// 18 key pages spanning the whole Class 1 Bangla book
const testPages = [
  {
    page: 1,
    chapter_num: "১",
    title: "আমার পরিচয়",
    studentPrompt: "স্যার, আমি ১ম শ্রেণির ছাত্র। আমার বাংলা বইয়ের ১ নম্বর পৃষ্ঠায় কী কী ছবি আছে এবং এখানে আমাকে কী বলতে ও লিখতে হবে? সহজে বুঝিয়ে দিন।"
  },
  {
    page: 2,
    chapter_num: "২",
    title: "এসো রং করি ও আঁকি",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ২ নম্বর পৃষ্ঠায় কী কী আঁকার ও রং করার কাজ আছে? কিভাবে সহজে করব?"
  },
  {
    page: 3,
    chapter_num: "৩",
    title: "আমি ও আমার বিদ্যালয়",
    studentPrompt: "১ম শ্রেণি বাংলা বইয়ের ৩ নম্বর পৃষ্ঠায় বিদ্যালয় নিয়ে কী ছবি ও আলোচনা আছে? ছাত্র হিসেবে কীভাবে বুঝব?"
  },
  {
    page: 8,
    chapter_num: "৬",
    title: "আমরা কী কী করি",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ৮ নম্বর পৃষ্ঠা 'আমরা কী কী করি' তে কী কী কাজের ছবি ও অনুশীলন আছে?"
  },
  {
    page: 11,
    chapter_num: "৮",
    title: "ছড়া (আতা গাছে তোতা পাখি / ছড়া)",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ১১ নম্বর পৃষ্ঠায় কোন ছড়াটি আছে এবং কী কী ছবি আছে?"
  },
  {
    page: 12,
    chapter_num: "৯",
    title: "বাঘ ও রাখাল",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ১২ নম্বর পৃষ্ঠায় 'বাঘ ও রাখাল' গল্পে কী কী ছবি ও কাহিনী শুরু হয়েছে?"
  },
  {
    page: 15,
    chapter_num: "১০",
    title: "বর্ণ শিখি : অ আ",
    studentPrompt: "১ম শ্রেণি বাংলা বইয়ের ১৫ পৃষ্ঠায় 'অ' আর 'আ' দিয়ে কোন কোন শব্দের ছবি ও পড়া আছে?"
  },
  {
    page: 16,
    chapter_num: "১১",
    title: "বর্ণ শিখি : ই ঈ",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ১৬ নম্বর পৃষ্ঠায় 'ই' এবং 'ঈ' বর্ণ দিয়ে কী কী ছবি আর শব্দ শেখানো হয়েছে?"
  },
  {
    page: 20,
    chapter_num: "১৪",
    title: "বর্ণ শিখি : এ ঐ",
    studentPrompt: "১ম শ্রেণি বাংলা বইয়ের ২০ নম্বর পৃষ্ঠায় 'এ' এবং 'ঐ' দিয়ে কী ছবি ও বাক্য আছে?"
  },
  {
    page: 24,
    chapter_num: "১৭",
    title: "ইতল বিতল",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ২৪ নম্বর পৃষ্ঠায় 'ইতল বিতল' ছড়ায় কী কী ছবি আছে আর ছড়াটা কী?"
  },
  {
    page: 25,
    chapter_num: "১৮",
    title: "কারচিহ্ন দেখি",
    studentPrompt: "১ম শ্রেণি বাংলা বইয়ের ২৫ পৃষ্ঠায় কোন কোন কারচিহ্ন এবং কী কী ছবি ও অনুশীলনী দেওয়া আছে?"
  },
  {
    page: 26,
    chapter_num: "১৯",
    title: "বর্ণ শিখি : ক খ গ ঘ ঙ",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ২৬-২৭ নম্বর পৃষ্ঠায় ক, খ, গ, ঘ, ঙ দিয়ে কী কী শব্দ আর ছবির মাধ্যমে বর্ণ চেনা যায়?"
  },
  {
    page: 36,
    chapter_num: "২৫",
    title: "ট্রেন",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ৩৬ নম্বর পৃষ্ঠায় 'ট্রেন' ছড়া ও ছবিতে কী কী দৃশ্য আছে?"
  },
  {
    page: 44,
    chapter_num: "৩১",
    title: "ও-কার ঔ-কার শিখি",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ৪৪ নম্বর পৃষ্ঠায় ও-কার এবং ঔ-কার দিয়ে কী কী অনুশীলনী ও ছবি আছে?"
  },
  {
    page: 57,
    chapter_num: "৪০",
    title: "মামার বাড়ি",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ৫৭ পৃষ্ঠায় 'মামার বাড়ি' ছড়ায় কী কী ছবি আছে এবং জসীমউদ্‌দীনের ছড়াটি কীভাবে পড়তে হয়?"
  },
  {
    page: 60,
    chapter_num: "৪২",
    title: "ভোর হলো",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ৬০ নম্বর পৃষ্ঠায় 'ভোর হলো' ছড়ায় কী কী পাখির ছবি ও দৃশ্য আছে?"
  },
  {
    page: 67,
    chapter_num: "৪৬",
    title: "পিঁপড়া ও পায়রার গল্প",
    studentPrompt: "১ম শ্রেণি বাংলা বইয়ের ৬৭ নম্বর পৃষ্ঠায় 'পিঁপড়া ও পায়রার গল্প' এ কী কী ছবি ও শিক্ষা আছে?"
  },
  {
    page: 77,
    chapter_num: "৫২",
    title: "আমাদের মুক্তিযুদ্ধ",
    studentPrompt: "১ম শ্রেণির বাংলা বইয়ের ৭৭-৭৮ পৃষ্ঠায় 'আমাদের মুক্তিযুদ্ধ' পাঠে কী কী ছবি ও বীর মুক্তিযোদ্ধাদের কথা বলা হয়েছে?"
  }
];

async function runPageTests() {
  console.log("==========================================================================");
  console.log("🔍 COMPREHENSIVE TEST: CLASS 1 BANGLA BOOK - 18 DISTINCT PAGES TEST");
  console.log("==========================================================================\n");

  const results = [];

  for (let i = 0; i < testPages.length; i++) {
    const t = testPages[i];
    console.log(`\n--------------------------------------------------------------------------`);
    console.log(`📖 [${i + 1}/${testPages.length}] Testing Page ${t.page}: "${t.title}" (পাঠ ${t.chapter_num})`);
    console.log(`🙋 Student Query: "${t.studentPrompt}"`);
    console.log(`--------------------------------------------------------------------------`);

    try {
      const startTime = Date.now();
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: t.studentPrompt,
          memory: [],
          role: "teacher"
        })
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      if (res.ok) {
        const data = await res.json();
        const reply = data.response || "";
        console.log(`⏱️ Duration: ${elapsed}s`);
        console.log(`🤖 AI Live Authentic Response:\n${reply}\n`);

        results.push({
          page: t.page,
          title: t.title,
          chapter: t.chapter_num,
          studentPrompt: t.studentPrompt,
          elapsed,
          response: reply
        });
      } else {
        const err = await res.text();
        console.error(`❌ HTTP ${res.status}: ${err}`);
      }
    } catch (e) {
      console.error(`❌ Request error:`, e.message);
    }
  }

  // Save report
  fs.writeFileSync("reports/class1_bangla_page_test_results.json", JSON.stringify(results, null, 2), "utf8");
  console.log("\n==========================================================================");
  console.log(`✅ Completed ${results.length} Page Tests! Results saved to reports/class1_bangla_page_test_results.json`);
  console.log("==========================================================================");
}

runPageTests();
