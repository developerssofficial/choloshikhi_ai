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
        totalLessons: 54,
        sampleLessons: ["পাঠ ১: আমার পরিচয়", "পাঠ ৯: বাঘ ও রাখাল", "পাঠ ২৫: ট্রেন", "পাঠ ৪০: মামার বাড়ি", "পাঠ ৪৬: পিঁপড়া ও পায়রার গল্প", "পাঠ ৫৪: আমার ঠিকানা"],
      },
      {
        id: "2026-primary-class-1-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 5,
        sampleLessons: ["Unit 1: Greetings and Farewells", "Unit 2: Alphabet and Numbers", "Unit 3: Classroom Instructions", "Unit 4: Questions and Answers", "Unit 5: Rhymes and Sounds"],
      },
      {
        id: "2026-primary-class-1-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 18,
        sampleLessons: ["১. তুলনা করি", "৩. সংখ্যা (১ থেকে ১০)", "৪. যোগের ধারণা", "৫. বিয়োগের ধারণা", "১০. স্থানীয় মান", "১২. জ্যামিতি", "১৭. বাংলাদেশি মুদ্রা"],
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
        sampleLessons: ["পাঠ ১: আমার পরিচয়", "পাঠ ৪: ডালিমকুমার ও কঙ্কাবতী", "পাঠ ৮: সিংহ আর ইঁদুরের গল্প", "পাঠ ১৫: কাজের আনন্দ", "পাঠ ১৯: প্রজাপতি", "পাঠ ২৩: আমাদের ছোটো নদী", "পাঠ ২৭: দুখু মিয়ার জীবন"],
      },
      {
        id: "2026-primary-class-2-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 10,
        sampleLessons: ["Unit 1: Greetings, Introductions & Numbers", "Unit 2: Alphabet & Numbers", "Unit 4: Size and Shapes", "Unit 6: Animals", "Unit 10: Story Time"],
      },
      {
        id: "2026-primary-class-2-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 7,
        sampleLessons: ["১. সংখ্যা ও স্থানীয় মান", "২. যোগ ও বিয়োগ", "৩. গুণ", "৪. জ্যামিতিক আকৃতি ও প্যাটার্ন", "৫. পরিমাপ", "৬. মুদ্রা", "৭. উপাত্ত"],
      },
    ],
  },
  {
    classNumber: 3,
    className: "৩য় শ্রেণি (Class 3)",
    icon: "🌳",
    desc: "৭টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-3-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 30,
        sampleLessons: ["পাঠ ১: আমাদের কথা", "পাঠ ৩: চল্ চল্ চল্", "পাঠ ৫: কুঁজো বুড়ির গল্প", "পাঠ ১১: কানামাছি", "পাঠ ১৭: রাজা ও তাঁর তিন কন্যা", "পাঠ ২৯: প্রতিযোগিতায় নাম লিখি"],
      },
      {
        id: "2026-primary-class-3-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 8,
        sampleLessons: ["Unit 1: Introducing Yourself & Others", "Unit 2: Numbers", "Unit 4: People Who Help Us", "Unit 6: Animals and Habitats", "Unit 8: Facts and Fables"],
      },
      {
        id: "2026-primary-class-3-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 13,
        sampleLessons: ["১. সংখ্যা", "২. যোগ", "৩. বিয়োগ", "৪. গুণ", "৫. ভাগ", "৭. বাংলাদেশি মুদ্রা ও নোট", "৮. ভগ্নাংশ", "১০. জ্যামিতি"],
      },
      {
        id: "2026-primary-class-3-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 12,
        sampleLessons: ["১. উদ্ভিদ পরিচিতি", "২. মেরুদণ্ডী প্রাণী", "৩. পুষ্টি ও খাদ্য", "৫. বায়ু ও বায়ু দূষণ", "৬. শক্তির ব্যবহার", "৮. পদার্থের অবস্থা", "১১. তথ্য ও যোগাযোগ"],
      },
      {
        id: "2026-primary-class-3-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বাংলাদেশ ও বিশ্বপরিচয়",
        icon: "🇧🇩",
        totalLessons: 13,
        sampleLessons: ["১. আমাদের পরিবেশ", "৩. সমাজ ও পরিবার", "৪. মানুষের পেশা", "৭. মহাদেশ ও মহাসাগর", "৮. আমাদের ইতিহাস ও সংস্কৃতি", "১২. জরুরি পরিস্থিতি মোকাবিলা"],
      },
      {
        id: "2026-primary-class-3-islam",
        name: "ইসলাম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕌",
        totalLessons: 5,
        sampleLessons: ["১. স্রষ্টা ও সৃষ্টি", "২. ইবাদত ও সালাত", "৩. আখলাক ও চরিত্র গঠন", "৪. কুরআন মাজিদ শিক্ষা", "৫. জীবজগৎ ও প্রকৃতির প্রতি ভালোবাসা"],
      },
      {
        id: "2026-primary-class-3-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "ধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["১. স্রষ্টা ও সৃষ্টি", "২. দেবদেবী ও পূজা", "৩. ধর্ম ও নীতিশিক্ষা", "৪. সততা ও সদাচার", "৫. প্রকৃতি ও পরিবেশ এবং দেশপ্রেম"],
      },
    ],
  },
  {
    classNumber: 4,
    className: "৪র্থ শ্রেণি (Class 4)",
    icon: "🎓",
    desc: "৭টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-4-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 23,
        sampleLessons: ["পাঠ ১: রূপময় বাংলাদেশ", "পাঠ ৩: বাঘের সাথে যুদ্ধ", "পাঠ ৫: বড় রাজা ও ছোট রাজা", "পাঠ ১২: কাজলা দিদি", "পাঠ ১৩: দানবীর মুহসিন", "পাঠ ১৭: লিচু-চোর", "পাঠ ২০: মহীয়সী রোকেয়া", "পাঠ ২৩: পাঠাগারের সদস্য হই"],
      },
      {
        id: "2026-primary-class-4-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 18,
        sampleLessons: ["Unit 1: Introducing One Another", "Unit 3: Days and Months", "Unit 7: The Zoo", "Unit 11: Daily Life", "Unit 15: Natural Beauty", "Unit 18: Caring for Others"],
      },
      {
        id: "2026-primary-class-4-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 11,
        sampleLessons: ["১. সংখ্যা ও স্থানীয় মান", "২. যোগ ও বিয়োগ", "৩. গুণ", "৪. ভাগ", "৫. হিসাবের ক্রম ও বন্ধনী", "৬. গাণিতিক প্রতীক", "৭. গুণিতক ও গুণনীয়ক", "৮. সাধারণ ভগ্নাংশ", "৯. দশমিক ভগ্নাংশ", "১০. পরিমাপ"],
      },
      {
        id: "2026-primary-class-4-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 12,
        sampleLessons: ["১. জীবের বৃদ্ধি ও প্রজনন", "২. উদ্ভিদ ও প্রাণীর পুষ্টি", "৩. বায়ু ও বায়ু প্রবাহ", "৪. মাটি ও মাটির উর্বরতা", "৫. পদার্থ ও পদার্থের পরিবর্তন", "৬. শক্তি ও শক্তির রূপান্তর", "৯. আমাদের সৌরজগৎ", "১১. সমস্যা সমাধানে ICT"],
      },
      {
        id: "2026-primary-class-4-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বাংলাদেশ ও বিশ্বপরিচয়",
        icon: "🇧🇩",
        totalLessons: 15,
        sampleLessons: ["১. প্রাকৃতিক ও সামাজিক পরিবেশ", "৩. সমাজে সবার সমান অধিকার", "৬. বাংলাদেশের সংস্কৃতি ও ঐতিহ্য", "৮. বাংলাদেশের ভৌগোলিক অঞ্চল", "১০. আমাদের মুক্তিযুদ্ধ ও বিজয়", "১৪. জরুরি পরিস্থিতি মোকাবিলা"],
      },
      {
        id: "2026-primary-class-4-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ধর্ম",
        icon: "🕌",
        totalLessons: 5,
        sampleLessons: ["১. আকাইদ ও ইবাদত", "২. সালাত ও তাহারাত", "৩. আখলাক ও মূল্যবোধ", "৪. কুরআন শিক্ষা ও তাজবিদ", "৫. জীবজগৎ ও প্রকৃতির প্রতি ভালোবাসা"],
      },
      {
        id: "2026-primary-class-4-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "ধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["১. স্রষ্টা ও সৃষ্টি", "২. দেবদেবী ও পূজার নিয়ম", "৩. হিন্দুধর্মের মূল শিক্ষা ও নীতি", "৪. সদাচার ও সমাজসেবা", "৫. জীবসেবা ও দেশপ্রেম"],
      },
    ],
  },
  {
    classNumber: 5,
    className: "৫ম শ্রেণি (Class 5)",
    icon: "🏆",
    desc: "৭টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-5-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 23,
        sampleLessons: ["পাঠ ১: বৈচিত্র্যময় বাংলাদেশ", "পাঠ ২: বীর তিতুমীর", "পাঠ ৫: ঘাসফুল", "পাঠ ৭: অবাক জলপান", "পাঠ ১১: সুন্দরবনের প্রাণী", "পাঠ ১৭: বীরশ্রেষ্ঠদের কথা", "পাঠ ২০: শিক্ষাগুরুর মর্যাদা", "পাঠ ২৩: পোস্টার লিখি, প্ল্যাকার্ড লিখি"],
      },
      {
        id: "2026-primary-class-5-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 20,
        sampleLessons: ["Unit 1: At the Library", "Unit 3: Greetings & Introductions", "Unit 6: Healthy Eating", "Unit 9: Safety First", "Unit 14: Story: The Hare and the Tortoise", "Unit 17: Our Liberation War", "Unit 20: Writing a Story"],
      },
      {
        id: "2026-primary-class-5-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 10,
        sampleLessons: ["১. গুণ ও ভাগ", "২. চার প্রক্রিয়া সম্পর্কিত সমস্যা", "৩. গাণিতিক প্রতীক ও নিয়ম", "৪. গুণনীয়ক ও গুণিতক (ল.সা.গু ও গ.সা.গু)", "৫. ভগ্নাংশ (সাধারণ ও দশমিক)", "৬. শতাংশ ও লাভ-ক্ষতি", "৭. জ্যামিতি", "৮. পরিমাপ", "১০. উপাত্ত বিন্যস্তকরণ"],
      },
      {
        id: "2026-primary-class-5-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 14,
        sampleLessons: ["১. জীবের আবাসস্থল", "২. পুষ্টি ও সুষম খাদ্য", "৩. বায়ু ও গ্রিনহাউস প্রতিক্রিয়া", "৪. পদার্থ ও অণু-পরমাণু", "৫. তাপ ও আলোক শক্তি", "৬. জলবায়ু পরিবর্তন ও বৈশ্বিক উষ্ণায়ন", "৯. মহাবিশ্ব ও সৌরজগত", "১৩. সমস্যা সমাধানে ICT ও প্রযুক্তি"],
      },
      {
        id: "2026-primary-class-5-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বাংলাদেশ ও বিশ্বপরিচয়",
        icon: "🇧🇩",
        totalLessons: 17,
        sampleLessons: ["১. জলবায়ু পরিবর্তন ও দুর্যোগ", "২. আমাদের সমাজ ও পরিবেশ", "৫. নাগরিক অধিকার ও দায়িত্ব", "৭. বাংলাদেশের অর্থনীতি ও শিল্প", "৯. মুক্তিযুদ্ধের গৌরবময় ইতিহাস", "১২. আন্তর্জাতিক সহযোগিতামূলক সংস্থা", "১৬. জরুরি পরিস্থিতি"],
      },
      {
        id: "2026-primary-class-5-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ধর্ম",
        icon: "🕌",
        totalLessons: 5,
        sampleLessons: ["১. আকাইদ ও ঈমান", "২. ইবাদত ও আত্মশুদ্ধি", "৩. উত্তম চরিত্র ও আখলাক", "৪. কুরআন মাজিদ ও তাজবিদ শিক্ষা", "৫. জীবজগৎ ও প্রকৃতির প্রতি ভালোবাসা"],
      },
      {
        id: "2026-primary-class-5-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "ধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["১. সৃষ্টিকর্তা ও হিন্দুধর্মের স্বরূপ", "২. দেবদেবী ও ধর্মগ্রন্থ", "৩. ধর্ম ও নীতিশিক্ষা", "৪. নৈতিক চরিত্র ও সদাচার", "৫. জীবসেবা ও দেশপ্রেম"],
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
