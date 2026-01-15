import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { expandTheme } from '@/lib/theme';
import { Post } from '@/lib/types';

function calculateViralityScore(post: Post): number {
  const upvotes = post.metrics?.upvotes || 0;
  const comments = post.metrics?.comments || 0;
  const total = upvotes + comments * 2;
  
  if (total > 10000) return Math.min(95, 70 + Math.log10(total) * 5);
  if (total > 1000) return Math.min(70, 50 + Math.log10(total) * 5);
  if (total > 100) return Math.min(50, 30 + Math.log10(total) * 5);
  return Math.min(30, 10 + Math.log10(total + 1) * 5);
}

async function fetchRedditPosts(query: string): Promise<Post[]> {
  const posts: Post[] = [];
  
  try {
    const url = `https://old.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=month&limit=25`;
    
    console.log('[Reddit] Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
      },
    });

    console.log('[Reddit] Response status:', response.status);

    if (!response.ok) {
      console.error('[Reddit] Failed:', response.status);
      return posts;
    }

    const data = await response.json();
    const children = data?.data?.children || [];
    
    console.log('[Reddit] Found children:', children.length);

    for (const child of children) {
      const post = child.data;
      if ((post.ups || 0) < 5) continue;

      posts.push({
        platform: 'reddit',
        url: `https://reddit.com${post.permalink}`,
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
  } catch (error) {
    console.error('[Reddit] Error:', error);
  }

  return posts;
}

export async function POST(request: NextRequest) {
  try {
    const { theme, linkedinUrl } = await request.json();
    console.log('[API] Theme:', theme);

    if (!theme) {
      return NextResponse.json({ error: 'Theme is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && linkedinUrl) {
      await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, linkedin_url: linkedinUrl });
    }

    const expansion = expandTheme(theme);
    
    let allPosts: Post[] = [];
    const queries = [theme, `${theme} 2024`, `${theme} tips`];
    
    for (const query of queries) {
      console.log('[API] Trying query:', query);
      const posts = await fetchRedditPosts(query);
      console.log('[API] Got posts:', posts.length);
      allPosts = [...allPosts, ...posts];
      
      if (allPosts.length >= 10) break;
    }

    // Remove duplicates
    const seenUrls = new Set<string>();
    allPosts = allPosts.filter(post => {
      if (seenUrls.has(post.url)) return false;
      seenUrls.add(post.url);
      return true;
    });

    console.log('[API] Total unique posts:', allPosts.length);

    if (allPosts.length === 0) {
      if (user) {
        await supabase.from('run_attempts').insert({
          user_id: user.id,
          theme,
          status: 'failure',
        });
      }

      return NextResponse.json({
        error: 'Unable to find content for this theme. Try a different topic.'
      }, { status: 404 });
    }

    const scoredPosts = allPosts.map(post => ({
      ...post,
      virality_score: calculateViralityScore(post),
    }));

    // Simple clustering by theme
    const clusters = [{
      name: `${theme} Insights`,
      avg_virality: Math.round(scoredPosts.reduce((a, p) => a + p.virality_score, 0) / scoredPosts.length),
      top_platform: 'reddit',
      active_platforms: ['reddit'],
      posts: scoredPosts.slice(0, 10),
    }];

    if (user) {
      await supabase.from('run_attempts').insert({
        user_id: user.id,
        theme,
        status: 'success',
      });
    }

    return NextResponse.json({ clusters, theme: expansion });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
