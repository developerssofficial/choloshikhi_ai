import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0f0f14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "চলো শিখি Ai",
  description: "তোমার AI সহকারী — বিনামূল্যে চ্যাট করো, শেখো",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CholoShikhi",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#0f0f14" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=='undefined'&&'serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(err){console.warn('SW registration failed',err);});}`,
          }}
        />
      </head>
      <body className="bg-[#0f0f14] text-white min-h-screen antialiased" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
