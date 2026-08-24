"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import EmojiPicker from "@/components/EmojiPicker";

/* ===================================================================
   DM Page — Modern messenger-style messaging
   Real-time via Socket.IO (no polling)
   =================================================================== */

interface Conversation {
  id: string;
  updatedAt: string;
  otherUser: { userId: string; username: string; nickname?: string | null } | null;
  lastMessage: { content: string; isMine: boolean; createdAt: string } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  isMine: boolean;
  isRead?: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function shortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function usernameGradient(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const gradients = [
    "from-violet-500 via-purple-500 to-indigo-600",
    "from-emerald-400 via-teal-500 to-cyan-600",
    "from-sky-400 via-blue-500 to-indigo-600",
    "from-amber-400 via-orange-500 to-red-500",
    "from-rose-400 via-pink-500 to-fuchsia-600",
    "from-cyan-400 via-teal-500 to-emerald-600",
    "from-fuchsia-400 via-purple-500 to-violet-600",
    "from-lime-400 via-green-500 to-emerald-600",
  ];
  return gradients[Math.abs(hash) % gradients.length];
}

function usernameTextColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "text-violet-400", "text-emerald-400", "text-sky-400", "text-amber-400",
    "text-rose-400", "text-cyan-400", "text-fuchsia-400", "text-lime-400",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function DMPage() {
  const { user, loading, signInWithGoogle, getToken } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<{ userId: string; username: string; nickname?: string | null } | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [showNickname, setShowNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState("");

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchResults, setSearchResults] = useState<{ userId: string; username: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const socketInitializedRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const myUsernameRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  // Connect socket
  useEffect(() => {
    if (!user || socketInitializedRef.current) return;
    socketInitializedRef.current = true;
    let mounted = true;

    const connect = async () => {
      const token = await getToken();
      if (!token || !mounted) return;
      const socket = getSocket(token);

      socket.on("dm:message", (msg: Message) => {
        if (!mounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, isRead: false }];
        });
        setTimeout(scrollToBottom, 50);
      });

      // Typing indicator
      socket.on("dm:typing", (data: { conversationId: string; username: string; isTyping: boolean }) => {
        if (!mounted) return;
        if (data.isTyping) {
          setTypingUser(data.username);
        } else {
          setTypingUser(null);
        }
      });

      // Seen receipts — when other user sees my messages
      socket.on("dm:seen", (data: { conversationId: string; seenBy: string }) => {
        if (!mounted) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.isMine && !m.isRead
              ? { ...m, isRead: true }
              : m
          )
        );
      });
    };
    connect();
    return () => { mounted = false; disconnectSocket(); };
  }, [user, scrollToBottom]);

  const fetchConversations = useCallback(async () => {
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
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
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
        myUsernameRef.current = data.myUsername;
        scrollToBottom();
      }
    } catch {}
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (!selectedConvId || !user) return;
    fetchMessages(selectedConvId);
    const socket = getSocket("");
    socket.emit("dm:join", selectedConvId);

    // Mark messages as seen when opening conversation
    socket.emit("dm:seen", { conversationId: selectedConvId });
    setTypingUser(null);

    return () => {
      socket.emit("dm:leave", selectedConvId);
      setTypingUser(null);
    };
  }, [selectedConvId, user, fetchMessages]);

  useEffect(() => { if (user) fetchConversations(); }, [user, fetchConversations]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/profile/nickname", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.nickname) { setMyNickname(data.nickname); setNicknameInput(data.nickname); }
      } catch {}
    })();
  }, [user, getToken]);

  const handleSaveNickname = async () => {
    const val = nicknameInput.trim();
    if (!val || val.length < 2) { setNicknameMsg("At least 2 characters"); return; }
    setNicknameLoading(true); setNicknameMsg("");
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/profile/nickname", { method: "PATCH", headers, body: JSON.stringify({ nickname: val }) });
      const data = await res.json();
      if (res.ok) { setMyNickname(val); setShowNickname(false); setNicknameMsg(""); }
      else setNicknameMsg(data.error || "Failed");
    } catch { setNicknameMsg("Network error"); }
    setNicknameLoading(false);
  };

  const handleInput = (val: string) => {
    setInput(val);
    if (!selectedConvId || !myUsernameRef.current) return;
    const socket = getSocket("");
    if (!socket?.connected) return;

    // Emit typing
    socket.emit("dm:typing", { conversationId: selectedConvId, username: myUsernameRef.current });

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing after 2s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("dm:stop-typing", { conversationId: selectedConvId, username: myUsernameRef.current });
    }, 2000);
  };

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

  const startConversation = async (username: string) => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/dm", { method: "POST", headers, body: JSON.stringify({ targetUsername: username }) });
      const data = await res.json();
      if (data.conversationId) {
        setShowSearch(false); setSearchQuery(""); setSearchResults([]);
        setSelectedConvId(data.conversationId);
        fetchConversations();
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConvId || sending) return;
    setSending(true); setSendError(null);
    const msgContent = input.trim(); setInput("");

    // Stop typing immediately
    const socket = getSocket("");
    const convId = selectedConvId;
    if (socket?.connected && myUsernameRef.current) {
      socket.emit("dm:stop-typing", { conversationId: convId, username: myUsernameRef.current });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    const tempId = "temp-" + Date.now();
    setMessages((prev) => [...prev, { id: tempId, content: msgContent, isMine: true, createdAt: new Date().toISOString() }]);
    setTimeout(scrollToBottom, 50);

    // Try Socket.IO first, fallback to HTTP
    let saved = false;
    if (socket?.connected) {
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timeout")), 8000);
          socket.emit("dm:send", { conversationId: convId, content: msgContent },
            (ack: { ok?: boolean; message?: Message; error?: string }) => {
              clearTimeout(timeout);
              if (ack.ok && ack.message) {
                setMessages((prev) => prev.map((m) => m.id === tempId ? ack.message! : m));
                setConversations((prev) => prev.map((c) =>
                  c.id === convId
                    ? { ...c, lastMessage: { content: msgContent, isMine: true, createdAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }
                    : c
                ));
                saved = true;
                resolve();
              } else {
                reject(new Error(ack.error || "Socket.IO failed"));
              }
            }
          );
        });
      } catch {
        saved = false;
      }
    }

    // HTTP fallback if Socket.IO failed
    if (!saved) {
      try {
        const token = await getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`/api/dm/${convId}`, { method: "POST", headers, body: JSON.stringify({ content: msgContent }) });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m));
          setConversations((prev) => prev.map((c) =>
            c.id === convId
              ? { ...c, lastMessage: { content: msgContent, isMine: true, createdAt: data.message.createdAt }, updatedAt: data.message.createdAt }
              : c
          ));
          saved = true;
        }
      } catch {}
    }

    if (!saved) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(msgContent); setSendError("Send failed — try again");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0f] text-white px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/25">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-1.5">Messages</h2>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-xs">Login to chat with other students in real-time</p>
        <button onClick={signInWithGoogle} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* LEFT: Sidebar */}
      <div className={`${selectedConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] border-r border-white/[0.04] bg-[#0d0d14]`}>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/chat")} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Messages</h1>
              <p className="text-[10px] text-gray-600">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={() => setShowSearch(true)} className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/20" title="New message">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Search Overlay */}
        {showSearch && (
          <div className="absolute inset-0 z-50 bg-[#0d0d14] flex flex-col md:w-[340px] md:relative animate-slide-in-left">
            <div className="flex items-center gap-2 px-4 h-14 border-b border-white/[0.04] shrink-0">
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1 relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search CSH_XXXXXX..." autoFocus className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/30 font-mono transition-all" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchLoading && (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-gray-700 border-t-violet-400 rounded-full animate-spin" />
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && searchQuery.length >= 3 && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <p className="text-gray-500 text-xs">No students found</p>
                </div>
              )}
              {searchResults.map((r) => (
                <button key={r.userId} onClick={() => startConversation(r.username)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-all group">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${usernameGradient(r.username)} flex items-center justify-center text-white text-[11px] font-bold shadow-lg group-hover:scale-105 transition-transform`}>
                    {r.username.slice(-2)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs font-mono text-white group-hover:text-violet-300 transition-colors">{r.username}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Tap to start chatting</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
              {searchQuery.length < 3 && !searchLoading && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <p className="text-gray-500 text-xs text-center">Type a CSH_ username<br/>to find a student</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation List */}
        {!showSearch && (
          <div className="flex-1 overflow-y-auto">
            {loadingConvs && conversations.length === 0 && (
              <div className="flex justify-center py-12">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            {!loadingConvs && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="text-gray-400 text-xs font-medium mb-1">No conversations yet</p>
                <p className="text-gray-600 text-[10px]">Tap <span className="text-violet-400">+</span> to find a student</p>
              </div>
            )}
            {conversations.map((conv) => {
              const isActive = selectedConvId === conv.id;
              return (
                <button key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all group relative ${isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}>
                  {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-violet-500 to-indigo-500" />}
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${conv.otherUser ? usernameGradient(conv.otherUser.username) : "from-gray-600 to-gray-700"} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-md`}>
                    {conv.otherUser?.username.slice(-2) || "??"}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[13px] font-medium truncate ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"} transition-colors`}>
                        {conv.otherUser?.nickname || conv.otherUser?.username || "Unknown"}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                        {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-[11px] truncate ${conv.lastMessage ? (conv.unreadCount > 0 ? "text-gray-400" : "text-gray-600") : "text-gray-700"}`}>
                        {conv.lastMessage ? `${conv.lastMessage.isMine ? "You: " : ""}${conv.lastMessage.content}` : "Start chatting"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 px-1 shadow-md shadow-violet-500/30">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: Messages */}
      <div className={`${selectedConvId ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0 bg-[#0a0a0f]`}>
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.04] shrink-0 bg-[#0d0d14]/80 backdrop-blur-xl">
              <button onClick={() => setSelectedConvId(null)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {otherUser && (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${usernameGradient(otherUser.username)} flex items-center justify-center text-white text-[10px] font-bold shadow-md`}>
                    {otherUser.username.slice(-2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">{otherUser.nickname || otherUser.username}</p>
                    {typingUser ? (
                      <p className="text-[10px] text-emerald-400 animate-pulse">{typingUser} is typing...</p>
                    ) : (
                      <p className="text-[10px] text-gray-600 font-mono">{otherUser.username}</p>
                    )}
                  </div>
                </div>
              )}
              <button onClick={() => { setShowNickname(!showNickname); setNicknameMsg(""); setNicknameInput(myNickname || ""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-violet-500/20 transition-all shrink-0" title="Set your nickname">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-[11px] text-gray-400 hidden sm:inline">{myNickname || "Nickname"}</span>
              </button>
            </div>

            {/* Nickname Panel */}
            {showNickname && (
              <div className="px-4 py-3 border-b border-white/[0.04] bg-[#0d0d14]/60 shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-gray-500 shrink-0">Your name:</p>
                  <input type="text" value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    placeholder="cool_student" maxLength={20} autoFocus
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/30 min-w-0 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()} />
                  <button onClick={handleSaveNickname} disabled={nicknameLoading || !nicknameInput.trim()}
                    className="px-4 py-1.5 text-[11px] font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 shrink-0 transition-all shadow-md shadow-violet-600/20">
                    {nicknameLoading ? "..." : "Save"}
                  </button>
                  <button onClick={() => { setShowNickname(false); setNicknameMsg(""); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/[0.06] shrink-0 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-[9px] text-gray-700 mt-1.5 ml-1">2-20 characters, letters, numbers, _</p>
                {nicknameMsg && <p className={`text-[11px] mt-1.5 ml-1 ${nicknameMsg.includes("saved") || !nicknameMsg.includes("Failed") ? "text-emerald-400" : "text-red-400"}`}>{nicknameMsg}</p>}
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMessages && messages.length === 0 && (
                <div className="flex justify-center py-12">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${otherUser ? usernameGradient(otherUser.username) : "from-gray-600 to-gray-700"} flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg`}>
                    {otherUser?.username.slice(-2) || "??"}
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Say hello!</p>
                  <p className="text-gray-700 text-[11px] mt-1">Send the first message to {otherUser?.nickname || otherUser?.username}</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isLastMyMsg = msg.isMine && idx === messages.length - 1;
                return (
                <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"} animate-[fadeUp_0.2s_ease-out]`}>
                  <div className={`max-w-[75%] px-4 py-2.5 ${
                    msg.isMine
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-violet-500/10"
                      : "bg-white/[0.06] text-gray-200 rounded-2xl rounded-bl-md border border-white/[0.04]"
                  }`}>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.isMine ? "justify-end" : ""}`}>
                      <p className={`text-[9px] ${msg.isMine ? "text-violet-300/70" : "text-gray-600"}`}>{shortTime(msg.createdAt)}</p>
                      {msg.isMine && (
                        <span className={`text-[10px] font-bold ${msg.isRead ? "text-sky-300" : "text-violet-300/70"}`}>
                          {msg.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {sendError && (
              <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-[11px] text-red-400">
                <svg className="w-3.5 h-3.5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {sendError}
                <button onClick={() => setSendError(null)} className="ml-auto text-red-500 hover:text-red-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 pb-4 pt-1 shrink-0">
              <div className="relative flex items-center bg-[#141420] border border-white/[0.08] rounded-2xl px-3 py-2.5 focus-within:border-violet-500/30 focus-within:shadow-lg focus-within:shadow-violet-500/5 transition-all">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-violet-400 hover:bg-white/[0.04] transition-all disabled:opacity-40 mr-1 flex-shrink-0"
                  title="Emoji">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                {showEmojiPicker && <EmojiPicker onSelect={(emoji) => setInput((prev) => prev + emoji)} onClose={() => setShowEmojiPicker(false)} />}
                <input type="text" value={input} onChange={(e) => handleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..." disabled={sending} maxLength={2000}
                  className="flex-1 bg-transparent text-white text-[13px] placeholder-gray-600 focus:outline-none disabled:opacity-40" />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className={`ml-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    input.trim() && !sending
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
                      : "bg-white/[0.04] text-gray-700 cursor-not-allowed"
                  }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              {myUsername && <p className="text-[9px] text-gray-700 text-center mt-1.5">You: <span className="font-mono text-gray-600">{myUsername}</span></p>}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/10 flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-300 mb-1">Messages</h2>
            <p className="text-gray-600 text-[12px] max-w-[200px]">Find a student and start chatting in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
