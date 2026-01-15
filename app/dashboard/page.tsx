'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Post {
  platform: string;
  url: string;
  author?: string;
  title: string;
  text?: string;
  created_at?: string;
  metrics: {
    upvotes?: number;
    comments?: number;
  };
  virality_score: number;
}

interface Cluster {
  name: string;
  avg_virality: number;
  top_platform: string;
  active_platforms: string[];
  posts: Post[];
}

function calculateViralityScore(upvotes: number, comments: number): number {
  const total = upvotes + comments * 2;
  if (total > 10000) return Math.min(95, 70 + Math.log10(total) * 5);
  if (total > 1000) return Math.min(70, 50 + Math.log10(total) * 5);
  if (total > 100) return Math.min(50, 30 + Math.log10(total) * 5);
  return Math.min(30, 10 + Math.log10(total + 1) * 5);
}

async function fetchRedditFromBrowser(query: string): Promise<Post[]> {
  const posts: Post[] = [];
  
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=month&limit=25`;
    const response = await fetch(url);
    
    if (!response.ok) return posts;

    const data = await response.json();
    const children = data?.data?.children || [];

    for (const child of children) {
      const post = child.data;
      if ((post.ups || 0) < 10) continue;

      posts.push({
        platform: 'reddit',
        url: `https://reddit.com${post.permalink}`,
        author: post.author,
        title: post.title,
        text: post.selftext?.slice(0, 500) || '',
        created_at: new Date(post.created_utc * 1000).toISOString(),
        metrics: {
          upvotes: post.ups,
          comments: post.num_comments,
        },
        virality_score: calculateViralityScore(post.ups || 0, post.num_comments || 0),
      });
    }
  } catch (error) {
    console.error('Reddit error:', error);
  }

  return posts;
}

export default function DashboardPage() {
  const [theme, setTheme] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [user, setUser] = useState<any>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set([0]));
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        supabase
          .from('profiles')
          .select('linkedin_url')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.linkedin_url) {
              setLinkedinUrl(data.linkedin_url);
            }
          });
      }
    });
  }, [supabase, router]);

  const handleDiscover = async () => {
    if (!theme.trim()) return;

    setLoading(true);
    setError(null);
    setClusters([]);

    try {
      if (user && linkedinUrl) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, email: user.email, linkedin_url: linkedinUrl });
      }

      const queries = [theme, theme + ' 2024', theme + ' tips'];
      let allPosts: Post[] = [];

      for (const query of queries) {
        const posts = await fetchRedditFromBrowser(query);
        allPosts = [...allPosts, ...posts];
        if (allPosts.length >= 15) break;
      }

      const seenUrls = new Set<string>();
      allPosts = allPosts.filter(post => {
        if (seenUrls.has(post.url)) return false;
        seenUrls.add(post.url);
        return true;
      });

      allPosts.sort((a, b) => b.virality_score - a.virality_score);

      if (allPosts.length === 0) {
        setError('Unable to find content for this theme. Try a different topic.');
        if (user) {
          await supabase.from('run_attempts').insert({
            user_id: user.id,
            theme,
            status: 'failure',
          });
        }
      } else {
        const topPosts = allPosts.slice(0, 5);
        const avgVirality = Math.round(topPosts.reduce((a, p) => a + p.virality_score, 0) / topPosts.length);

        const newClusters: Cluster[] = [{
          name: 'Top ' + theme + ' Content',
          avg_virality: avgVirality,
          top_platform: 'reddit',
          active_platforms: ['reddit'],
          posts: topPosts,
        }];

        if (allPosts.length > 5) {
          const morePosts = allPosts.slice(5, 10);
          const moreAvg = Math.round(morePosts.reduce((a, p) => a + p.virality_score, 0) / morePosts.length);
          newClusters.push({
            name: 'More Discussions',
            avg_virality: moreAvg,
            top_platform: 'reddit',
            active_platforms: ['reddit'],
            posts: morePosts,
          });
        }

        setClusters(newClusters);
        setExpandedClusters(new Set([0]));

        if (user) {
          await supabase.from('run_attempts').insert({
            user_id: user.id,
            theme,
            status: 'success',
          });
        }
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setError('Discovery failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleCluster = (index: number) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedClusters(newExpanded);
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) return 'Posted in last 24 hours';
    if (diffHours < 72) return 'Posted in last 3 days';
    if (diffHours < 168) return 'Posted in last week';
    return 'Posted in last month';
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            SignalForge
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Discover Viral Content</h2>
          <p className="text-gray-400">Enter a theme to find trending posts across platforms</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Theme / Topic *</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., AI tools for PMs, startup mistakes, indie hacking..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Your LinkedIn URL (optional)</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">{error}</div>
          )}

          <button
            onClick={handleDiscover}
            disabled={loading || !theme.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Discovering...</span>
            ) : (
              <span>Discover Content →</span>
            )}
          </button>
        </div>

        {clusters.length > 0 && (
          <div className="space-y-6">
            <p className="text-gray-400">
              Found {clusters.reduce((a, c) => a + c.posts.length, 0)} posts in {clusters.length} clusters
            </p>

            {clusters.map((cluster, index) => (
              <div key={index} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleCluster(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50"
                >
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">{cluster.name}</h3>
                    <p className="text-sm text-gray-400">
                      Avg virality: {cluster.avg_virality}/100. Active on: {cluster.active_platforms.join(', ')}
                    </p>
                  </div>
                  <span className="text-gray-400">{cluster.posts.length} posts</span>
                </button>

                {expandedClusters.has(index) && (
                  <div className="px-6 pb-4 space-y-4">
                    {cluster.posts.map((post, postIndex) => (
                      <div key={postIndex} className="p-4 bg-gray-800/50 rounded-xl">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-medium rounded">
                                REDDIT
                              </span>
                              <span className="text-lg font-semibold text-white">{post.title}</span>
                            </div>
                            {post.text && (
                              <p className="text-gray-400 text-sm mb-2 line-clamp-2">{post.text}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>⬆️ {post.metrics.upvotes}</span>
                              <span>💬 {post.metrics.comments}</span>
                              <span>by {post.author}</span>
                            </div>
                            <p className="text-xs text-green-400 mt-2">{getTimeAgo(post.created_at)}</p>
                            
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-3 text-purple-400 hover:text-purple-300 text-sm"
                            >
                              View original →
                            </a>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-yellow-500">{post.virality_score}</div>
                            <div className="text-xs text-gray-500">Score</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
