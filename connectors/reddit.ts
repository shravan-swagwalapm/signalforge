import { Post, ConnectorResult } from '@/lib/types';
import { createConnectorResult, logConnector, delay } from './base';

const MAX_POSTS = parseInt(process.env.MAX_POSTS_PER_PLATFORM || '10');

/**
 * Reddit Connector
 * 
 * Primary: Reddit JSON API (no auth required for public data)
 * Fallback: Scraping via old.reddit.com
 */

export async function fetchReddit(queries: string[]): Promise<ConnectorResult> {
  logConnector('reddit', 'api', 'start');
  
  // Try API first
  try {
    const posts = await fetchViaAPI(queries);
    
    if (posts.length > 0) {
      logConnector('reddit', 'api', 'success', `${posts.length} posts`);
      return createConnectorResult('reddit', posts, 'api');
    }
    
    logConnector('reddit', 'api', 'error', 'No posts returned, trying scraping');
  } catch (error) {
    logConnector('reddit', 'api', 'error', (error as Error).message);
  }
  
  // Fallback to scraping
  logConnector('reddit', 'scraping', 'start');
  
  try {
    const posts = await fetchViaScraping(queries);
    
    if (posts.length > 0) {
      logConnector('reddit', 'scraping', 'success', `${posts.length} posts`);
      return createConnectorResult('reddit', posts, 'scraping');
    }
    
    logConnector('reddit', 'scraping', 'error', 'No posts found');
  } catch (error) {
    logConnector('reddit', 'scraping', 'error', (error as Error).message);
  }
  
  // Both failed
  return createConnectorResult('reddit', [], 'api', 'Both API and scraping failed');
}

/**
 * Fetch via Reddit's JSON API
 * IMPROVED: Prioritizes direct search for the theme
 */
async function fetchViaAPI(queries: string[]): Promise<Post[]> {
  const posts: Post[] = [];
  const seenUrls = new Set<string>();
  
  // PRIORITY 1: Direct search for each query (most relevant)
  for (const query of queries.slice(0, 3)) {
    if (posts.length >= MAX_POSTS) break;
    
    try {
      // Search with relevance sorting and time filter for recent posts
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=month&limit=10`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SignalForge/1.0 (Content Discovery Tool)',
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const children = data?.data?.children || [];
      
      for (const child of children) {
        if (posts.length >= MAX_POSTS) break;
        
        const post = child.data;
        const postUrl = `https://reddit.com${post.permalink}`;
        
        // Skip if already seen
        if (seenUrls.has(postUrl)) continue;
        seenUrls.add(postUrl);
        
        // Skip posts with very low engagement
        if ((post.ups || 0) < 10) continue;
        
        posts.push({
          platform: 'reddit',
          url: postUrl,
          author: post.author,
          title: post.title,
          text: post.selftext?.slice(0, 500),
          created_at: new Date(post.created_utc * 1000).toISOString(),
          metrics: {
            upvotes: post.ups,
            comments: post.num_comments,
          },
        });
      }
      
      // Rate limit
      await delay(300);
    } catch (err) {
      console.error(`Reddit search failed for "${query}":`, err);
    }
  }
  
  // PRIORITY 2: Search with "hot" sorting if we need more posts
  if (posts.length < MAX_POSTS && queries.length > 0) {
    try {
      const query = queries[0];
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=hot&t=week&limit=10`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SignalForge/1.0 (Content Discovery Tool)',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const children = data?.data?.children || [];
        
        for (const child of children) {
          if (posts.length >= MAX_POSTS) break;
          
          const post = child.data;
          const postUrl = `https://reddit.com${post.permalink}`;
          
          if (seenUrls.has(postUrl)) continue;
          seenUrls.add(postUrl);
          
          if ((post.ups || 0) < 10) continue;
          
          posts.push({
            platform: 'reddit',
            url: postUrl,
            author: post.author,
            title: post.title,
            text: post.selftext?.slice(0, 500),
            created_at: new Date(post.created_utc * 1000).toISOString(),
            metrics: {
              upvotes: post.ups,
              comments: post.num_comments,
            },
          });
        }
      }
      
      await delay(300);
    } catch (err) {
      console.error('Reddit hot search failed:', err);
    }
  }
  
  return posts;
}

/**
 * Fallback: Scrape Reddit via old.reddit.com
 */
async function fetchViaScraping(queries: string[]): Promise<Post[]> {
  const posts: Post[] = [];
  const seenUrls = new Set<string>();
  
  for (const query of queries.slice(0, 2)) {
    if (posts.length >= MAX_POSTS) break;
    
    try {
      const url = `https://old.reddit.com/search?q=${encodeURIComponent(query)}&sort=relevance&t=month`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      
      // Simple regex extraction from old.reddit HTML
      const postMatches = html.matchAll(
        /<a[^>]*class="[^"]*search-title[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g
      );
      
      for (const match of postMatches) {
        if (posts.length >= MAX_POSTS) break;
        
        const [, href, title] = match;
        let postUrl = href;
        
        if (href.startsWith('/r/')) {
          postUrl = `https://reddit.com${href}`;
        }
        
        if (seenUrls.has(postUrl)) continue;
        seenUrls.add(postUrl);
        
        posts.push({
          platform: 'reddit',
          url: postUrl,
          title: decodeHTMLEntities(title),
          metrics: {
            upvotes: 0,
            comments: 0,
          },
        });
      }
      
      await delay(500);
    } catch {
      // Continue to next query
    }
  }
  
  return posts;
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  
  return text.replace(/&[^;]+;/g, match => entities[match] || match);
}
