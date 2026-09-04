"use client";

import { useState } from "react";

export interface SelectedTeacherSubject {
  classNumber: number;
  className: string;
  bookId: string;
  bookName: string;
  subject: string;
  icon: string;
  totalLessons: number;
  sampleLessons: string[];
}

const PRIMARY_CLASSES_DATA: Array<{
  classNumber: number;
  className: string;
  icon: string;
  desc: string;
  books: Array<{
    id: string;
    name: string;
    subject: string;
    icon: string;
    totalLessons: number;
    sampleLessons: string[];
  }>;
}> = [
  {
    classNumber: 1,
    className: "১ম শ্রেণি (Class 1)",
    icon: "🌱",
    desc: "৩টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-1-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 46,
        sampleLessons: ["ইতল বিতল (ছড়া)", "ভোর হলো (ছড়া)", "ছুটি (ছড়া)", "হাঁট্টিমা টিম টিম"],
      },
      {
        id: "2026-primary-class-1-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 30,
        sampleLessons: ["Greetings & Farewells", "Alphabet A to Z", "Numbers 1-10", "Rhyme: Two Little Blackbirds"],
      },
      {
        id: "2026-primary-class-1-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 18,
        sampleLessons: ["তুলনা করি ও গণনা (১-১০)", "যোগের প্রাথমিক ধারণা", "বিয়োগের ধারণা", "সহজ জ্যামিতিক আকৃতি"],
      },
    ],
  },
  {
    classNumber: 2,
    className: "২য় শ্রেণি (Class 2)",
    icon: "🌿",
    desc: "৩টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-2-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 29,
        sampleLessons: ["পাঠ ৪: ডালিমকুমার ও কঙ্কনবর্তী", "পাঠ ৮: সিংহ আর ইঁদুরের গল্প", "পাঠ ১৫: কাজের আনন্দ", "পাঠ ২১: ছয় ঋতু", "পাঠ ২৭: দুখু মিয়ার জীবন"],
      },
      {
        id: "2026-primary-class-2-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 28,
        sampleLessons: ["Unit 1: Greetings & Introductions", "Unit 6: Days of the Week", "Rhyme: Rain, Rain, Go Away", "Unit 12: The Golden Goose"],
      },
      {
        id: "2026-primary-class-2-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 10,
        sampleLessons: ["সংখ্যা ও স্থানীয় মান (১-১০০)", "হাতে রেখে যোগ ও বিয়োগ", "গুণের নামতা (১-১০)", "বাংলাদেশি মুদ্রা ও টাকা-পয়সা"],
      },
    ],
  },
  {
    classNumber: 3,
    className: "৩য় শ্রেণি (Class 3)",
    icon: "🌳",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-3-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 18,
        sampleLessons: ["ছবি ও কথা (আমাদের বন্ধুরা)", "চল্ চল্ চল্ (রণসংগীত)", "কুঁজো বুড়ির গল্প", "তালগাছ (কবিতা)"],
      },
      {
        id: "2026-primary-class-3-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 25,
        sampleLessons: ["Unit 1: Introducing a Teacher", "Unit 5: Commands & Instructions", "Unit 10: My Family", "Unit 15: The Crow"],
      },
      {
        id: "2026-primary-class-3-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 10,
        sampleLessons: ["সংখ্যা (১-১০০০০)", "চার অঙ্কের যোগ ও বিয়োগ", "গুণ ও ভাগ", "ভগ্নাংশের ধারণা"],
      },
      {
        id: "2026-primary-class-3-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 4,
        sampleLessons: ["আমাদের পরিবেশ ও জীব-জড়", "জীব ও জড়ের পার্থক্য", "উদ্ভিদ ও প্রাণী", "স্বাস্থ্যবিধি ও পানি"],
      },
      {
        id: "2026-primary-class-3-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বিজিএস",
        icon: "🇧🇩",
        totalLessons: 4,
        sampleLessons: ["প্রাকৃতিক ও সামাজিক পরিবেশ", "আমাদের সমাজ ও পরিবার", "যানবাহন ও যোগাযোগ", "বাংলাদেশের রূপ"],
      },
      {
        id: "2026-primary-class-3-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ইসলাম শিক্ষা",
        icon: "🌙",
        totalLessons: 4,
        sampleLessons: ["আকাইদ ও ঈমান", "ইবাদত ও সালাত", "আখলাক বা চরিত্র", "কুরআন মাজিদ শিক্ষা"],
      },
      {
        id: "2026-primary-class-3-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "হিন্দুধর্ম",
        icon: "🕉️",
        totalLessons: 4,
        sampleLessons: ["ঈশ্বর ও সৃষ্টি", "দেব-দেবী ও পূজা", "সদাচার ও নৈতিকতা", "ধর্মগ্রন্থের কাহিনি"],
      },
      {
        id: "2026-primary-class-3-buddhist",
        name: "বৌদ্ধধর্ম শিক্ষা",
        subject: "বৌদ্ধধর্ম",
        icon: "☸️",
        totalLessons: 4,
        sampleLessons: ["গৌতম বুদ্ধের জীবন", "ত্রিরত্ন বন্দনা", "পঞ্চশীল", "জাতকের গল্প"],
      },
      {
        id: "2026-primary-class-3-christian",
        name: "খ্রিষ্টধর্ম শিক্ষা",
        subject: "খ্রিষ্টধর্ম",
        icon: "✝️",
        totalLessons: 4,
        sampleLessons: ["ঈশ্বর ও সৃষ্টি", "যিশু খ্রিষ্টের জীবন", "প্রার্থনা ও আদেশ", "সততা ও সেবা"],
      },
    ],
  },
  {
    classNumber: 4,
    className: "৪র্থ শ্রেণি (Class 4)",
    icon: "📚",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-4-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 18,
        sampleLessons: ["বাংলাদেশের প্রকৃতি", "পালকির গান (কবিতা)", "বড় রাজা ছোট রাজা", "বীরপুরুষ (কবিতা)"],
      },
      {
        id: "2026-primary-class-4-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 24,
        sampleLessons: ["Unit 1: About Me", "Unit 7: Traffic Rules", "Unit 12: Days in a Calendar", "Unit 20: Food & Habits"],
      },
      {
        id: "2026-primary-class-4-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 14,
        sampleLessons: ["বড় সংখ্যা ও স্থানীয় মান", "যোগ, বিয়োগ, গুণ ও ভাগ", "গাণিতিক প্রতীক", "গুণিতক ও গুণনীয়ক (লসাগু-গসাগু)"],
      },
      {
        id: "2026-primary-class-4-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 4,
        sampleLessons: ["জীব ও পরিবেশ", "উদ্ভিদ ও প্রাণীর খাদ্যশৃঙ্খল", "মাটি ও পানি দূষণ", "পদার্থ ও শক্তির রূপান্তর"],
      },
      {
        id: "2026-primary-class-4-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বিজিএস",
        icon: "🇧🇩",
        totalLessons: 4,
        sampleLessons: ["আমাদের পরিবেশ ও সমাজ", "সমাজে পরস্পরের সহযোগিতা", "বাংলাদেশের ভৌগোলিক রূপ", "নাগরিক অধিকার ও কর্তব্য"],
      },
      {
        id: "2026-primary-class-4-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ইসলাম শিক্ষা",
        icon: "🌙",
        totalLessons: 4,
        sampleLessons: ["ঈমান ও তাওহিদ", "পবিত্রতা ও সালাত", "আখলাকে হামিদা", "নবী-রাসুলগণের জীবনী"],
      },
      {
        id: "2026-primary-class-4-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "হিন্দুধর্ম",
        icon: "🕉️",
        totalLessons: 4,
        sampleLessons: ["ঈশ্বরের রূপ", "ধর্মগ্রন্থ গীতা ও রামায়ণ", "মহাপুরুষদের জীবনী", "সত্যবাদিতা"],
      },
      {
        id: "2026-primary-class-4-buddhist",
        name: "বৌদ্ধধর্ম শিক্ষা",
        subject: "বৌদ্ধধর্ম",
        icon: "☸️",
        totalLessons: 4,
        sampleLessons: ["বুদ্ধের ধর্মোপদেশ", "অষ্টশীল", "বৌদ্ধ তীর্থস্থান", "অহিংসা পরম ধর্ম"],
      },
      {
        id: "2026-primary-class-4-christian",
        name: "খ্রিষ্টধর্ম শিক্ষা",
        subject: "খ্রিষ্টধর্ম",
        icon: "✝️",
        totalLessons: 4,
        sampleLessons: ["বাইবেল পরিচিতি", "যিশুর অলৌকিক কাজ", "দশ আদেশ", "প্রতিবেশীর প্রতি ভালোবাসা"],
      },
    ],
  },
  {
    classNumber: 5,
    className: "৫ম শ্রেণি (Class 5)",
    icon: "🎓",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-5-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 18,
        sampleLessons: ["এই দেশ এই মানুষ", "সংকল্প (কবিতা - কাজী নজরুল ইসলাম)", "সুন্দরবনের প্রাণী", "হাতি আর শিয়ালের গল্প", "বীরের রক্তে স্বাধীন এ দেশ"],
      },
      {
        id: "2026-primary-class-5-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 25,
        sampleLessons: ["Unit 1: Hello!", "Unit 3: Saikat's Family", "Unit 6: Eat Healthy", "Unit 9: Occupations", "Unit 19: The Liberation War Museum"],
      },
      {
        id: "2026-primary-class-5-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 14,
        sampleLessons: ["চার প্রক্রিয়া সম্পর্কিত সমস্যাবলি", "লসাগু ও গসাগু", "ভগ্নাংশ ও দশমিক", "গড় ও শতকরা", "জ্যামিতি ও পরিমাপ"],
      },
      {
        id: "2026-primary-class-5-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 14,
        sampleLessons: ["আমাদের পরিবেশ ও বাস্তুসংস্থান", "পানিচক্র ও পানি বিশুদ্ধকরণ", "পদার্থ ও শক্তি", "মহাবিশ্ব ও আবহাওয়া-জলবায়ু"],
      },
      {
        id: "2026-primary-class-5-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বিজিএস",
        icon: "🇧🇩",
        totalLessons: 12,
        sampleLessons: ["আমাদের মুক্তিযুদ্ধ (১৯৭১)", "ব্রিটিশ শাসন", "বাংলাদেশের ঐতিহাসিক নিদর্শন", "মানবাধিকার ও নারী-পুরুষ সমতা"],
      },
      {
        id: "2026-primary-class-5-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ইসলাম শিক্ষা",
        icon: "🌙",
        totalLessons: 5,
        sampleLessons: ["আকাইদ ও বিশ্বাস", "ইবাদত (সালাত, সাওম, জাকাত)", "আখলাক ও নৈতিকতা", "কুরআন তিলাওয়াত ও তাজবিদ"],
      },
      {
        id: "2026-primary-class-5-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "হিন্দুধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের মহিমা", "ধর্মীয় অনুশাসন ও উৎসব", "শ্রীমদ্ভগবদ্গীতা", "মহাপুরুষদের জীবনী"],
      },
      {
        id: "2026-primary-class-5-buddhist",
        name: "বৌদ্ধধর্ম শিক্ষা",
        subject: "বৌদ্ধধর্ম",
        icon: "☸️",
        totalLessons: 5,
        sampleLessons: ["বুদ্ধের মহাপরিনির্বাণ", "চার আর্যসত্য ও অষ্টাঙ্গিক মার্গ", "ধর্মপদ", "শান্তি ও মৈত্রী"],
      },
      {
        id: "2026-primary-class-5-christian",
        name: "খ্রিষ্টধর্ম শিক্ষা",
        subject: "খ্রিষ্টধর্ম",
        icon: "✝️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের উদ্ধার পরিকল্পনা", "যিশু খ্রিষ্টের ক্রুশারোহণ ও পুনরুত্থান", "খ্রিষ্টীয় মণ্ডলী", "ক্ষমা ও পুনর্মিলন"],
      },
    ],
  },
];

