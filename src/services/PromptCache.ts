// Prompt Caching System
interface CacheEntry {
  prompt: string;
  response: string;
  timestamp: Date;
  hitCount: number;
  model: string;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class PromptCache {
  private static instance: PromptCache;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = "prompt_cache";
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): PromptCache {
    if (!PromptCache.instance) {
      PromptCache.instance = new PromptCache();
    }
    return PromptCache.instance;
  }

  // Generate cache key from prompt and model
  private generateKey(prompt: string, model: string): string {
    // Normalize prompt: lowercase, remove extra spaces
    const normalized = prompt.toLowerCase().trim().replace(/\s+/g, " ");
    return `${model}:${normalized}`;
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const entries: [string, CacheEntry][] = Object.entries(data.cache).map(
          ([key, entry]: [string, any]) => [
            key,
            {
              prompt: entry.prompt,
              response: entry.response,
              timestamp: new Date(entry.timestamp),
              hitCount: entry.hitCount || 0,
              model: entry.model,
              ttl: entry.ttl,
            },
          ]
        );
        this.cache = new Map(entries);
        this.stats = data.stats || { hits: 0, misses: 0, size: 0, hitRate: 0 };
        
        // Clean expired entries
        this.cleanExpired();
        this.updateStats();
      }
    } catch (error) {
      console.error("Failed to load cache:", error);
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        cache: Object.fromEntries(this.cache),
        stats: this.stats,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save cache:", error);
    }
  }

  // Clean expired entries
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      // Ensure timestamp is a Date object
      const timestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      if (now - timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Update cache statistics
  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Get cached response
  get(prompt: string, model: string): string | null {
    const key = this.generateKey(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Check if expired
    const timestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
    if (Date.now() - timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update hit count and timestamp
    entry.hitCount++;
    entry.timestamp = new Date();
    this.stats.hits++;
    this.updateStats();
    this.saveToStorage();

    return entry.response;
  }

  // Set cache entry
  set(prompt: string, response: string, model: string, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateKey(prompt, model);

    // Check cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove least recently used entry
      let oldestKey = "";
      let oldestTime = Date.now();

      for (const [k, entry] of this.cache.entries()) {
        if (entry.timestamp.getTime() < oldestTime) {
          oldestTime = entry.timestamp.getTime();
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      prompt,
      response,
      timestamp: new Date(),
      hitCount: 0,
      model,
      ttl,
    });

    this.updateStats();
    this.saveToStorage();
  }

  // Check if prompt is cached
  has(prompt: string, model: string): boolean {
    const key = this.generateKey(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Get cache size
  getSize(): number {
    return this.cache.size;
  }

  // Get cache hit rate
  getHitRate(): number {
    return this.stats.hitRate;
  }

  // Warm up cache with common prompts
  warmUp(commonPrompts: Array<{ prompt: string; response: string; model: string }>): void {
    commonPrompts.forEach(({ prompt, response, model }) => {
      if (!this.has(prompt, model)) {
        this.set(prompt, response, model);
      }
    });
  }
}

export default PromptCache;
