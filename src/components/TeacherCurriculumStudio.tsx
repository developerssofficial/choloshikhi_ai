"use client";

import { useState, useEffect } from "react";

export interface SelectedTeacherLesson {
  classNumber: number;
  className: string;
  bookId: string;
  bookName: string;
  subject: string;
  icon: string;
  chapterId?: string;
  chapterNumber?: string;
  chapterTitle?: string;
  chapterType?: string;
  startPage?: number;
  endPage?: number;
  summary?: string;
  totalLessons?: number;
}

interface ChapterItem {
  chapter_id: string;
  chapter_number: string;
  chapter_title: string;
  chapter_type: string;
  author?: string | null;
  start_page: number;
  end_page: number;
  summary: string;
  sections?: Array<{ title: string; page: number }>;
}

interface BookItem {
  id: string;
  name: string;
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
  books: BookItem[];
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
        sampleLessons: ["পাঠ ১: আমার পরিচয়", "পাঠ ৯: বাঘ ও রাখাল", "পাঠ ১৭: ইতল বিতল", "পাঠ ২৫: ট্রেন", "পাঠ ৪০: মামার বাড়ি", "পাঠ ৪৬: পিঁপড়া ও পায়রার গল্প", "পাঠ ৫৪: আমার ঠিকানা"],
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
        sampleLessons: ["পাঠ ১: আমার পরিচয়", "পাঠ ৪: ডালিমকুমার ও কঙ্কাবতী", "পাঠ ৮: সিংহ আর ইঁদুরের গল্প", "পাঠ ১৫: কাজের আনন্দ", "পাঠ ১৯: প্রজাপতি", "পাঠ ২৩: আমাদের ছোটো নদী", "পাঠ ২৭: দুখু মিয়ার জীবন", "পাঠ ২৯: বাক্য নিয়ে খেলা"],
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

interface TeacherCurriculumStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLesson: (lesson: SelectedTeacherLesson, autoPrompt?: string) => void;
  currentSelected?: SelectedTeacherLesson | null;
}

