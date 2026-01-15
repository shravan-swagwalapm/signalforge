import { Post, ConnectorResult } from '@/lib/types';
import { createConnectorResult, logConnector, delay } from './base';

const MAX_POSTS = parseInt(process.env.MAX_POSTS_PER_PLATFORM || '10');

export async function fetchReddit(queries: string[]): Promise<ConnectorResult> {
  logConnector('reddit', 'api', 'start');
  
  try {
    const posts = await fetchViaAPI(queries);
    
    if (posts.length > 0) {
      logConnector('reddit', 'api', 'success', `${posts.length} posts`);
      return createConnectorResult('reddit', posts, 'api');
    }
    
    logConnector('reddit', 'api', 'error', 'No posts returned');
  } catch (error) {
    logConnector('reddit', 'api', 'error', (error as Error).message);
  }
  
  return createConnectorResult('reddit', [], 'api', 'Reddit API failed');
}

async function fetchViaAPI(queries: string[]): Promise<Post[]> {
  const posts: Post[] = [];
  const seenUrls = new Set<string>();
  
  for (const query of queries.slice(0, 3)) {
    if (posts.length >= MAX_POSTS) break;
    
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=month&limit=10`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Reddit API error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      const children = data?.data?.children || [];
      
      for (const child of children) {
        if (posts.length >= MAX_POSTS) break;
        
        const post = child.data;
        const postUrl = `https://reddit.com${post.permalink}`;
        
        if (seenUrls.has(postUrl)) continue;
        seenUrls.add(postUrl);
        
        if ((post.ups || 0) < 5) continue;
        
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
      
      await delay(500);
    } catch (err) {
      console.error(`Reddit search failed for "${query}":`, err);
    }
  }
  
  return posts;
}
