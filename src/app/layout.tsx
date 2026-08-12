import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "চলো শিখি Ai",
  description: "তোমার AI সহকারী — বিনামূল্যে চ্যাট করো, শেখো",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0f0f14] text-white min-h-screen antialiased" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}