export default function TeacherCurriculumStudio({
  isOpen,
  onClose,
  onSelectLesson,
  currentSelected,
}: TeacherCurriculumStudioProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(
    currentSelected?.classNumber || 1
  );
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const currentClassData =
    PRIMARY_CLASSES_DATA.find((c) => c.classNumber === selectedClassNum) ||
    PRIMARY_CLASSES_DATA[0];

  useEffect(() => {
    if (currentSelected?.bookId) {
      const foundBook = currentClassData.books.find(
        (b) => b.id === currentSelected.bookId
      );
      if (foundBook) {
        setSelectedBook(foundBook);
        return;
      }
    }
    setSelectedBook(currentClassData.books[0]);
  }, [selectedClassNum, currentClassData]);

  useEffect(() => {
    if (!selectedBook) return;

    let isMounted = true;
    setLoadingChapters(true);

    fetch(`/api/books/${selectedBook.id}/chapters`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
          setChapters(data.chapters);
        } else {
          // Fallback sample chapters if API has none
          const fallback = selectedBook.sampleLessons.map((lesson, idx) => ({
            chapter_id: `${selectedBook.id}-ch${idx + 1}`,
            chapter_number: String(idx + 1),
            chapter_title: lesson.replace(/^পাঠ \d+:\s*/, ""),
            chapter_type: "পাঠ",
            start_page: idx * 4 + 1,
            end_page: idx * 4 + 4,
            summary: `${selectedBook.name}-এর ${lesson}। বিষয়বস্তু ও অনুশীলন।`,
          }));
          setChapters(fallback);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = selectedBook.sampleLessons.map((lesson, idx) => ({
          chapter_id: `${selectedBook.id}-ch${idx + 1}`,
          chapter_number: String(idx + 1),
          chapter_title: lesson.replace(/^পাঠ \d+:\s*/, ""),
          chapter_type: "পাঠ",
          start_page: idx * 4 + 1,
          end_page: idx * 4 + 4,
          summary: `${selectedBook.name}-এর ${lesson}। বিষয়বস্তু ও অনুশীলন।`,
        }));
        setChapters(fallback);
      })
      .finally(() => {
        if (isMounted) setLoadingChapters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBook]);

  if (!isOpen) return null;

  const handleChapterClick = (ch: ChapterItem, autoPrompt?: string) => {
    if (!selectedBook) return;
    onSelectLesson(
      {
        classNumber: currentClassData.classNumber,
        className: currentClassData.className,
        bookId: selectedBook.id,
        bookName: selectedBook.name,
        subject: selectedBook.subject,
        icon: selectedBook.icon,
        totalLessons: chapters.length || selectedBook.totalLessons,
        chapterId: ch.chapter_id,
        chapterNumber: ch.chapter_number,
        chapterTitle: ch.chapter_title,
        chapterType: ch.chapter_type,
        startPage: ch.start_page,
        endPage: ch.end_page,
        summary: ch.summary,
      },
      autoPrompt
    );
    onClose();
  };

  const filteredChapters = chapters.filter(
    (c) =>
      c.chapter_title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.chapter_number.includes(searchFilter) ||
      (c.summary && c.summary.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85">
      <div className="bg-[#0b0f17] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col relative overflow-hidden text-slate-100">
        
        {/* Studio Header (Snappy & Clean) */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#111622] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
              👨‍🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  শিক্ষক পাঠশালা ও সূচিপত্র স্টুডিও
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  NCTB 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                শ্রেণি, বই ও নির্দিষ্ট পাঠ নির্বাচন করুন — শিক্ষক সরাসরি সেই পাঠের আলোকে উত্তর দেবেন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
            title="বন্ধ করো"
          >
            ✕
          </button>
        </div>

        {/* Studio Body: Split View (Left: Classes & Books, Right: Chapter Table) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Classes & Subjects */}
          <div className="w-full md:w-72 border-r border-slate-800 flex flex-col bg-[#0e131d] p-3.5 space-y-3.5 overflow-y-auto shrink-0">
            {/* Step 1: Class Tabs */}
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                ১. শ্রেণি নির্বাচন:
              </span>
              <div className="grid grid-cols-5 md:grid-cols-1 gap-1">
                {PRIMARY_CLASSES_DATA.map((c) => {
                  const isSelected = c.classNumber === selectedClassNum;
                  return (
                    <button
                      key={c.classNumber}
                      onClick={() => setSelectedClassNum(c.classNumber)}
                      className={`p-2 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-900/40 border-emerald-500 text-white font-semibold shadow-sm"
                          : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{c.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs truncate">{c.className.split(" ")[0]}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 hidden md:block" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Books in Class */}
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                ২. পাঠ্যবই ({currentClassData.books.length}টি):
              </span>
              <div className="space-y-1">
                {currentClassData.books.map((book) => {
                  const isSelected = selectedBook?.id === book.id;
                  return (
                    <button
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between group ${
                        isSelected
                          ? "bg-emerald-950/70 border-emerald-500/80 text-white shadow-sm"
                          : "bg-slate-900/50 hover:bg-slate-800/80 border-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{book.icon}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                            {book.name}
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {book.id === "2026-primary-class-1-bangla" ? "৫৪টি পাঠ" : `${book.totalLessons}টি পাঠ`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-white">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Complete Official Chapter Stream */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#090d14] overflow-hidden">
            {/* Top Bar for Right Column */}
            <div className="px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0d121c] shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{selectedBook?.icon}</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                    {currentClassData.className} — {selectedBook?.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {chapters.length}টি পাঠ
                  </span>
                </div>
              </div>

              {/* Search Filter */}
              <div className="w-40 sm:w-56">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="পাঠ বা বিষয় খুঁজুন..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Chapters Stream (Super Snappy & Clean) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {loadingChapters ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs">অফিশিয়াল সূচিপত্র লোড হচ্ছে...</span>
                </div>
              ) : filteredChapters.length > 0 ? (
                filteredChapters.map((ch) => {
                  const isCurrentActive =
                    currentSelected?.chapterId === ch.chapter_id ||
                    (currentSelected?.bookId === selectedBook?.id &&
                      currentSelected?.chapterNumber === ch.chapter_number);

                  return (
                    <div
                      key={ch.chapter_id}
                      className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentActive
                          ? "bg-emerald-950/40 border-emerald-500 text-white"
                          : "bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold shrink-0">
                            পাঠ {ch.chapter_number}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {ch.chapter_title}
                          </h4>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {ch.chapter_type}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            পৃষ্ঠা {ch.start_page}
                          </span>
                        </div>

                        {ch.summary && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {ch.summary}
                          </p>
                        )}
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            handleChapterClick(
                              ch,
                              `${currentClassData.className}-এর '${selectedBook?.name}' বইয়ের "পাঠ ${ch.chapter_number}: ${ch.chapter_title}" পাঠে কী কী বিষয় আছে এবং এর মূল গল্প/বিষয়বস্তু সহজ ও প্রাঞ্জল ভাষায় সুন্দর করে বুঝিয়ে দাও।`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                        >
                          <span>📖 পাঠটি বুঝিয়ে দাও</span>
                        </button>
                        <button
                          onClick={() =>
                            handleChapterClick(
                              ch,
                              `${currentClassData.className}-এর '${selectedBook?.name}' বইয়ের "পাঠ ${ch.chapter_number}: ${ch.chapter_title}"-এর সকল অনুশীলনী ও প্রশ্নোত্তর সমাধান করে দাও।`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
                          title="অনুশীলনীর প্রশ্ন সমাধান করো"
                        >
                          ❓ প্রশ্ন সমাধান
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  কোনো পাঠ পাওয়া যায়নি। সার্চ ফিল্টার পরিবর্তন করুন।
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studio Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 flex items-center justify-between bg-[#111622] text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              বর্তমান নির্বাচিত: <strong className="text-white">{currentClassData.className} • {selectedBook?.name} ({chapters.length}টি পাঠ)</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-semibold"
          >
            বন্ধ করো
          </button>
        </div>
      </div>
    </div>
  );
}
