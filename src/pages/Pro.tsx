import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Paddle price IDs - replace with your actual price IDs from Paddle Dashboard
const PADDLE_PRICE_ID_MONTHLY = "pri_your_monthly_price_id";
const PADDLE_PRICE_ID_ANNUAL = "pri_your_annual_price_id";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: { token: string; environment: string }) => void;
      Checkout: {
        open: (config: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: { email?: string };
          successUrl?: string;
        }) => void;
      };
    };
  }
}

const PRO_FEATURES = [
  {
    icon: "🧠",
    title: "10x Context Memory",
    description: "Remembers up to 400 prompts (800 messages) instead of 40. Your AI recalls everything in depth.",
    highlight: "400 prompts",
  },
  {
    icon: "💬",
    title: "5x Message Retention",
    description: "AI memory summary covers last 100 messages instead of 20. Richer, more accurate context.",
    highlight: "100 messages",
  },
  {
    icon: "⚡",
    title: "Premium Model Access",
    description: "Access to Xparrow 1.0 Pro - premium AI with 1M token context window.",
    highlight: "1M tokens",
  },
  {
    icon: "🚀",
    title: "Priority Response",
    description: "Faster responses with priority processing. No queuing, direct API access.",
    highlight: "Instant",
  },
  {
    icon: "🔒",
    title: "Extended Cache",
    description: "Responses cached for 72 hours instead of 24. Faster repeated queries.",
    highlight: "72h cache",
  },
  {
    icon: "🎯",
    title: "Advanced Routing",
    description: "Smarter model routing with better understanding of complex queries.",
    highlight: "AI-powered",
  },
];

const COMPARE_TABLE = [
  { feature: "Context Memory", free: "40 prompts", pro: "400 prompts (10x)" },
  { feature: "Message Retention", free: "20 messages", pro: "100 messages (5x)" },
  { feature: "Context Window", free: "Standard", pro: "1M tokens" },
  { feature: "Cache Duration", free: "24 hours", pro: "72 hours" },
  { feature: "Response Speed", free: "Standard", pro: "Priority" },
  { feature: "Model Access", free: "Low & Medium", pro: "All models incl. Pro" },
  { feature: "Advanced Routing", free: "Basic", pro: "AI-powered" },
];

export default function Pro() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const { user, session } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetch("/api/subscription/status", {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setIsPro(data.active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Initialize Paddle.js
  useEffect(() => {
    if (window.Paddle) return;

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = async () => {
      try {
        const res = await fetch("/api/subscription/config");
        const data = await res.json();
        if (data.success && window.Paddle) {
          window.Paddle.Initialize({
            token: data.clientToken,
            environment: data.environment,
          });
        }
      } catch {
        // Paddle not configured
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleCheckout = () => {
    if (!user?.email) {
      alert("Please sign in first.");
      return;
    }

    if (!window.Paddle?.Checkout) {
      alert("Payment system is loading. Please try again in a moment.");
      return;
    }

    const priceId = billing === "monthly" ? PADDLE_PRICE_ID_MONTHLY : PADDLE_PRICE_ID_ANNUAL;

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email },
      successUrl: window.location.origin + "/pro?success=true",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px"
        }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#0f0f15]/80 backdrop-blur-xl border-b border-white/10 py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 text-white/80 hover:text-white transition-colors group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Xparrow AI</span>
          </Link>
          <Link to="/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Chat
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-amber-400 text-sm font-medium">Premium Features</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-amber-200 to-orange-200 bg-clip-text text-transparent">
              Xparrow AI PRO
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Unlock the full power of AI with 10x context, 5x memory, and premium model access.
          </p>
        </div>

        {/* Pro Status */}
        {!loading && isPro && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-3 bg-green-500/10 border border-green-500/20 rounded-2xl px-8 py-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold text-lg">You are a Pro member!</span>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {PRO_FEATURES.map((feature, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{feature.description}</p>
              <span className="inline-block bg-amber-500/10 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                {feature.highlight}
              </span>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Free vs Pro
          </h2>
          <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 bg-white/5 border-b border-white/10 text-sm font-semibold">
              <div className="p-4 text-gray-400">Feature</div>
              <div className="p-4 text-center text-gray-400">Free</div>
              <div className="p-4 text-center text-amber-400">Pro</div>
            </div>
            {COMPARE_TABLE.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 text-sm ${i < COMPARE_TABLE.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div className="p-4 text-white">{row.feature}</div>
                <div className="p-4 text-center text-gray-500">{row.free}</div>
                <div className="p-4 text-center text-amber-400 font-medium">{row.pro}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        {!loading && !isPro && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Upgrade to Pro
            </h2>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
                <button
                  onClick={() => setBilling("monthly")}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    billing === "monthly"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling("annual")}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    billing === "annual"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Annual
                  <span className="ml-1 text-xs text-green-400">Save 20%</span>
                </button>
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
              <div className="text-5xl font-bold text-white mb-2">
                {billing === "monthly" ? "$9.99" : "$79.99"}
                <span className="text-lg text-gray-400 font-normal">
                  /{billing === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              <p className="text-gray-400 mb-8">
                {billing === "annual" && "That's just $6.67/month — save 20%!"}
              </p>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-8 py-4 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all transform hover:scale-[1.02] btn-click"
              >
                Upgrade to Pro
              </button>

              <p className="text-xs text-gray-500 mt-4">
                Secure payment powered by Paddle. Cancel anytime.
              </p>
            </div>
          </div>
        )}

        {/* Back to Chat */}
        <div className="text-center mt-16">
          <Link
            to="/chat"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Chat</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
