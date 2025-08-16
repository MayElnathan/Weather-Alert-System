import NodeCache from 'node-cache';

export class SimpleCache<T> {
  private cache: NodeCache;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
    this.cache = new NodeCache({
      stdTTL: defaultTTL / 1000, // Convert to seconds for node-cache
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Don't clone objects for better performance
    });
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    return this.cache.get(key) || null;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const ttlSeconds = (ttl || this.defaultTTL) / 1000; // Convert to seconds
    this.cache.set(key, data, ttlSeconds);
  }

  /**
   * Check if a key exists and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a key from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.del(key);
  }

  /**
   * Clear all expired entries
   */
  cleanup(): void {
    // node-cache handles cleanup automatically, but we can flush expired keys
    this.cache.flushAll();
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.keys().length;
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
      size: this.cache.keys().length,
      defaultTTL: this.defaultTTL,
      keys: this.cache.keys(),
    };
  }
}

// Create a weather cache instance with 10 minute TTL
export const weatherCache = new SimpleCache<any>(10 * 60 * 1000);

// Clean up expired entries every 2 minutes
setInterval(() => {
  weatherCache.cleanup();
}, 2 * 60 * 1000);
