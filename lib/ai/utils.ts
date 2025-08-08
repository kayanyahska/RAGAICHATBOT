/**
 * Utility functions for AI operations with retry logic and fallback handling
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Get vector dimensions for different embedding models
 */
export function getVectorDimensions(modelName?: string): number {
  // Default to environment variable if set
  const envDimension = process.env.VECTOR_DIMENSION;
  if (envDimension) {
    return Number.parseInt(envDimension, 10);
  }

  // Dynamic detection based on model name
  if (modelName?.includes('nomic-embed-text')) {
    return 768;
  }
  if (modelName?.includes('text-embedding-3-small')) {
    return 1536;
  }
  if (modelName?.includes('text-embedding-3-large')) {
    return 3072;
  }

  // Default fallback
  return 768;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Check if it's a rate limit error
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('rate limit') ||
          error.message.includes('too many requests'));

      if (isRateLimit) {
        console.warn(`Rate limit hit on attempt ${attempt + 1}, retrying...`);
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay,
      );

      console.log(
        `Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Retry failed after maximum attempts');
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('429') ||
    error.message.includes('rate limit') ||
    error.message.includes('too many requests') ||
    error.message.includes('quota exceeded')
  );
}

/**
 * Check if an error is an API key error
 */
export function isApiKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('401') ||
    error.message.includes('unauthorized') ||
    error.message.includes('invalid api key') ||
    error.message.includes('authentication failed')
  );
}

/**
 * Get appropriate error message for different error types
 */
export function getErrorMessage(error: unknown): string {
  if (isRateLimitError(error)) {
    return 'Rate limit exceeded. Please try again in a moment or use a different model.';
  }

  if (isApiKeyError(error)) {
    return 'API key error. Please check your configuration or use a different model.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
