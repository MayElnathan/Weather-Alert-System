interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a key from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats(): {
    size: number;
    defaultTTL: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      defaultTTL: this.defaultTTL,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create a weather cache instance with 10 minute TTL
export const weatherCache = new SimpleCache<any>(10 * 60 * 1000);

// Clean up expired entries every 2 minutes
setInterval(() => {
  weatherCache.cleanup();
}, 2 * 60 * 1000);
