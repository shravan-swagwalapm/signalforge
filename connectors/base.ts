import { Post, Platform, ConnectorResult } from '@/lib/types';

/**
 * Base connector interface
 * All platform connectors implement this pattern:
 * 1. Try API first
 * 2. Fall back to scraping if API fails
 * 3. Return empty array if both fail (don't throw)
 */
export interface Connector {
  platform: Platform;
  
  /**
   * Main fetch method - orchestrates API → scraping fallback
   */
  fetch(queries: string[]): Promise<ConnectorResult>;
  
  /**
   * Try to fetch via official API
   */
  fetchViaAPI(queries: string[]): Promise<Post[]>;
  
  /**
   * Fallback: fetch via scraping
   */
  fetchViaScraping(queries: string[]): Promise<Post[]>;
}

/**
 * Create a standardized connector result
 */
export function createConnectorResult(
  platform: Platform,
  posts: Post[],
  source: 'api' | 'scraping',
  error?: string
): ConnectorResult {
  return {
    platform,
    posts,
    source,
    error,
  };
}

/**
 * Logging helper for connectors
 */
export function logConnector(
  platform: Platform,
  method: 'api' | 'scraping',
  action: 'start' | 'success' | 'error',
  details?: string
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${platform.toUpperCase()}] [${method.toUpperCase()}]`;
  
  switch (action) {
    case 'start':
      console.log(`${prefix} Starting fetch...`);
      break;
    case 'success':
      console.log(`${prefix} ✓ Success: ${details}`);
      break;
    case 'error':
      console.error(`${prefix} ✗ Error: ${details}`);
      break;
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        const delayMs = baseDelay * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}
