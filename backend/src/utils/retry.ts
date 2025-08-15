interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  lastAttempt: number;
}

export class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 10000,
      backoffMultiplier: config.backoffMultiplier || 2,
    };
  }

  /**
   * Execute a function with retry logic
   * @param fn - Function to execute
   * @returns Promise with retry result
   */
  async execute<T>(
    fn: () => Promise<T>
  ): Promise<RetryResult<T>> {
    let lastError: Error;
    let delay = this.config.baseDelay;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        return {
          success: true,
          data: result,
          attempts: attempt,
          lastAttempt: Date.now(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain error types
        if (this.shouldNotRetry(lastError)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            lastAttempt: Date.now(),
          };
        }

        // If this was the last attempt, return the error
        if (attempt === this.config.maxAttempts) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            lastAttempt: Date.now(),
          };
        }

        // Wait before retrying
        await this.sleep(delay);
        
        // Calculate next delay with exponential backoff
        delay = Math.min(
          delay * this.config.backoffMultiplier,
          this.config.maxDelay
        );
      }
    }

    // This should never happen, but just in case
    return {
      success: false,
      error: lastError!,
      attempts: this.config.maxAttempts,
      lastAttempt: Date.now(),
    };
  }

  /**
   * Check if an error should not trigger a retry
   * @param error - Error to check
   * @returns True if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    // Don't retry on client errors (4xx) except rate limiting
    if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
      return true;
    }
    
    // Don't retry on server errors (5xx) as they're likely persistent
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for a specified number of milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create a default retry handler instance
export const defaultRetryHandler = new RetryHandler({
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
});
