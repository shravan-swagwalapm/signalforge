'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { NarrativeCluster, RunAPIResponse, ScoredPost } from '@/lib/types';

export default function DashboardPage() {
  const [theme, setTheme] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NarrativeCluster[] | null>(null);
  const [remainingRuns, setRemainingRuns] = useState<number | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check auth status
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        // Load saved LinkedIn URL
        const { data: profile } = await supabase
          .from('profiles')
          .select('linkedin_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.linkedin_url) {
          setLinkedinUrl(profile.linkedin_url);
        }
      }
    };
    
    checkUser();
  }, [supabase, router]);

  const handleDiscover = async () => {
    if (!theme.trim()) {
      setError('Please enter a theme');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.trim(),
          linkedin_url: linkedinUrl.trim() || undefined,
        }),
      });

      const data: RunAPIResponse = await response.json();

      if (data.success) {
        setResults(data.clusters);
        setRemainingRuns(data.remaining_free_runs);
      } else {
        if (data.code === 'PAYWALL_REQUIRED') {
          setError('You have used all your free runs this month. Upgrade to continue!');
        } else {
          setError(data.message || 'Discovery failed. Please try again.');
        }
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px]" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          SignalForge
        </div>
        <div className="flex items-center gap-4">
          {remainingRuns !== null && (
            <div className="text-sm text-gray-400">
              {remainingRuns === Infinity ? '∞' : remainingRuns} runs left
            </div>
          )}
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Input Section */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Discover Viral Content</h1>
          <p className="text-gray-400 mb-8">Enter a theme to find trending posts across platforms</p>

          <div className="space-y-4">
            {/* Theme Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Theme / Topic *
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., AI tools for PMs, startup mistakes, indie hacking..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-white placeholder-gray-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
              />
            </div>

            {/* LinkedIn URL (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your LinkedIn URL <span className="text-gray-500">(optional - for personalized results)</span>
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-white placeholder-gray-500 transition-all"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Discover Button */}
            <button
              onClick={handleDiscover}
              disabled={loading || !theme.trim()}
              className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning platforms...
                </span>
              ) : (
                'Discover Content →'
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && results.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">
              Found {results.reduce((sum, c) => sum + c.posts.length, 0)} posts in {results.length} clusters
            </h2>

            {results.map((cluster, idx) => (
              <ClusterCard key={idx} cluster={cluster} />
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-gray-400">Try a different theme or broader topic</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: NarrativeCluster }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* Cluster Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="text-left">
          <h3 className="text-lg font-semibold">{cluster.name}</h3>
          <p className="text-sm text-gray-400">{cluster.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{cluster.posts.length} posts</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Posts */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {cluster.posts.map((post, idx) => (
            <PostCard key={idx} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: ScoredPost }) {
  const platformColors = {
    reddit: 'from-orange-500 to-red-500',
    x: 'from-gray-400 to-gray-600',
    linkedin: 'from-blue-500 to-blue-700',
  };

  const platformIcons = {
    reddit: '🟠',
    x: '𝕏',
    linkedin: '🔵',
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-cyan-400';
    if (score >= 60) return 'from-yellow-400 to-orange-400';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
      <div className="flex items-start gap-4">
        {/* Platform Badge */}
        <div className={`px-2 py-1 text-xs font-medium bg-gradient-to-r ${platformColors[post.platform]} rounded-md`}>
          {platformIcons[post.platform]} {post.platform.toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium mb-1 line-clamp-2">{post.title}</h4>
          {post.text && post.text !== post.title && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">{post.text}</p>
          )}
          
          {/* Metrics */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {post.metrics.upvotes !== undefined && post.metrics.upvotes > 0 && (
              <span>⬆️ {post.metrics.upvotes}</span>
            )}
            {post.metrics.likes !== undefined && post.metrics.likes > 0 && (
              <span>❤️ {post.metrics.likes}</span>
            )}
            {post.metrics.comments !== undefined && post.metrics.comments > 0 && (
              <span>💬 {post.metrics.comments}</span>
            )}
            {post.metrics.reposts !== undefined && post.metrics.reposts > 0 && (
              <span>🔄 {post.metrics.reposts}</span>
            )}
            {post.author && <span>by {post.author}</span>}
          </div>

          {/* Why bullets */}
          {post.why && post.why.length > 0 && (
            <div className="mt-3 space-y-1">
              {post.why.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="flex flex-col items-center">
          <div className={`text-2xl font-bold bg-gradient-to-r ${getScoreColor(post.score)} bg-clip-text text-transparent`}>
            {post.score}
          </div>
          <div className="text-xs text-gray-500">Score</div>
        </div>
      </div>

      {/* Link */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          View original →
        </a>
      </div>
    </div>
  );
}
