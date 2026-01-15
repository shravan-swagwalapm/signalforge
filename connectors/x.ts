import { Post, ConnectorResult } from '@/lib/types';
import { createConnectorResult, logConnector, delay } from './base';

const MAX_POSTS = parseInt(process.env.MAX_POSTS_PER_PLATFORM || '10');
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

/**
 * X (Twitter) Connector
 * 
 * Primary: X API v2 (requires bearer token)
 * Fallback: Scraping (limited, often blocked)
 * 
 * Note: X scraping is notoriously difficult due to aggressive bot detection.
 * API is strongly recommended.
 */

export async function fetchX(queries: string[]): Promise<ConnectorResult> {
  // Try API if token available
  if (X_BEARER_TOKEN) {
    logConnector('x', 'api', 'start');
    
    try {
      const posts = await fetchViaAPI(queries);
      
      if (posts.length > 0) {
        logConnector('x', 'api', 'success', `${posts.length} posts`);
        return createConnectorResult('x', posts, 'api');
      }
      
      logConnector('x', 'api', 'error', 'No posts returned');
    } catch (error) {
      logConnector('x', 'api', 'error', (error as Error).message);
    }
  } else {
    logConnector('x', 'api', 'error', 'No bearer token configured');
  }
  
  // Fallback to scraping
  logConnector('x', 'scraping', 'start');
  
  try {
    const posts = await fetchViaScraping(queries);
    
    if (posts.length > 0) {
      logConnector('x', 'scraping', 'success', `${posts.length} posts`);
      return createConnectorResult('x', posts, 'scraping');
    }
    
    logConnector('x', 'scraping', 'error', 'No posts found');
  } catch (error) {
    logConnector('x', 'scraping', 'error', (error as Error).message);
  }
  
  // Both failed
  return createConnectorResult('x', [], 'api', 'Both API and scraping failed');
}

/**
 * Fetch via X API v2
 * Requires: X_BEARER_TOKEN environment variable
 */
async function fetchViaAPI(queries: string[]): Promise<Post[]> {
  if (!X_BEARER_TOKEN) {
    throw new Error('X_BEARER_TOKEN not configured');
  }
  
  const posts: Post[] = [];
  const seenIds = new Set<string>();
  
  for (const query of queries.slice(0, 3)) {
    if (posts.length >= MAX_POSTS) break;
    
    try {
      // X API v2 search endpoint
      const searchUrl = new URL('https://api.twitter.com/2/tweets/search/recent');
      searchUrl.searchParams.set('query', `${query} -is:retweet lang:en`);
      searchUrl.searchParams.set('max_results', '10');
      searchUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
      searchUrl.searchParams.set('expansions', 'author_id');
      searchUrl.searchParams.set('user.fields', 'username,public_metrics');
      
      const response = await fetch(searchUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`X API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const tweets = data.data || [];
      const users = data.includes?.users || [];
      
      // Create user map for lookups
      const userMap = new Map(users.map((u: { id: string; username: string; public_metrics?: { followers_count?: number } }) => [u.id, u]));
      
      for (const tweet of tweets) {
        if (posts.length >= MAX_POSTS) break;
        if (seenIds.has(tweet.id)) continue;
        seenIds.add(tweet.id);
        
        const author = userMap.get(tweet.author_id) as { username?: string; public_metrics?: { followers_count?: number } } | undefined;
        
        posts.push({
          platform: 'x',
          url: `https://x.com/i/status/${tweet.id}`,
          author: author?.username,
          author_followers: author?.public_metrics?.followers_count,
          title: tweet.text.slice(0, 100),
          text: tweet.text,
          created_at: tweet.created_at,
          metrics: {
            likes: tweet.public_metrics?.like_count || 0,
            reposts: tweet.public_metrics?.retweet_count || 0,
            comments: tweet.public_metrics?.reply_count || 0,
          },
        });
      }
      
      await delay(200);
    } catch (error) {
      console.error(`X API query failed for "${query}":`, error);
    }
  }
  
  return posts;
}

/**
 * Fallback: Scrape X
 * 
 * IMPORTANT: X (Twitter) is very aggressive with bot detection.
 * This scraper uses nitter instances as a workaround.
 * Nitter is an alternative Twitter frontend that's easier to scrape.
 * 
 * Note: Nitter instances may be unreliable or blocked.
 */
async function fetchViaScraping(queries: string[]): Promise<Post[]> {
  const posts: Post[] = [];
  const seenUrls = new Set<string>();
  
  // List of public nitter instances (may change/go offline)
  // ASSUMPTION: Using nitter as ethical scraping alternative
  const nitterInstances = [
    'nitter.privacydev.net',
    'nitter.poast.org',
  ];
  
  for (const query of queries.slice(0, 2)) {
    if (posts.length >= MAX_POSTS) break;
    
    for (const instance of nitterInstances) {
      if (posts.length >= MAX_POSTS) break;
      
      try {
        const searchUrl = `https://${instance}/search?f=tweets&q=${encodeURIComponent(query)}`;
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (!response.ok) continue;
        
        const html = await response.text();
        
        // Parse nitter HTML for tweets
        // ASSUMPTION: Basic regex extraction - production would use proper parser
        const tweetMatches = html.matchAll(
          /<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g
        );
        
        for (const match of tweetMatches) {
          if (posts.length >= MAX_POSTS) break;
          
          const [, content] = match;
          const text = content.replace(/<[^>]+>/g, '').trim();
          
          if (!text || seenUrls.has(text.slice(0, 50))) continue;
          seenUrls.add(text.slice(0, 50));
          
          posts.push({
            platform: 'x',
            url: `https://x.com/search?q=${encodeURIComponent(query)}`, // Generic search URL
            title: text.slice(0, 100),
            text: text,
            metrics: {
              // Metrics harder to extract from nitter
              likes: 0,
              reposts: 0,
              comments: 0,
            },
          });
        }
        
        // If we got posts from this instance, no need to try others
        if (posts.length > 0) break;
        
        await delay(500);
      } catch {
        // Try next instance
        continue;
      }
    }
  }
  
  return posts;
}
