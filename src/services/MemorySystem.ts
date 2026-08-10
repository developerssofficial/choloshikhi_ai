// Memory System for Conversation Context
// Stores up to 40 prompts (80 messages) of conversation context

interface MemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  type: "user" | "assistant" | "system";
  metadata?: Record<string, unknown>;
}

interface ConversationContext {
  messages: MemoryEntry[];
  summary: string;
  keyPoints: string[];
  lastUpdated: Date;
}

// Patterns that indicate sensitive data - should not be stored
const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z_-]{30,}/, // Gemini API keys
  /sk-[a-zA-Z0-9]{20,}/, // OpenAI/MIMO-style API keys
  /password\s*[:=]\s*\S+/i, // Password assignments
  /secret\s*[:=]\s*\S+/i, // Secret assignments
  /token\s*[:=]\s*\S+/i, // Token assignments
  /Bearer\s+[a-zA-Z0-9._-]{20,}/, // Bearer tokens
];

function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeContent(text: string): string {
  // Replace detected sensitive patterns with [REDACTED]
  let sanitized = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

class MemorySystem {
  private static instance: MemorySystem;
  private memories: Map<string, ConversationContext> = new Map();
  private readonly MAX_CONTEXT_LENGTH = 40; // Store 40 prompts (80 messages total)
  private readonly STORAGE_KEY = "chatbot_memory";

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): MemorySystem {
    if (!MemorySystem.instance) {
      MemorySystem.instance = new MemorySystem();
    }
    return MemorySystem.instance;
  }

  // Load memories from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const entries: [string, ConversationContext][] = Object.entries(data).map(
          ([key, context]: [string, any]) => [
            key,
            {
              messages: context.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
              summary: context.summary || "",
              keyPoints: context.keyPoints || [],
              lastUpdated: new Date(context.lastUpdated),
            },
          ]
        );
        this.memories = new Map(entries);
      }
    } catch {
      // Silently fail - memory is non-critical
    }
  }

  // Save memories to localStorage
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.memories);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silently fail - likely storage full
    }
  }

  // Add a new memory entry
  addMemory(sessionId: string, entry: Omit<MemoryEntry, "id" | "timestamp">): void {
    // Filter out sensitive data before storing
    if (containsSensitiveData(entry.content)) {
      entry = { ...entry, content: sanitizeContent(entry.content) };
    }

    if (!this.memories.has(sessionId)) {
      this.memories.set(sessionId, {
        messages: [],
        summary: "",
        keyPoints: [],
        lastUpdated: new Date(),
      });
    }

    const context = this.memories.get(sessionId)!;
    const newEntry: MemoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    context.messages.push(newEntry);
    context.lastUpdated = new Date();

    // Enforce message limit: MAX_CONTEXT_LENGTH prompts = MAX_CONTEXT_LENGTH * 2 messages
    const maxMessages = this.MAX_CONTEXT_LENGTH * 2;
    if (context.messages.length > maxMessages) {
      context.messages = context.messages.slice(-maxMessages);
    }

    // Extract key points and generate summary
    this.extractKeyPoints(sessionId);

    this.saveToStorage();
  }

  // Get conversation context for API calls
  getContext(sessionId: string): { messages: Array<{ role: string; content: string }>; summary: string } {
    const context = this.memories.get(sessionId);
    if (!context) {
      return { messages: [], summary: "" };
    }

    const maxMessages = this.MAX_CONTEXT_LENGTH * 2;
    const recentMessages = context.messages.slice(-maxMessages);

    const messages = recentMessages.map((entry) => ({
      role: entry.type === "user" ? "user" : "assistant",
      content: entry.content,
    }));

    return {
      messages,
      summary: context.summary,
    };
  }

  // Extract key points from conversation
  private extractKeyPoints(sessionId: string): void {
    const context = this.memories.get(sessionId);
    if (!context) return;

    const keyPoints: string[] = [];
    const recentMessages = context.messages.slice(-20);

    recentMessages.forEach((msg) => {
      if (msg.content.length > 20 && !containsSensitiveData(msg.content)) {
        const sentences = msg.content.split(/[.!?]+/);
        sentences.slice(0, 3).forEach((sentence) => {
          const trimmed = sentence.trim();
          if (trimmed.length > 5 && trimmed.length < 150) {
            keyPoints.push(trimmed);
          }
        });
      }
    });

    context.keyPoints = keyPoints.slice(0, 20);

    // Generate summary from recent messages (excluding sensitive data)
    if (context.messages.length > 0) {
      const lastMessages = context.messages.slice(-20);
      context.summary = lastMessages
        .map((msg) => {
          const content = containsSensitiveData(msg.content)
            ? "[sensitive content]"
            : msg.content.substring(0, 100);
          return `${msg.type}: ${content}`;
        })
        .join("\n");
    }
  }

  // Get summary for API context
  getSummary(sessionId: string): string {
    const context = this.memories.get(sessionId);
    if (!context || context.keyPoints.length === 0) {
      return "";
    }
    return `Previous conversation key points: ${context.keyPoints.join("; ")}`;
  }

  // Get memory statistics for a session
  getMemoryStats(sessionId: string): { messages: number; prompts: number; maxPrompts: number } {
    const context = this.memories.get(sessionId);
    if (!context) {
      return { messages: 0, prompts: 0, maxPrompts: this.MAX_CONTEXT_LENGTH };
    }

    return {
      messages: context.messages.length,
      prompts: Math.floor(context.messages.length / 2),
      maxPrompts: this.MAX_CONTEXT_LENGTH,
    };
  }

  // Clear memory for a session
  clearMemory(sessionId: string): void {
    this.memories.delete(sessionId);
    this.saveToStorage();
  }

  // Clear all memories
  clearAllMemories(): void {
    this.memories.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export default MemorySystem;
