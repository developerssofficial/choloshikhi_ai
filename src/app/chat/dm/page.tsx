"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import EmojiPicker from "@/components/EmojiPicker";

/* ===================================================================
   DM Page — Messenger-style anonymous messaging
   Real-time via Socket.IO (no polling)
   =================================================================== */

interface Conversation {
  id: string;
  updatedAt: string;
  otherUser: { userId: string; username: string } | null;
  lastMessage: { content: string; isMine: boolean; createdAt: string } | null;
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
  return `${Math.floor(hrs / 24)}d`;
}

function shortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function usernameColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "from-violet-500 to-indigo-600", "from-emerald-500 to-teal-600",
    "from-sky-500 to-blue-600", "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600", "from-cyan-500 to-sky-600",
    "from-fuchsia-500 to-purple-600", "from-lime-500 to-green-600",
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
  const [otherUser, setOtherUser] = useState<{ userId: string; username: string } | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchResults, setSearchResults] = useState<{ userId: string; username: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const socketInitializedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); // instant, not smooth
  }, []);

  // Connect socket when user is available
  useEffect(() => {
    if (!user) return;
    if (socketInitializedRef.current) return;
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
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 50);
      });

      socket.on("connect_error", (err: Error) => {
        console.error("Socket connection error:", err.message);
      });
    };

    connect();

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [user, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch conversations via API — stable callback, no deps
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/dm", { headers });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (e) { console.error("fetchConversations error:", e); }
    setLoadingConvs(false);
  }, []); // stable — no deps

  // Fetch messages for a conversation via API (initial load only)
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
        scrollToBottom();
      }
    } catch (e) { console.error("fetchMessages error:", e); }
    setLoadingMessages(false);
  }, []); // stable — no deps

  // When conversation changes: fetch messages + join/leave socket rooms
  useEffect(() => {
    if (!selectedConvId || !user) return;

    // Fetch initial messages
    fetchMessages(selectedConvId);

    // Join socket room
    const socket = getSocket(""); // already connected from mount
    socket.emit("dm:join", selectedConvId);

    return () => {
      // Leave socket room when switching conversations
      socket.emit("dm:leave", selectedConvId);
    };
  }, [selectedConvId, user, fetchMessages]);

  // Load conversations
  useEffect(() => { if (user) fetchConversations(); }, [user, fetchConversations]);

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

  // Start conversation
  const startConversation = async (username: string) => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/dm", { method: "POST", headers, body: JSON.stringify({ targetUsername: username }) });
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

  // Send message via Socket.IO with optimistic update
  const handleSend = async () => {
    if (!input.trim() || !selectedConvId || sending) return;
    setSending(true);
    setSendError(null);
    const msgContent = input.trim();
    setInput("");

    // Optimistic
    const tempId = "temp-" + Date.now();
    setMessages((prev) => [...prev, { id: tempId, content: msgContent, isMine: true, createdAt: new Date().toISOString() }]);
    setTimeout(scrollToBottom, 50);

    try {
      const socket = getSocket("");
      socket.emit(
        "dm:send",
        { conversationId: selectedConvId, content: msgContent },
        (ack: { ok?: boolean; message?: Message; error?: string }) => {
          if (ack.ok && ack.message) {
            // Replace temp message with server-confirmed message
            setMessages((prev) => prev.map((m) => m.id === tempId ? ack.message! : m));
            // Update conversation's last message in sidebar optimistically
            setConversations((prev) =>
              prev.map((c) =>
                c.id === selectedConvId
                  ? { ...c, lastMessage: { content: msgContent, isMine: true, createdAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }
                  : c
              )
            );
          } else {
            // Revert optimistic message
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setInput(msgContent);
            setSendError(ack.error || "Send failed");
          }
          setSending(false);
        }
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(msgContent);
      setSendError("Network error — try again");
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f14]">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f14] text-white px-4">
        <img src="/icons/icon-192.png" alt="CholoShikhi" className="w-12 h-12 rounded-xl mb-4" />
        <p className="text-gray-400 text-sm mb-4 text-center">Login to message other students anonymously</p>
        <button onClick={signInWithGoogle} className="px-6 py-2.5 text-[13px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors">Login with Google</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f0f14] overflow-hidden">
      {/* LEFT: Conversations */}
      <div className={`${selectedConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-white/[0.06]`}>
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/chat")} className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-white/90">Messages</span>
          </div>
          <button onClick={() => setShowSearch(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-400 hover:bg-white/[0.06] transition-all" title="New message">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="absolute inset-0 z-50 bg-[#0f0f14] flex flex-col md:w-80 md:relative">
            <div className="flex items-center gap-2 px-4 h-12 border-b border-white/[0.06] shrink-0">
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }} className="text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="CSH_XXXXXX username..." autoFocus className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none font-mono" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchLoading && <div className="p-4 text-center text-gray-500 text-xs">Searching...</div>}
              {!searchLoading && searchResults.length === 0 && searchQuery.length >= 3 && <div className="p-4 text-center text-gray-500 text-xs">No students found</div>}
              {searchResults.map((r) => (
                <button key={r.userId} onClick={() => startConversation(r.username)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04]">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${usernameColor(r.username)} flex items-center justify-center text-white text-[10px] font-bold`}>{r.username.slice(-2)}</div>
                  <div className="text-left">
                    <p className="text-xs font-mono text-white">{r.username}</p>
                    <p className="text-[10px] text-gray-500">Tap to message</p>
                  </div>
                </button>
              ))}
              {searchQuery.length < 3 && !searchLoading && (
                <div className="p-6 text-center text-gray-600 text-xs">
                  Type a CSH_XXXXXX username to find a student
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation list */}
        {!showSearch && (
          <div className="flex-1 overflow-y-auto">
            {loadingConvs && conversations.length === 0 && <div className="p-4 text-center text-gray-500 text-xs">Loading...</div>}
            {!loadingConvs && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <p className="text-gray-500 text-xs mb-1">No conversations yet</p>
                <p className="text-gray-600 text-[10px]">Tap + to find a student</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => setSelectedConvId(conv.id)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] ${selectedConvId === conv.id ? "bg-white/[0.06]" : ""}`}>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${conv.otherUser ? usernameColor(conv.otherUser.username) : "from-gray-600 to-gray-700"} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>{conv.otherUser?.username.slice(-2) || "??"}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white truncate">{conv.otherUser?.username || "Unknown"}</span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">{conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ""}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[11px] text-gray-500 truncate">{conv.lastMessage ? `${conv.lastMessage.isMine ? "You: " : ""}${conv.lastMessage.content}` : "No messages yet"}</p>
                    {conv.unreadCount > 0 && <span className="ml-2 w-4 h-4 rounded-full bg-violet-600 text-white text-[8px] flex items-center justify-center flex-shrink-0">{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Messages */}
      <div className={`${selectedConvId ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
        {selectedConvId ? (
          <>
            <div className="flex items-center gap-3 px-4 h-12 border-b border-white/[0.06] shrink-0">
              <button onClick={() => setSelectedConvId(null)} className="md:hidden text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {otherUser && (
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${usernameColor(otherUser.username)} flex items-center justify-center text-white text-[9px] font-bold`}>{otherUser.username.slice(-2)}</div>
                  <div>
                    <p className="text-xs font-mono text-white">{otherUser.username}</p>
                    <p className="text-[9px] text-gray-500">Anonymous</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMessages && messages.length === 0 && <div className="text-center py-8 text-gray-500 text-xs">Loading...</div>}
              {!loadingMessages && messages.length === 0 && (
                <div className="text-center py-8"><p className="text-gray-600 text-xs">No messages yet</p><p className="text-gray-700 text-[10px] mt-1">Send the first message!</p></div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.isMine ? "bg-violet-600 text-white rounded-br-md" : "bg-white/[0.06] text-gray-300 rounded-bl-md"}`}>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[9px] mt-0.5 ${msg.isMine ? "text-violet-300" : "text-gray-600"}`}>{shortTime(msg.createdAt)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {sendError && (
              <div className="mx-3 mb-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 flex items-center justify-between">
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="text-red-500 hover:text-red-400 ml-2">✕</button>
              </div>
            )}

            <div className="px-3 pb-3 shrink-0">
              <div className="relative flex items-center bg-[#1a1a24] border border-white/[0.08] rounded-2xl px-3 py-2 focus-within:border-violet-500/30 transition-all">
                {/* Emoji Button */}
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending}
                  className="text-gray-500 hover:text-violet-400 transition-colors disabled:opacity-40 mr-1.5 flex-shrink-0"
                  title="Emoji">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => setInput((prev) => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Type a message..." disabled={sending} maxLength={2000} className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none disabled:opacity-40" />
                <button onClick={handleSend} disabled={!input.trim() || sending} className="ml-2 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              {myUsername && <p className="text-[9px] text-gray-600 text-center mt-1">You: {myUsername}</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-gray-400 text-sm mb-1">Messages</p>
            <p className="text-gray-600 text-[11px]">Find a student by CSH_XXXXXX username</p>
          </div>
        )}
      </div>
    </div>
  );
}
