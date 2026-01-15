// ============================================
// SignalForge - Core Types
// ============================================

// Database types
export interface Profile {
  id: string;
  email: string;
  linkedin_url: string | null;
  created_at: string;
}

export interface RunAttempt {
  id: string;
  user_id: string;
  theme: string;
  status: 'success' | 'failure';
  created_at: string;
}

export interface Subscription {
  user_id: string;
  status: 'none' | 'active' | 'past_due' | 'cancelled';
  pg_customer_id: string | null;
  pg_subscription_id: string | null;
  updated_at: string;
}

// Platform types
export type Platform = 'reddit' | 'x' | 'linkedin';

export interface PostMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  upvotes?: number;
  reposts?: number;
  views?: number;
}

export interface Post {
  platform: Platform;
  url: string;
  author?: string;
  author_followers?: number;
  title: string;
  text?: string;
  created_at?: string;
  metrics: PostMetrics;
}

// Scoring types
export interface ScoredPost extends Post {
  score: number; // 0-100
  why: string[]; // Top 3 reasons for the score
}

export interface NarrativeCluster {
  name: string;
  description: string;
  keywords: string[];
  posts: ScoredPost[];
}

// API types
export interface RunRequest {
  theme: string;
  linkedin_url?: string;
}

export interface RunResponse {
  success: true;
  clusters: NarrativeCluster[];
  total_posts: number;
  remaining_free_runs: number;
}

export interface PaywallResponse {
  success: false;
  code: 'PAYWALL_REQUIRED';
  teaser: {
    title: string;
    why: string;
    score: number;
  };
  remaining_free_runs: 0;
}

export interface ErrorResponse {
  success: false;
  code: 'DISCOVERY_FAILED' | 'AUTH_REQUIRED' | 'INVALID_REQUEST';
  message: string;
}

export type RunAPIResponse = RunResponse | PaywallResponse | ErrorResponse;

// Connector interface
export interface ConnectorResult {
  platform: Platform;
  posts: Post[];
  source: 'api' | 'scraping';
  error?: string;
}

// Gating types
export interface GatingResult {
  allowed: boolean;
  remaining_runs: number;
  is_subscribed: boolean;
  successful_runs_this_month: number;
}

// Theme expansion
export interface ThemeExpansion {
  original: string;
  clusters: {
    name: string;
    keywords: string[];
    search_queries: string[];
  }[];
}
