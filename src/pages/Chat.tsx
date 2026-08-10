import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WelcomeSection from "@/components/WelcomeSection";
import MessageComposer from "@/components/MessageComposer";
import PlanCard from "@/components/PlanCard";
import ThinkingCard from "@/components/ThinkingCard";
import ChatMessage from "@/components/ChatMessage";
import FollowUpSuggestions from "@/components/FollowUpSuggestions";
import MemorySystem from "@/services/MemorySystem";
import PromptCache from "@/services/PromptCache";
import { useAuth } from "@/contexts/AuthContext";
import { parsePlanResponse } from "@/utils/planParser";
import { parseThinkingResponse } from "@/utils/thinkingParser";
import type { PlanData, PlanPhase } from "@/types/plan";
import type { ThinkingData } from "@/types/thinking";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  planData?: PlanData;
  thinkingData?: ThinkingData;
}

type ModelTier = "low" | "medium" | "pro";
type SystemMode = "chat" | "thinking" | "plan";

const MODEL_TIERS: Record<ModelTier, { backendModel: "gemini" | "mimo" }> = {
  low: { backendModel: "gemini" },
  medium: { backendModel: "mimo" },
  pro: { backendModel: "gemini" },
};

interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ModelTier>("low");
  const [systemMode, setSystemMode] = useState<SystemMode>("chat");
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => Date.now().toString());
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Plan state
  const [activePlan, setActivePlan] = useState<PlanData | null>(null);
  const [planPhase, setPlanPhase] = useState<PlanPhase>("planning");
  const [executionProgress, setExecutionProgress] = useState(0);

  // Follow-up suggestions
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const memorySystem = MemorySystem.getInstance();
  const promptCache = PromptCache.getInstance();
  const { user, session } = useAuth();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chatHistory");
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    } catch {
      localStorage.removeItem("chatHistory");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildHistory = useCallback(() => {
    return messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/subscription/status", {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.plan === "pro") setIsPro(true);
      })
      .catch(() => {});
  }, [user]);

  const loadConversations = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } catch {}
  }, [session?.access_token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id, role: m.role, content: m.content,
          timestamp: new Date(m.created_at), model: m.model,
        })));
        setActiveConversationId(conversationId);
      }
    } catch {}
  }, [session?.access_token]);

  const createConversation = useCallback(async (title: string, model: string): Promise<string | null> => {
    if (!session?.access_token) return null;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ title, model }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => [data.conversation, ...prev]);
        return data.conversation.id;
      }
    } catch {}
    return null;
  }, [session?.access_token]);

  const sendMessageToApi = async (message: string, model: "gemini" | "mimo", convId?: string | null, mode?: string) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({ message, history: buildHistory(), model, conversationId: convId || undefined, mode }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Failed to get response.");
    return data;
  };

  // Plan-specific handlers
  const handleStartPlan = () => {
    setPlanPhase("executing");
    // Simulate execution progress
    if (activePlan) {
      const totalTasks = activePlan.phases.reduce((sum, p) => sum + p.tasks.length, 0);
      let completed = 0;
      const interval = setInterval(() => {
        completed++;
        setExecutionProgress(Math.round((completed / totalTasks) * 100));
        if (completed >= totalTasks) {
          clearInterval(interval);
          setPlanPhase("completed");
        }
      }, 2000);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    if (!activePlan) return;
    const updated = { ...activePlan };
    for (const phase of updated.phases) {
      for (const task of phase.tasks) {
        if (task.id === taskId) {
          task.status = task.status === "completed" ? "pending" : "completed";
          break;
        }
      }
    }
    setActivePlan(updated);
    // Recalculate progress
    const totalTasks = updated.phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const completedTasks = updated.phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "completed").length, 0);
    setExecutionProgress(Math.round((completedTasks / totalTasks) * 100));
  };

  const handlePlanEdit = () => {
    setInput("Edit this plan: ");
  };

  const handlePlanRegenerate = () => {
    if (activePlan) {
      setInput(`Regenerate a new plan for: ${activePlan.goal}`);
      setActivePlan(null);
      setPlanPhase("planning");
    }
  };

  const handleThinkingCreatePlan = useCallback(() => {
    // Find the last user message before the thinking response
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      setSystemMode("plan");
      setInput(`Create a plan for: ${lastUserMsg.content}`);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: trimmedInput, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setLastFailedMessage(null);
    setFollowUpSuggestions([]);

    memorySystem.addMemory(sessionId, { content: trimmedInput, type: "user" });

    let convId = activeConversationId;
    if (!convId && messages.length === 0) {
      const title = trimmedInput.slice(0, 50) + (trimmedInput.length > 50 ? "..." : "");
      convId = await createConversation(title, selectedTier);
      if (convId) setActiveConversationId(convId);
    }

    try {
      const backendModel = MODEL_TIERS[selectedTier].backendModel;

      // Pass mode to backend — system prompt is handled server-side now
      const cachedResponse = (systemMode === "chat") ? promptCache.get(trimmedInput, backendModel) : null;
      let response: string;
      let usedModel: string = backendModel;
      let fromCache = false;

      if (cachedResponse) {
        response = cachedResponse;
        fromCache = true;
      } else {
        const result = await sendMessageToApi(trimmedInput, backendModel, convId, systemMode);
        response = result.message;
        usedModel = result.model;
        fromCache = result.cached;
        if (systemMode === "chat") {
          promptCache.set(trimmedInput, response, usedModel);
        }
      }

      // Parse mode-specific responses
      let planData: PlanData | null = null;
      let thinkingData: ThinkingData | null = null;

      try {
        if (systemMode === "plan") {
          planData = parsePlanResponse(response);
        } else if (systemMode === "thinking") {
          thinkingData = parseThinkingResponse(response);
        }
      } catch (parseError) {
        console.warn("Failed to parse structured response, falling back to chat:", parseError);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: response, timestamp: new Date(), model: usedModel,
        planData: planData || undefined,
        thinkingData: thinkingData || undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (planData) {
        setActivePlan(planData);
        setPlanPhase("ready");
        setExecutionProgress(0);
      }

      memorySystem.addMemory(sessionId, { content: response, type: "assistant", metadata: { model: usedModel, cached: fromCache } });
      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLastFailedMessage(trimmedInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (!lastFailedMessage) return;
    setInput(lastFailedMessage);
    setLastFailedMessage(null);
    setError(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setLastFailedMessage(null);
    setActivePlan(null);
    setPlanPhase("planning");
    setExecutionProgress(0);
    setFollowUpSuggestions([]);
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
  };

  const handleRegenerate = useCallback(async () => {
    // Find the last assistant message and remove it, then resend
    const lastAssistantIdx = [...messages].reverse().findIndex(m => m.role === "assistant");
    if (lastAssistantIdx === -1) return;
    const lastUserIdx = messages.length - 1 - lastAssistantIdx - 1;
    if (lastUserIdx < 0) return;
    const userMsg = messages[lastUserIdx];

    // Remove the last assistant message
    setMessages(prev => prev.slice(0, prev.length - 1));
    setIsLoading(true);
    setError(null);
    setFollowUpSuggestions([]);

    try {
      const backendModel = MODEL_TIERS[selectedTier].backendModel;
      const result = await sendMessageToApi(userMsg.content, backendModel, activeConversationId, systemMode);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: result.message, timestamp: new Date(), model: result.model,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedTier, activeConversationId, systemMode]);

  const handleQuickActionFromMessage = useCallback((action: string) => {
    // Find the last user message for context and set input for manual send
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg && !isLoading) {
      setInput(`${action}: ${lastUserMsg.content}`);
    }
  }, [messages, isLoading]);

  const isDisabled = isLoading || !input.trim();

  return (
    <div className="flex h-screen bg-[#070711] text-white overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => loadConversationMessages(id)}
        onNewChat={handleNewChat}
        isPro={isPro}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          systemMode={systemMode}
          onSystemModeChange={setSystemMode}
          isPro={isPro}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />

        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start justify-between gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="break-words">{error}</p>
                {lastFailedMessage && (
                  <button onClick={handleRetry} className="text-xs underline mt-1 hover:text-red-300 transition-colors">Retry</button>
                )}
              </div>
              <button onClick={() => { setError(null); setLastFailedMessage(null); }} className="text-xs underline hover:text-red-300 flex-shrink-0">Dismiss</button>
            </div>
          )}

          {messages.length === 0 ? (
            <WelcomeSection onSendMessage={handleQuickAction} />
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
              {messages.map((message, idx) => {
                const isLastAssistant = message.role === "assistant" && idx === messages.length - 1;

                return (
                  <div key={message.id}>
                    {message.thinkingData ? (
                      <div className="flex justify-center message-enter">
                        <ThinkingCard data={message.thinkingData} onCreatePlan={handleThinkingCreatePlan} />
                      </div>
                    ) : message.planData ? (
                      <div className="flex justify-center message-enter">
                        <PlanCard
                          data={message.planData}
                          phase={planPhase}
                          executionProgress={executionProgress}
                          onStart={handleStartPlan}
                          onEdit={handlePlanEdit}
                          onRegenerate={handlePlanRegenerate}
                          onTaskToggle={handleTaskToggle}
                          onSendMessage={handleQuickAction}
                        />
                      </div>
                    ) : (
                      <ChatMessage
                        id={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.timestamp}
                        model={message.model}
                        isLast={isLastAssistant && !isLoading}
                        onRegenerate={isLastAssistant ? handleRegenerate : undefined}
                        onQuickAction={isLastAssistant ? handleQuickActionFromMessage : undefined}
                      />
                    )}

                    {/* Follow-up suggestions after last assistant message */}
                    {isLastAssistant && !isLoading && followUpSuggestions.length > 0 && (
                      <FollowUpSuggestions suggestions={followUpSuggestions} onSelect={handleQuickAction} />
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-3xl w-full">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold text-gray-300">Xparrow</span>
                      </div>
                      {systemMode === "thinking" ? (
                        <div className="bg-[#0c0c1a] border border-purple-500/20 rounded-2xl px-5 py-4 max-w-md">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            <span className="text-[12px] font-medium text-purple-300/80 tracking-wide uppercase">Xparrow Thinking</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 text-[11px]">✓</span>
                              <span className="text-[13px] text-gray-300">Understanding the question</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 text-[11px]">✓</span>
                              <span className="text-[13px] text-gray-300">Exploring possible approaches</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400 text-[11px] animate-spin">⟳</span>
                              <span className="text-[13px] text-gray-300">Evaluating the best approach</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 text-[11px]">○</span>
                              <span className="text-[13px] text-gray-500">Checking edge cases</span>
                            </div>
                          </div>
                          <p className="text-[12px] text-gray-500 mt-3">Preparing a verified answer...</p>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-[12px] text-gray-500 ml-1">Xparrow is thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <MessageComposer
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isDisabled={isDisabled}
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
            isPro={isPro}
            systemMode={systemMode}
          />
        </div>
      </div>
    </div>
  );
}
