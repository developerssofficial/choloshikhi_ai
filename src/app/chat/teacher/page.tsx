import ChatInterface from "@/components/ChatInterface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "চলো শিখি শিক্ষক — ব্যক্তিগত গৃহশিক্ষক",
  description: "ধাপে ধাপে পড়া ও অংক বুঝিয়ে দেওয়া ব্যক্তিগত ইন্টারেক্টিভ শিক্ষক।",
};

export default function TeacherChatPage() {
  return <ChatInterface initialMode="education" />;
}
