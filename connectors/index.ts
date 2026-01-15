import { ConnectorResult, NarrativeCluster, Post } from '@/lib/types';
import { expandTheme, getPlatformQueries } from '@/lib/theme';
import { scoreAndRankPosts, generateClusterInsight } from '@/lib/scoring';
import { fetchReddit } from './reddit';
import { fetchX } from './x';
import { fetchLinkedIn } from './linkedin';

/**
 * Discovery Pipeline Orchestrator
 * 
 * 1. Expand theme into clusters
 * 2. Fetch from all platforms in parallel
 * 3. Score and rank posts
 * 4. Organize into narrative clusters
 */

export interface DiscoveryResult {
  success: boolean;
  clusters: NarrativeCluster[];
  total_posts: number;
  platform_results: ConnectorResult[];
  errors: string[];
}

export async function runDiscovery(theme: string): Promise<DiscoveryResult> {
  const errors: string[] = [];
  
  // Step 1: Expand theme into clusters
  const expansion = expandTheme(theme);
  
  // Step 2: Fetch from all platforms in parallel
  const platformResults = await Promise.all([
    fetchReddit(getPlatformQueries(theme, 'reddit')),
    fetchX(getPlatformQueries(theme, 'x')),
    fetchLinkedIn(getPlatformQueries(theme, 'linkedin')),
  ]);
  
  // Collect errors
  for (const result of platformResults) {
    if (result.error) {
      errors.push(`${result.platform}: ${result.error}`);
    }
  }
  
  // Combine all posts
  const allPosts: Post[] = platformResults.flatMap(r => r.posts);
  
  // Check if discovery succeeded (at least one post from any platform)
  if (allPosts.length === 0) {
    return {
      success: false,
      clusters: [],
      total_posts: 0,
      platform_results: platformResults,
      errors: ['All platforms failed to return results'],
    };
  }
  
  // Step 3: Score all posts
  const scoredPosts = scoreAndRankPosts(allPosts);
  
  // Step 4: Organize into narrative clusters
  const clusters = organizeIntoClusters(expansion, scoredPosts);
  
  return {
    success: true,
    clusters,
    total_posts: scoredPosts.length,
    platform_results: platformResults,
    errors,
  };
}

/**
 * Organize scored posts into narrative clusters
 */
function organizeIntoClusters(
  expansion: ReturnType<typeof expandTheme>,
  posts: ReturnType<typeof scoreAndRankPosts>
): NarrativeCluster[] {
  const clusters: NarrativeCluster[] = [];
  const usedPostIds = new Set<string>();
  
  for (const clusterDef of expansion.clusters) {
    // Find posts that match this cluster's keywords
    const matchingPosts = posts.filter(post => {
      // Don't reuse posts across clusters
      const postId = post.url;
      if (usedPostIds.has(postId)) return false;
      
      // Check if post content matches cluster keywords
      const content = `${post.title} ${post.text || ''}`.toLowerCase();
      const matchCount = clusterDef.keywords.filter(kw => 
        content.includes(kw.toLowerCase())
      ).length;
      
      return matchCount >= 1; // At least one keyword match
    });
    
    // Take top posts for this cluster
    const clusterPosts = matchingPosts.slice(0, 5);
    
    // Mark these posts as used
    clusterPosts.forEach(p => usedPostIds.add(p.url));
    
    if (clusterPosts.length > 0) {
      clusters.push({
        name: clusterDef.name,
        description: generateClusterInsight(clusterPosts),
        keywords: clusterDef.keywords,
        posts: clusterPosts,
      });
    }
  }
  
  // Add remaining high-scoring posts to a "Top Performers" cluster
  const remainingPosts = posts.filter(p => !usedPostIds.has(p.url)).slice(0, 5);
  
  if (remainingPosts.length > 0) {
    clusters.unshift({
      name: 'Top Performers',
      description: generateClusterInsight(remainingPosts),
      keywords: [],
      posts: remainingPosts,
    });
  }
  
  // Sort clusters by average post score
  clusters.sort((a, b) => {
    const avgA = a.posts.reduce((sum, p) => sum + p.score, 0) / a.posts.length;
    const avgB = b.posts.reduce((sum, p) => sum + p.score, 0) / b.posts.length;
    return avgB - avgA;
  });
  
  return clusters.slice(0, 5); // Return top 5 clusters
}

/**
 * Get platform stats for display
 */
export function getPlatformStats(results: ConnectorResult[]): Record<string, { count: number; source: string }> {
  const stats: Record<string, { count: number; source: string }> = {};
  
  for (const result of results) {
    stats[result.platform] = {
      count: result.posts.length,
      source: result.source,
    };
  }
  
  return stats;
}
