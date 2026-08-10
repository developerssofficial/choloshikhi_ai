import { useState, useEffect } from "react";
import MemorySystem from "@/services/MemorySystem";

interface MemoryStatsProps {
  sessionId: string;
  isVisible: boolean;
}

export default function MemoryStats({ sessionId, isVisible }: MemoryStatsProps) {
  const [stats, setStats] = useState({
    messages: 0,
    prompts: 0,
    maxPrompts: 40,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const memorySystem = MemorySystem.getInstance();
    const updateStats = () => {
      const newStats = memorySystem.getMemoryStats(sessionId);
      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (!isVisible) return null;

  const percentage = Math.min((stats.prompts / stats.maxPrompts) * 100, 100);
  const remaining = stats.maxPrompts - stats.prompts;

  const getColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (percentage >= 90) return "Memory almost full";
    if (percentage >= 70) return "Memory getting full";
    if (percentage >= 50) return "Memory half used";
    return "Memory available";
  };

  const getStatusColor = () => {
    if (percentage >= 90) return "text-red-400";
    if (percentage >= 70) return "text-yellow-400";
    if (percentage >= 50) return "text-blue-400";
    return "text-green-400";
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
      {/* Compact View */}
      <div
        className="px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors rounded-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-300">
              AI Memory
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {stats.prompts}/{stats.maxPrompts} prompts
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${getColor()}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="space-y-3">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-2xl font-bold text-indigo-400">
                  {stats.prompts}
                </div>
                <div className="text-xs text-gray-500">
                  Prompts Stored
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  {stats.messages}
                </div>
                <div className="text-xs text-gray-500">
                  Total Messages
                </div>
              </div>
            </div>

            {/* Memory Info */}
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  Memory Capacity
                </span>
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getColor()}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {percentage.toFixed(1)}% used
                </span>
                <span className="text-xs text-gray-500">
                  {remaining} prompts remaining
                </span>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-indigo-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-300">
                  <p className="font-medium">How Memory Works:</p>
                  <ul className="mt-1 space-y-1 text-xs text-gray-400">
                    <li>• AI remembers your last <strong className="text-gray-300">40 prompts</strong></li>
                    <li>• Each prompt includes your question and AI's response</li>
                    <li>• Total capacity: <strong className="text-gray-300">80 messages</strong></li>
                    <li>• Memory helps AI understand your conversation context</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Visual Example */}
            <div className="bg-white/5 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-400 mb-2">
                Example:
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="bg-white/5 p-2 rounded text-xs">
                    <span className="text-indigo-400">You:</span> "আমার নাম রহিম"
                  </div>
                </div>
                <div className="text-gray-500">→</div>
                <div className="flex-1">
                  <div className="bg-white/5 p-2 rounded text-xs">
                    <span className="text-green-400">AI:</span> "Hello রহিম!"
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                = 1 prompt stored ({stats.prompts}/{stats.maxPrompts})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
