import ChatInterface from "@/components/ChatInterface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "টাস্ক প্ল্যানার ও রিসার্চ ইঞ্জিন — চলো শিখি",
  description: "যে কোনো বড় কাজ বা পড়ার লক্ষ্যকে ইন্টারেক্টিভ রোডম্যাপ ও টাস্ক ফ্লোচার্টে সাজাও।",
};

export default function PlannerChatPage() {
  return <ChatInterface initialMode="taskplan" />;
}
