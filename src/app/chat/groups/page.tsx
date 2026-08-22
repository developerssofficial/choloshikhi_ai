"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import EmojiPicker from "@/components/EmojiPicker";

/* ===================================================================
   Group Chat Page — Private groups, owner-only invite, roles
   Single Supabase client via ref (no memory leak), proper Realtime cleanup
   =================================================================== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["text-violet-400", "text-sky-400", "text-emerald-400", "text-amber-400", "text-rose-400", "text-cyan-400", "text-pink-400", "text-teal-400"];
  return colors[Math.abs(hash) % colors.length];
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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Single Supabase client via REF (not state!) — prevents memory leak
  const sbRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedGroupRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => { selectedGroupRef.current = selectedGroupId; }, [selectedGroupId]);

  // Create Supabase client for Realtime — ONCE per login
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    getToken().then(token => {
      if (cancelled || !token) return;
      if (!sbRef.current) {
        sbRef.current = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
      }
    });
    return () => { cancelled = true; };
  }, [user, loading]); // NO getToken in deps

  // Fetch groups — stable callback, NO getToken in deps
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/groups", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (e) {
      console.error("Failed to fetch groups:", e);
    } finally {
      setLoadingGroups(false);
    }
  }, [user]); // NO getToken

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Fetch messages — stable, NO getToken in deps
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
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  }, []); // NO getToken

  useEffect(() => {
    if (selectedGroupId) fetchMessages(selectedGroupId);
  }, [selectedGroupId]); // NO fetchMessages in deps (stable)

  // Realtime subscription — uses sbRef, NO user object in deps
  useEffect(() => {
    if (!sbRef.current || !selectedGroupId) return;

    let cancelled = false;
    const channel = sbRef.current
      .channel(`group-msgs-${selectedGroupId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${selectedGroupId}` },
        (payload: any) => {
          if (cancelled) return;
          const newMsg = payload.new;
          const myId = user?.id;
          sbRef.current?.from("student_profiles").select("username, nickname, display_name").eq("user_id", newMsg.sender_id).single()
            .then(({ data: prof }) => {
              if (cancelled) return;
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  content: newMsg.content,
                  senderId: newMsg.sender_id,
                  senderUsername: prof?.username || "Unknown",
                  senderNickname: prof?.nickname || prof?.display_name || null,
                  isMine: newMsg.sender_id === myId,
                  createdAt: newMsg.created_at,
                }];
              });
            });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { cancelled = true; channel.unsubscribe(); channelRef.current = null; };
  }, [selectedGroupId]); // NO sbClient, NO user

  // Scroll to bottom — SINGLE effect, instant
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !selectedGroupId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setSendError(null);

    // Optimistic add
    const tempId = "temp-" + Date.now();
    const tempMsg: GroupMessage = {
      id: tempId, content, senderId: user?.id || "", senderUsername: "You",
      senderNickname: null, isMine: true, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not logged in");
      const res = await fetch(`/api/groups/${selectedGroupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      let data: any;
      try { data = await res.json(); } catch { data = { error: "Server error" }; }
      if (!res.ok) throw new Error(data.error || "Send failed");

      setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(content);
      setSendError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(prev => [{ ...data.group, lastMessage: null, lastMessageAt: data.group.created_at }, ...prev]);
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedGroupId(data.group.id);
    } catch (e: any) {
      alert(e.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Add member
  const handleAddMember = async () => {
    if (!addMemberUsername.trim() || !selectedGroupId || addingMember) return;
    setAddingMember(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/groups/${selectedGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: addMemberUsername.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddMemberUsername("");
      setShowAddMember(false);
      fetchMessages(selectedGroupId);
    } catch (e: any) {
      alert(e.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  // Leave group
  const handleLeave = async () => {
    if (!selectedGroupId || !confirm("Leave this group?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/groups/${selectedGroupId}/members`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== selectedGroupId));
        setSelectedGroupId(null);
        setGroupInfo(null);
      }
    } catch {
      alert("Failed to leave group");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f0f14]">
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
      <div className="h-screen flex flex-col items-center justify-center bg-[#0f0f14] text-center px-4">
        <p className="text-gray-400 mb-3">Login required for groups</p>
        <button onClick={signInWithGoogle} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm hover:bg-violet-500">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#0f0f14] text-white">
      {/* Left Panel — Group List */}
      <div className={`${selectedGroupId ? "hidden md:flex" : "flex"} w-full md:w-80 flex-col border-r border-white/[0.06] shrink-0`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <button onClick={() => router.push("/chat")} className="text-gray-500 hover:text-gray-300 mr-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-sm font-medium text-gray-300 flex-1">Groups</h2>
          <button onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors" title="Create Group">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateGroup && (
          <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              placeholder="Group name..." maxLength={50}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/30 mb-2" />
            <div className="flex gap-2">
              <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || creatingGroup}
                className="flex-1 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-500 disabled:opacity-40 transition-colors">
                {creatingGroup ? "Creating..." : "Create"}
              </button>
              <button onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }}
                className="px-3 py-1.5 bg-white/[0.06] text-gray-400 text-xs rounded-lg hover:bg-white/[0.1] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Group List */}
        <div className="flex-1 overflow-y-auto">
          {loadingGroups ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
              </div>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-500 text-sm">No groups yet</p>
              <p className="text-gray-600 text-[11px] mt-1">Create a group to start chatting</p>
            </div>
          ) : (
            groups.map(g => (
              <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                className={`w-full px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] ${
                  selectedGroupId === g.id ? "bg-white/[0.06]" : ""
                }`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-200 truncate">{g.name}</p>
                      {g.role === "owner" && <span className="text-[9px] px-1.5 py-0.5 bg-violet-600/20 text-violet-300 rounded-full">Owner</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {g.lastMessage || `${g.memberCount} member${g.memberCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Messages */}
      <div className={`${selectedGroupId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
        {selectedGroupId && groupInfo ? (
          <>
            {/* Group Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
              <button onClick={() => setSelectedGroupId(null)} className="md:hidden text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 truncate">{groupInfo.name}</p>
                <p className="text-[10px] text-gray-500">{members.length} member{members.length !== 1 ? "s" : ""}</p>
              </div>
              {groupInfo.role === "owner" && (
                <button onClick={() => setShowAddMember(!showAddMember)}
                  className="text-gray-500 hover:text-violet-400 transition-colors" title="Add member">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </button>
              )}
              <button onClick={handleLeave}
                className="text-gray-500 hover:text-red-400 transition-colors" title="Leave group">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>

            {/* Add Member Form */}
            {showAddMember && groupInfo.role === "owner" && (
              <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex gap-2">
                <input type="text" value={addMemberUsername} onChange={(e) => setAddMemberUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  placeholder="CSH_ username..." maxLength={20}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/30" />
                <button onClick={handleAddMember} disabled={!addMemberUsername.trim() || addingMember}
                  className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-500 disabled:opacity-40 transition-colors">
                  {addingMember ? "..." : "Add"}
                </button>
              </div>
            )}

            {/* Members Bar */}
            <div className="px-4 py-2 border-b border-white/[0.04] flex gap-2 overflow-x-auto shrink-0">
              {members.map(m => (
                <div key={m.userId} className="shrink-0 flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded-full">
                  <span className={`text-[10px] ${usernameColor(m.username)}`}>
                    {m.nickname || m.username}
                  </span>
                  {m.role === "owner" && <span className="text-[8px] text-violet-400">★</span>}
                </div>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No messages yet</p>
                  <p className="text-gray-600 text-[11px] mt-1">Send the first message!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                      msg.isMine
                        ? "bg-violet-600 text-white rounded-br-md"
                        : "bg-white/[0.06] text-gray-300 rounded-bl-md"
                    }`}>
                      {!msg.isMine && (
                        <p className={`text-[10px] font-medium mb-0.5 ${usernameColor(msg.senderUsername)}`}>
                          {msg.senderNickname || msg.senderUsername}
                        </p>
                      )}
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[9px] mt-0.5 ${msg.isMine ? "text-violet-300" : "text-gray-600"}`}>
                        {shortTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {sendError && (
              <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-xs text-red-400">
                {sendError}
                <button onClick={() => setSendError(null)} className="text-red-500 hover:text-red-400 ml-2">✕</button>
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              <div className="relative flex items-center bg-[#1a1a24] border border-white/[0.08] rounded-2xl px-3 py-2 focus-within:border-violet-500/30 transition-all">
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
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..." disabled={sending} maxLength={2000}
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none disabled:opacity-40" />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className="ml-2 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-gray-400 text-sm mb-1">Groups</p>
            <p className="text-gray-600 text-[11px]">Create or select a group to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
