import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import StudentProfileSetup from "@/components/StudentProfileSetup";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-hind-siliguri",
});

export const viewport: Viewport = {
  themeColor: "#09090e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "চলো শিখি Ai — তোমার বুদ্ধিমত্তা সহকারী",
  description: "বাংলায় কৃত্রিম বুদ্ধিমত্তা চালিত শিক্ষামূলক ও সার্বিক AI সহকারী — সম্পূর্ণ বিনামূল্যে চ্যাট ও শিখুন।",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CholoShikhi",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#09090e" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=='undefined'&&'serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(err){console.warn('SW registration failed',err);});});}`,
          }}
        />
      </head>
      <body className="bg-[#09090e] text-slate-100 min-h-[100dvh] antialiased selection:bg-violet-500/25 selection:text-white font-sans">
        <AuthProvider>
          <StudentProfileSetup />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
