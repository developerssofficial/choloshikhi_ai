"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import EmojiPicker from "@/components/EmojiPicker";

/* ===================================================================
   Group Chat Page — Modern UI, private groups, real-time Socket.IO
   =================================================================== */

interface Group {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  role: string;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: string;
}

interface GroupMessage {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  senderNickname: string | null;
  isMine: boolean;
  createdAt: string;
}

interface GroupMember {
  userId: string;
  role: string;
  username: string;
  nickname: string | null;
}

function shortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function usernameColor(username: string): string {
  let hash = 0;
  const name = username || "Unknown";
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["text-violet-400", "text-sky-400", "text-emerald-400", "text-amber-400", "text-rose-400", "text-cyan-400", "text-fuchsia-400", "text-teal-400"];
  return colors[Math.abs(hash) % colors.length];
}

function groupGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
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

export default function GroupChatPage() {
  const { user, loading, signInWithGoogle, getToken } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<{ name: string; role: string } | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState<string | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedGroupIdRef = useRef<string | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const groupTypingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const myGroupUsernameRef = useRef<string | null>(null);

  useEffect(() => { selectedGroupIdRef.current = selectedGroupId; }, [selectedGroupId]);

  // ── Socket.IO setup ──
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      const token = await getToken();
      if (!token || !mounted) return;
      const socket = getSocket(token);

      socket.on("group:message", (msg: GroupMessage) => {
        if (!mounted) return;
        setMessages((prev) => {
          const tempIdx = prev.findIndex(
            (m) => m.id.startsWith("temp-") && m.senderId === msg.senderId && m.content === msg.content
          );
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = msg;
            return updated;
          }
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      socket.on("connect", () => {
        const groupId = selectedGroupIdRef.current;
        if (groupId) {
          socket.emit("group:leave", currentRoomRef.current || groupId);
          socket.emit("group:join", groupId);
          currentRoomRef.current = groupId;
        }
      });

      // Group typing indicator
      socket.on("group:typing", (data: { groupId: string; username: string; isTyping: boolean }) => {
        if (!mounted) return;
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (data.isTyping) {
            next.set(data.username, data.username);
          } else {
            next.delete(data.username);
          }
          return next;
        });
      });
    })();

    return () => { mounted = false; disconnectSocket(); };
  }, [user, getToken]);

  useEffect(() => {
    const socket = getSocket("");
    if (!socket?.connected) return;
    const prevRoom = currentRoomRef.current;
    if (prevRoom && prevRoom !== selectedGroupId) socket.emit("group:leave", prevRoom);
    if (selectedGroupId) { socket.emit("group:join", selectedGroupId); currentRoomRef.current = selectedGroupId; }
    else currentRoomRef.current = null;
  }, [selectedGroupId]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/groups", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {} finally { setLoadingGroups(false); }
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const fetchMessages = useCallback(async (groupId: string) => {
    setLoadingMessages(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMessages(data.messages || []);
      setGroupInfo(data.group ? { name: data.group.name, role: data.myRole } : null);
      setMembers(data.members || []);
      // Store my username for typing indicator
      const myMember = (data.members || []).find((m: any) => m.userId === user?.id);
      if (myMember) myGroupUsernameRef.current = myMember.username;
    } catch {} finally { setLoadingMessages(false); }
  }, [user]);

  useEffect(() => { if (selectedGroupId) fetchMessages(selectedGroupId); }, [selectedGroupId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); }, [messages]);

  // Group typing input handler
  const handleGroupInput = (val: string) => {
    setInput(val);
    if (!selectedGroupId || !myGroupUsernameRef.current) return;
    const socket = getSocket("");
    if (!socket?.connected) return;

    socket.emit("group:typing", { groupId: selectedGroupId, username: myGroupUsernameRef.current });

    const existing = groupTypingTimeoutRef.current.get(selectedGroupId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      socket.emit("group:stop-typing", { groupId: selectedGroupId, username: myGroupUsernameRef.current });
      groupTypingTimeoutRef.current.delete(selectedGroupId);
    }, 2000);
    groupTypingTimeoutRef.current.set(selectedGroupId, timeout);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedGroupId || sending) return;
    const content = input.trim(); setInput(""); setSending(true); setSendError(null);

    // Stop typing
    const socket = getSocket("");
    if (socket?.connected && myGroupUsernameRef.current) {
      socket.emit("group:stop-typing", { groupId: selectedGroupId, username: myGroupUsernameRef.current });
      const existing = groupTypingTimeoutRef.current.get(selectedGroupId);
      if (existing) clearTimeout(existing);
      groupTypingTimeoutRef.current.delete(selectedGroupId);
    }
    const tempId = "temp-" + Date.now();
    const tempMsg: GroupMessage = {
      id: tempId, content, senderId: user?.id || "", senderUsername: "You",
      senderNickname: null, isMine: true, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const socket = getSocket("");
      if (!socket?.connected) throw new Error("Not connected");
      socket.emit("group:send", { groupId: selectedGroupId, content },
        (ack: { ok: boolean; message?: GroupMessage; error?: string }) => {
          if (ack.ok && ack.message) setMessages((prev) => prev.map((m) => (m.id === tempId ? ack.message! : m)));
          else { setMessages((prev) => prev.filter((m) => m.id !== tempId)); setInput(content); setSendError(ack.error || "Send failed"); }
          setSending(false);
        }
      );
    } catch (err: any) { setMessages((prev) => prev.filter((m) => m.id !== tempId)); setInput(content); setSendError(err.message || "Failed"); setSending(false); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const token = await getToken(); if (!token) return;
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups((prev) => [{ ...data.group, lastMessage: null, lastMessageAt: data.group.created_at }, ...prev]);
      setShowCreateGroup(false); setNewGroupName(""); setSelectedGroupId(data.group.id);
    } catch (e: any) { alert(e.message || "Failed"); } finally { setCreatingGroup(false); }
  };

  const handleAddMember = async () => {
    if (!addMemberUsername.trim() || !selectedGroupId || addingMember) return;
    const targetUsername = addMemberUsername.trim().toUpperCase();
    setAddingMember(true); setAddMemberMsg(null);
    try {
      const token = await getToken(); if (!token) return;
      const res = await fetch(`/api/groups/${selectedGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: targetUsername }),
      });
      const data = await res.json();
      if (!res.ok) { setAddMemberMsg(data.error || "Failed"); return; }
      setAddMemberUsername("");
      setAddMemberMsg(`${targetUsername} added!`);
      fetchMessages(selectedGroupId);
      setTimeout(() => setAddMemberMsg(null), 3000);
    } catch (e: any) { setAddMemberMsg(e.message || "Failed"); } finally { setAddingMember(false); }
  };

  const handleLeave = async () => {
    if (!selectedGroupId || !confirm("Leave this group?")) return;
    try {
      const token = await getToken(); if (!token) return;
      const res = await fetch(`/api/groups/${selectedGroupId}/members`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const socket = getSocket(""); if (socket?.connected) socket.emit("group:leave", selectedGroupId);
        currentRoomRef.current = null;
        setGroups((prev) => prev.filter((g) => g.id !== selectedGroupId));
        setSelectedGroupId(null); setGroupInfo(null);
      }
    } catch { alert("Failed"); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0f] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/25">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </div>
      <h2 className="text-lg font-semibold text-white mb-1.5">Groups</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">Login to create and chat in groups</p>
      <button onClick={signInWithGoogle} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Sign in with Google
      </button>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#0a0a0f] text-white overflow-hidden">
      {/* Left Panel — Group List */}
      <div className={`${selectedGroupId ? "hidden md:flex" : "flex"} w-full md:w-[340px] flex-col border-r border-white/[0.04] bg-[#0d0d14] shrink-0`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/chat")} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Groups</h1>
              <p className="text-[10px] text-gray-600">{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/20" title="Create Group">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateGroup && (
          <div className="px-4 py-3 border-b border-white/[0.04] bg-white/[0.01]">
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              placeholder="Enter group name..." maxLength={50} autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/30 mb-2.5 transition-all" />
            <div className="flex gap-2">
              <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || creatingGroup}
                className="flex-1 px-3 py-2 text-[12px] font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 transition-all shadow-md shadow-violet-600/20">
                {creatingGroup ? "Creating..." : "Create Group"}
              </button>
              <button onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }}
                className="px-4 py-2 text-[12px] text-gray-400 bg-white/[0.04] rounded-xl hover:bg-white/[0.06] transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Group List */}
        <div className="flex-1 overflow-y-auto">
          {loadingGroups ? (
            <div className="flex justify-center py-12">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
              </div>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <p className="text-gray-400 text-xs font-medium mb-1">No groups yet</p>
              <p className="text-gray-600 text-[10px]">Tap <span className="text-violet-400">+</span> to create one</p>
            </div>
          ) : (
            groups.map(g => {
              const isActive = selectedGroupId === g.id;
              return (
                <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all group relative ${isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}>
                  {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-violet-500 to-indigo-500" />}
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${groupGradient(g.name)} flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 shadow-md`}>
                    {g.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[13px] font-medium truncate ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"} transition-colors`}>{g.name}</span>
                      {g.role === "owner" && <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/10 font-medium shrink-0">Owner</span>}
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">
                      {g.lastMessage || `${g.memberCount} member${g.memberCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Messages */}
      <div className={`${selectedGroupId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-[#0a0a0f]`}>
        {selectedGroupId && groupInfo ? (
          <>
            {/* Group Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.04] shrink-0 bg-[#0d0d14]/80 backdrop-blur-xl">
              <button onClick={() => setSelectedGroupId(null)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${groupGradient(groupInfo.name)} flex items-center justify-center text-white text-[11px] font-bold shadow-md shrink-0`}>
                {groupInfo.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">{groupInfo.name}</p>
                {typingUsers.size > 0 ? (
                  <p className="text-[10px] text-emerald-400 animate-pulse">
                    {[...typingUsers.values()].join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-600">{members.length} member{members.length !== 1 ? "s" : ""}</p>
                )}
              </div>
              {groupInfo.role === "owner" && (
                <button onClick={() => setShowAddMember(!showAddMember)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-gray-500 hover:text-violet-400 hover:bg-white/[0.06] hover:border-violet-500/20 transition-all" title="Add member">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
              <button onClick={handleLeave}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all" title="Leave group">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>

            {/* Add Member Form */}
            {showAddMember && groupInfo.role === "owner" && (
              <div className="px-4 py-3 border-b border-white/[0.04] bg-[#0d0d14]/60 shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-gray-500 shrink-0">Add:</p>
                  <input type="text" value={addMemberUsername} onChange={(e) => setAddMemberUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    placeholder="CSH_XXXXXX" maxLength={20} autoFocus
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[12px] text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/30 min-w-0 transition-all" />
                  <button onClick={handleAddMember} disabled={!addMemberUsername.trim() || addingMember}
                    className="px-4 py-1.5 text-[11px] font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 shrink-0 transition-all shadow-md shadow-violet-600/20">
                    {addingMember ? "..." : "Add"}
                  </button>
                  <button onClick={() => { setShowAddMember(false); setAddMemberUsername(""); setAddMemberMsg(null); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/[0.06] shrink-0 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {addMemberMsg && (
                  <p className={`text-[11px] mt-1.5 ml-1 ${addMemberMsg.includes("added") ? "text-emerald-400" : "text-red-400"}`}>{addMemberMsg}</p>
                )}
              </div>
            )}

            {/* Members Bar */}
            <div className="px-4 py-2.5 border-b border-white/[0.04] flex gap-2 overflow-x-auto shrink-0">
              {members.map(m => (
                <div key={m.userId} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.04] rounded-full">
                  <span className={`text-[11px] font-medium ${usernameColor(m.username)}`}>
                    {m.nickname || m.username}
                  </span>
                  {m.role === "owner" && <span className="text-[9px] text-amber-400">★</span>}
                </div>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${groupGradient(groupInfo.name)} flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg`}>
                    {groupInfo.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Start the conversation!</p>
                  <p className="text-gray-700 text-[11px] mt-1">Send the first message to {groupInfo.name}</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"} animate-[fadeUp_0.2s_ease-out]`}>
                    <div className={`max-w-[75%] px-4 py-2.5 ${
                      msg.isMine
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-violet-500/10"
                        : "bg-white/[0.06] text-gray-200 rounded-2xl rounded-bl-md border border-white/[0.04]"
                    }`}>
                      {!msg.isMine && (
                        <p className={`text-[11px] font-semibold mb-0.5 ${usernameColor(msg.senderUsername)}`}>
                          {msg.senderNickname || msg.senderUsername}
                        </p>
                      )}
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[9px] mt-1 ${msg.isMine ? "text-violet-300/70" : "text-gray-600"}`}>{shortTime(msg.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
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

            {/* Input */}
            <div className="px-4 pb-4 pt-1 shrink-0">
              <div className="relative flex items-center bg-[#141420] border border-white/[0.08] rounded-2xl px-3 py-2.5 focus-within:border-violet-500/30 focus-within:shadow-lg focus-within:shadow-violet-500/5 transition-all">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-violet-400 hover:bg-white/[0.04] transition-all disabled:opacity-40 mr-1 flex-shrink-0"
                  title="Emoji">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                {showEmojiPicker && <EmojiPicker onSelect={(emoji) => setInput((prev) => prev + emoji)} onClose={() => setShowEmojiPicker(false)} />}
                <input type="text" value={input} onChange={(e) => handleGroupInput(e.target.value)}
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/10 flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-300 mb-1">Groups</h2>
            <p className="text-gray-600 text-[12px] max-w-[200px]">Create or select a group to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
