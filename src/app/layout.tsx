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
  metadataBase: new URL("https://choloshikhiai.vercel.app"),
  title: {
    default: "চলো শিখি AI — বাংলাদেশের শ্রেষ্ঠ শিক্ষামূলক AI সহকারী",
    template: "%s | চলো শিখি AI",
  },
  description:
    "চলো শিখি AI হলো বাংলাদেশের ছাত্র-ছাত্রীদের জন্য তৈরি কৃত্রিম বুদ্ধিমত্তা সম্পন্ন পার্সোনাল টিউটর। গণিত সমাধান, বিজ্ঞান, ইংরেজি, শিক্ষক মোড ও স্টাডি প্ল্যানার — সম্পূর্ণ বিনামূল্যে।",
  keywords: [
    "চলো শিখি AI",
    "CholoShikhi AI",
    "CholoShikhi",
    "বাংলা AI",
    "Bangla AI Assistant",
    "AI শিক্ষক",
    "AI Teacher Bangladesh",
    "HSC AI সাহায্য",
    "SSC প্রস্তুতি",
    "BCS প্রস্তুতি",
    "গণিত সমাধান AI",
    "KaTeX Math Bangla",
    "Online Study Assistant",
    "Free Educational AI Bangladesh",
  ],
  authors: [{ name: "Siblings Team", url: "https://choloshikhiai.vercel.app" }],
  creator: "Siblings Team",
  publisher: "CholoShikhi AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://choloshikhiai.vercel.app",
    languages: {
      "bn-BD": "https://choloshikhiai.vercel.app",
      "en-US": "https://choloshikhiai.vercel.app",
    },
  },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    url: "https://choloshikhiai.vercel.app",
    siteName: "চলো শিখি AI",
    title: "চলো শিখি AI — বাংলাদেশের শ্রেষ্ঠ শিক্ষামূলক AI সহকারী",
    description:
      "গণিত সমাধান, বিজ্ঞান, ইংরেজি ব্যাকরণ ও যে কোনো পড়া ধাপে ধাপে শেখার জন্য তোমার সার্বক্ষণিক AI বন্ধু ও শিক্ষক।",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "চলো শিখি AI লোগো",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "চলো শিখি AI — তোমার পার্সোনাল AI শিক্ষক",
    description:
      "বিনামূল্যে চ্যাট করো, জটিল বিষয় সহজে বোঝো এবং পড়াশোনায় এগিয়ে থাকো চলো শিখি AI-এর সাথে।",
    images: ["/logo.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CholoShikhi",
    statusBarStyle: "black-translucent",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "CholoShikhi AI",
      "alternateName": "চলো শিখি AI",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "All",
      "url": "https://choloshikhiai.vercel.app",
      "image": "https://choloshikhiai.vercel.app/logo.png",
      "description":
        "বাংলায় কৃত্রিম বুদ্ধিমত্তা চালিত শিক্ষামূলক ও সার্বিক AI সহকারী — সম্পূর্ণ বিনামূল্যে চ্যাট ও শিখুন।",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "BDT",
      },
      "author": {
        "@type": "Organization",
        "name": "Siblings Team",
      },
    },
    {
      "@type": "EducationalOrganization",
      "name": "CholoShikhi AI",
      "url": "https://choloshikhiai.vercel.app",
      "logo": "https://choloshikhiai.vercel.app/logo.png",
      "description":
        "বাংলাদেশের শিক্ষার্থীদের জন্য আধুনিক কৃত্রিম বুদ্ধিমত্তা প্ল্যাটফর্ম।",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#09090e" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
