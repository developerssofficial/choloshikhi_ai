import ChatInterface from "@/components/ChatInterface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "সাধারণ চ্যাট — চলো শিখি এআই",
  description: "NCTB ২০২৬ কারিকুলাম পাঠ্যবই ও সার্বিক এআই সহায়িকা।",
};

export default function GeneralChatPage() {
  return <ChatInterface initialMode="normal" />;
}