interface TeacherClassSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelected: SelectedTeacherSubject | null;
  onSelectSubject: (selected: SelectedTeacherSubject) => void;
}

export default function TeacherClassSelectorModal({
  isOpen,
  onClose,
  currentSelected,
  onSelectSubject,
}: TeacherClassSelectorModalProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(
    currentSelected?.classNumber || 2
  );

  if (!isOpen) return null;

  const currentClassData =
    PRIMARY_CLASSES_DATA.find((c) => c.classNumber === selectedClassNum) ||
    PRIMARY_CLASSES_DATA[1];

  const handleBookClick = (book: (typeof currentClassData.books)[0]) => {
    onSelectSubject({
      classNumber: currentClassData.classNumber,
      className: currentClassData.className,
      bookId: book.id,
      bookName: book.name,
      subject: book.subject,
      icon: book.icon,
      totalLessons: book.totalLessons,
      sampleLessons: book.sampleLessons,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#12121a] border border-emerald-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-emerald-500/20 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-emerald-900/30 via-transparent to-teal-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                শ্রেণি ও বিষয় নির্বাচন
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  NCTB 2026
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                তুমি যে শ্রেণি ও বিষয়ের পড়া বুঝতে চাও, সেটি সিলেক্ট করো
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: 2 Steps (Class Selector + Subject Grid) */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Step 1: Select Class */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
              ১. প্রথমে শ্রেণি নির্বাচন করো:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRIMARY_CLASSES_DATA.map((c) => {
                const isSelected = c.classNumber === selectedClassNum;
                return (
                  <button
                    key={c.classNumber}
                    onClick={() => setSelectedClassNum(c.classNumber)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? "bg-emerald-600/30 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]"
                        : "bg-white/[0.03] border-white/[0.07] text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.15]"
                    }`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-xs font-bold whitespace-nowrap">
                      {c.className.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {c.desc.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Subject / Book */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
              ২. {currentClassData.className}-এর বিষয় নির্বাচন করো ({currentClassData.books.length}টি বই):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentClassData.books.map((book) => {
                const isCurrentActive =
                  currentSelected?.bookId === book.id &&
                  currentSelected?.classNumber === currentClassData.classNumber;

                return (
                  <button
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group relative overflow-hidden ${
                      isCurrentActive
                        ? "bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border-emerald-400 text-white shadow-xl shadow-emerald-500/20"
                        : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.07] hover:border-emerald-500/40 text-slate-200"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.06] group-hover:bg-emerald-500/20 border border-white/10 group-hover:border-emerald-500/40 flex items-center justify-center text-2xl shrink-0 transition-all">
                      {book.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {book.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0 font-medium">
                          {book.totalLessons}টি পাঠ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        নমুনা পাঠ: {book.sampleLessons.slice(0, 2).join(", ")}...
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <span>শিক্ষকের সাথে পড়া শুরু করো</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>

                    {isCurrentActive && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/30 px-2 py-0.5 rounded-full">
                        ✓ নির্বাচিত
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-black/40 text-xs text-slate-400">
          <span>💡 বিষয় সিলেক্ট করলে শিক্ষক শুধু সেই বইয়ের সিলেবাস অনুযায়ী বোঝাবেন।</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white transition-colors"
          >
            বন্ধ করো
          </button>
        </div>
      </div>
    </div>
  );
}
