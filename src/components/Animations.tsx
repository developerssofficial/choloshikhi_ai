import { useState, useEffect } from "react";

// Premium Loading Animation - Ripple Effect
export function LoadingRipple() {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-indigo-200 rounded-full"></div>
        <div className="w-8 h-8 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
    </div>
  );
}

// Premium Loading Animation - Gradient Spinner
export function GradientSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin"></div>
    </div>
  );
}

// Thinking Animation - Neural Network Style
export function ThinkingAnimation() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-3">
      {/* Neural Network Icon */}
      <div className="relative w-10 h-10 thinking-container">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute inset-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-40 animate-ping"></div>
        <div className="absolute inset-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center animate-neural-pulse">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>
      
      {/* Thinking Text */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">Thinking{dots}</span>
        <span className="text-xs text-gray-500">Processing your request</span>
      </div>
    </div>
  );
}

// Streaming Text Animation
export function StreamingText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 20);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return (
    <span>
      {displayText}
      {currentIndex < text.length && (
        <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse"></span>
      )}
    </span>
  );
}

// Pulse Animation for Messages
export function PulseMessage() {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
      </div>
      <span className="text-xs text-gray-500">Generating response</span>
    </div>
  );
}

// Wave Animation
export function WaveAnimation() {
  return (
    <div className="flex items-end space-x-1 h-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full animate-wave"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: `${20 + Math.random() * 40}%`,
          }}
        ></div>
      ))}
    </div>
  );
}
