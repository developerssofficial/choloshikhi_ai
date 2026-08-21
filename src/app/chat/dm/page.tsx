"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

/* ===================================================================
   DM Page — Messenger-style anonymous messaging
   Students only see each other's CSH_XXXXXX username
   =================================================================== */

interface Conversation {
  id: string;
  updatedAt: string;
  otherUser: { userId: string; username: string } | null;
  lastMessage: {
    content: string;
    isMine: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  isMine: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function shortTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Generate a consistent color from a username
function usernameColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-sky-500 to-blue-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-sky-600",
    "from-fuchsia-500 to-purple-600",
    "from-lime-500 to-green-600",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function DMPage() {
  const { user, loading, signInWithGoogle, getToken } = useAuth();
  const router = useRouter();

  // Conversation list state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Message thread state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ userId: string; username: string } | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ userId: string; username: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/dm", { headers });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch {}
    setLoadingConvs(false);
  }, [user, getToken]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (convId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/dm/${convId}`, { headers });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setOtherUser(data.otherUser);
        setMyUsername(data.myUsername);
        setTimeout(scrollToBottom, 100);
      }
    } catch {}
    setLoadingMessages(false);
  }, [user, getToken, scrollToBottom]);

  // Poll for new messages every 5s when conversation is open
  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      pollRef.current = setInterval(() => fetchMessages(selectedConvId), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConvId, fetchMessages]);

  // Load conversations on mount
  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  // Search users
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`/api/dm/search?q=${encodeURIComponent(q)}`, { headers });
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {}
      setSearchLoading(false);
    }, 400);
  };

  // Start or open conversation
  const startConversation = async (username: string) => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/dm", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetUsername: username }),
      });
      const data = await res.json();
      if (data.conversationId) {
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedConvId(data.conversationId);
        fetchConversations();
      }
    } catch {}
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !selectedConvId || sending) return;
    setSending(true);
    const msgContent = input.trim();
    setInput("");

    // Optimistic UI
    const optimisticMsg: Message = {
      id: "temp-" + Date.now(),
      content: msgContent,
      isMine: true,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/dm/${selectedConvId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: msgContent }),
      });
      const data = await res.json();
      if (data.message) {
        // Replace optimistic with real
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
      }
      fetchConversations();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInput(msgContent);
    }
    setSending(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f14]">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f14] text-white px-4">
        <img src="/icons/icon-192.png" alt="CholoShikhi" className="w-12 h-12 rounded-xl mb-4" />
        <p className="text-gray-400 text-sm mb-4 text-center">Login to message other students anonymously</p>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-2.5 text-[13px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors"
        >
          Login with Google
        </button>
      </div>
    );
  }

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  return (
    <div className="flex h-screen bg-[#0f0f14] overflow-hidden">

      {/* ===== LEFT: Conversation List ===== */}
      <div className={`${selectedConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-white/[0.06]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/chat")} className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-white/90">Messages</span>
          </div>
          <button
            onClick={() => setShowSearch(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-400 hover:bg-white/[0.06] transition-all"
            title="New message"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Search Modal */}
        {showSearch && (
          <div className="absolute inset-0 z-50 bg-[#0f0f14] flex flex-col md:w-80 md:relative">
            <div className="flex items-center gap-2 px-4 h-12 border-b border-white/[0.06] shrink-0">
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
                className="text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Enter CSH_XXXXXX username..."
                autoFocus
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none font-mono"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchLoading && (
                <div className="p-4 text-center text-gray-500 text-xs">Searching...</div>
              )}
              {!searchLoading && searchResults.length === 0 && searchQuery.length >= 3 && (
                <div className="p-4 text-center text-gray-500 text-xs">No students found</div>
              )}
              {searchResults.map(r => (
                <button
                  key={r.userId}
                  onClick={() => startConversation(r.username)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04]"
                >
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${usernameColor(r.username)} flex items-center justify-center text-white text-[10px] font-bold`}>
                    {r.username.slice(-2)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-mono text-white">{r.username}</p>
                    <p className="text-[10px] text-gray-500">Tap to start messaging</p>
                  </div>
                </button>
              ))}
              {searchQuery.length < 3 && !searchLoading && (
                <div className="p-6 text-center text-gray-600 text-xs">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Type a CSH_XXXXXX username to find a student
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation List */}
        {!showSearch && (
          <div className="flex-1 overflow-y-auto">
            {loadingConvs && conversations.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-xs">Loading...</div>
            )}
            {!loadingConvs && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p className="text-gray-500 text-xs mb-1">No conversations yet</p>
                <p className="text-gray-600 text-[10px]">Tap + to find a student by username</p>
              </div>
            )}
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] ${
                  selectedConvId === conv.id ? "bg-white/[0.06]" : ""
                }`}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${conv.otherUser ? usernameColor(conv.otherUser.username) : "from-gray-600 to-gray-700"} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                  {conv.otherUser?.username.slice(-2) || "??"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white truncate">{conv.otherUser?.username || "Unknown"}</span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                      {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[11px] text-gray-500 truncate">
                      {conv.lastMessage
                        ? `${conv.lastMessage.isMine ? "You: " : ""}${conv.lastMessage.content}`
                        : "No messages yet"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 w-4 h-4 rounded-full bg-violet-600 text-white text-[8px] flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== RIGHT: Message Thread ===== */}
      <div className={`${selectedConvId ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-white/[0.06] shrink-0">
              <button onClick={() => setSelectedConvId(null)} className="md:hidden text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {otherUser && (
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${usernameColor(otherUser.username)} flex items-center justify-center text-white text-[9px] font-bold`}>
                    {otherUser.username.slice(-2)}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-white">{otherUser.username}</p>
                    <p className="text-[9px] text-gray-500">Anonymous</p>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMessages && messages.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs">Loading messages...</div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-xs">No messages yet</p>
                  <p className="text-gray-700 text-[10px] mt-1">Send the first message!</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                    msg.isMine
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-white/[0.06] text-gray-300 rounded-bl-md"
                  }`}>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[9px] mt-0.5 ${msg.isMine ? "text-violet-300" : "text-gray-600"}`}>
                      {shortTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              <div className="flex items-center bg-[#1a1a24] border border-white/[0.08] rounded-2xl px-3 py-2 focus-within:border-violet-500/30 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  disabled={sending}
                  maxLength={2000}
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none disabled:opacity-40"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="ml-2 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              {myUsername && (
                <p className="text-[9px] text-gray-600 text-center mt-1">You: {myUsername}</p>
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-gray-400 text-sm mb-1">Messages</p>
            <p className="text-gray-600 text-[11px]">Find a student by their CSH_XXXXXX username to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
