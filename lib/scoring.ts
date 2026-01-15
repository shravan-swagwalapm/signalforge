import { Post, ScoredPost } from './types';

/**
 * SignalForge Virality Scoring Algorithm
 * 
 * Explainable, rule-based scoring (no black-box ML)
 * Score: 0-100
 * 
 * Factors:
 * 1. Engagement velocity (40%)
 * 2. Authority proxy (25%)  
 * 3. Recency (20%)
 * 4. Content quality signals (15%)
 */

interface ScoreBreakdown {
  engagement: number;      // 0-40
  authority: number;       // 0-25
  recency: number;         // 0-20
  quality: number;         // 0-15
  total: number;           // 0-100
  reasons: string[];
}

/**
 * Calculate virality score for a post
 */
export function scorePost(post: Post): ScoredPost {
  const breakdown = calculateBreakdown(post);
  
  return {
    ...post,
    score: breakdown.total,
    why: breakdown.reasons.slice(0, 3), // Top 3 reasons
  };
}

/**
 * Score and rank a list of posts
 */
export function scoreAndRankPosts(posts: Post[]): ScoredPost[] {
  return posts
    .map(scorePost)
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate detailed score breakdown
 */
function calculateBreakdown(post: Post): ScoreBreakdown {
  const reasons: string[] = [];
  
  // 1. Engagement Score (0-40)
  const engagement = calculateEngagementScore(post, reasons);
  
  // 2. Authority Score (0-25)
  const authority = calculateAuthorityScore(post, reasons);
  
  // 3. Recency Score (0-20)
  const recency = calculateRecencyScore(post, reasons);
  
  // 4. Quality Score (0-15)
  const quality = calculateQualityScore(post, reasons);
  
  const total = Math.min(100, Math.round(engagement + authority + recency + quality));
  
  return { engagement, authority, recency, quality, total, reasons };
}

/**
 * Engagement velocity - normalized across platforms
 */
function calculateEngagementScore(post: Post, reasons: string[]): number {
  const { metrics, platform } = post;
  
  let engagementRate = 0;
  let totalEngagement = 0;
  
  switch (platform) {
    case 'reddit':
      totalEngagement = (metrics.upvotes || 0) + (metrics.comments || 0) * 2;
      // Reddit: 100+ upvotes is good, 1000+ is viral
      engagementRate = Math.min(totalEngagement / 1000, 1);
      if (totalEngagement > 500) reasons.push(`High Reddit engagement: ${totalEngagement}+ interactions`);
      break;
      
    case 'x':
      totalEngagement = (metrics.likes || 0) + (metrics.reposts || 0) * 3 + (metrics.comments || 0) * 2;
      // X: 50+ likes is good, 500+ is viral
      engagementRate = Math.min(totalEngagement / 500, 1);
      if (metrics.reposts && metrics.reposts > 10) reasons.push(`${metrics.reposts} reposts = high shareability`);
      if (totalEngagement > 100) reasons.push(`Strong X engagement: ${totalEngagement}+ interactions`);
      break;
      
    case 'linkedin':
      totalEngagement = (metrics.likes || 0) + (metrics.comments || 0) * 5 + (metrics.shares || 0) * 3;
      // LinkedIn: 50+ reactions is good, 500+ is viral
      engagementRate = Math.min(totalEngagement / 500, 1);
      if (metrics.comments && metrics.comments > 20) reasons.push(`${metrics.comments} comments = high discussion value`);
      if (totalEngagement > 100) reasons.push(`LinkedIn viral signal: ${totalEngagement}+ interactions`);
      break;
  }
  
  return Math.round(engagementRate * 40);
}

/**
 * Authority proxy - follower count, verified status, etc.
 */
function calculateAuthorityScore(post: Post, reasons: string[]): number {
  const followers = post.author_followers || 0;
  
  // Logarithmic scale for follower impact
  // 1K followers = ~8 points, 10K = ~16 points, 100K = ~23 points
  let authorityScore = 0;
  
  if (followers > 0) {
    authorityScore = Math.min(25, Math.round(Math.log10(followers + 1) * 5));
    
    if (followers > 10000) {
      reasons.push(`Author has ${formatNumber(followers)} followers`);
    }
  }
  
  // Bonus for known author
  if (post.author && post.author.length > 0) {
    authorityScore = Math.min(25, authorityScore + 2);
  }
  
  return authorityScore;
}

/**
 * Recency decay - newer content scores higher
 */
function calculateRecencyScore(post: Post, reasons: string[]): number {
  if (!post.created_at) {
    return 10; // Default middle score if no date
  }
  
  const postDate = new Date(post.created_at);
  const now = new Date();
  const hoursAgo = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
  
  let recencyScore = 0;
  
  if (hoursAgo < 24) {
    recencyScore = 20;
    reasons.push('Posted in last 24 hours - high relevance');
  } else if (hoursAgo < 72) {
    recencyScore = 16;
    reasons.push('Posted in last 3 days');
  } else if (hoursAgo < 168) {
    recencyScore = 12;
  } else if (hoursAgo < 720) {
    recencyScore = 8;
  } else {
    recencyScore = 4;
  }
  
  return recencyScore;
}

/**
 * Content quality signals
 */
function calculateQualityScore(post: Post, reasons: string[]): number {
  let qualityScore = 0;
  
  const text = (post.text || post.title || '').toLowerCase();
  const wordCount = text.split(/\s+/).length;
  
  // Optimal length (not too short, not too long)
  if (wordCount >= 50 && wordCount <= 300) {
    qualityScore += 5;
  } else if (wordCount >= 20 && wordCount <= 500) {
    qualityScore += 3;
  }
  
  // Has a clear hook (question, number, "how to")
  if (text.includes('?') || /\d+/.test(text) || text.includes('how to')) {
    qualityScore += 4;
    if (text.includes('?')) reasons.push('Engaging question format');
    if (/\d+ (tips|ways|steps|things)/.test(text)) reasons.push('List-style content performs well');
  }
  
  // Emotional triggers (simplified)
  const emotionalWords = ['amazing', 'secret', 'mistake', 'never', 'always', 'best', 'worst', 'surprising'];
  if (emotionalWords.some(word => text.includes(word))) {
    qualityScore += 3;
  }
  
  // Has URL (often indicates value-add content)
  if (post.url && post.url.length > 0) {
    qualityScore += 3;
  }
  
  return Math.min(15, qualityScore);
}

/**
 * Format large numbers
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Generate overall insight for a cluster
 */
export function generateClusterInsight(posts: ScoredPost[]): string {
  if (posts.length === 0) return 'No posts found for this cluster.';
  
  const avgScore = Math.round(posts.reduce((sum, p) => sum + p.score, 0) / posts.length);
  const topPost = posts[0];
  const platforms = [...new Set(posts.map(p => p.platform))];
  
  return `Avg virality: ${avgScore}/100. Top performer on ${topPost.platform}. Active on: ${platforms.join(', ')}.`;
}
