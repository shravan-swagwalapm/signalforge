import { SupabaseClient } from '@supabase/supabase-js';
import { GatingResult } from './types';

const FREE_RUNS_PER_MONTH = 3;

/**
 * Check if user is allowed to run discovery
 * Server-side enforcement - never trust frontend
 */
export async function checkGating(
  supabase: SupabaseClient,
  userId: string
): Promise<GatingResult> {
  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  const isSubscribed = subscription?.status === 'active';

  // If subscribed, always allow
  if (isSubscribed) {
    return {
      allowed: true,
      remaining_runs: Infinity,
      is_subscribed: true,
      successful_runs_this_month: 0, // Not relevant for subscribers
    };
  }

  // Count successful runs this month
  const startOfMonth = getStartOfMonthUTC();
  
  const { count, error } = await supabase
    .from('run_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'success')
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('Error counting runs:', error);
    // Fail open for now - allow the run
    return {
      allowed: true,
      remaining_runs: FREE_RUNS_PER_MONTH,
      is_subscribed: false,
      successful_runs_this_month: 0,
    };
  }

  const successfulRuns = count || 0;
  const remainingRuns = Math.max(0, FREE_RUNS_PER_MONTH - successfulRuns);

  return {
    allowed: successfulRuns < FREE_RUNS_PER_MONTH,
    remaining_runs: remainingRuns,
    is_subscribed: false,
    successful_runs_this_month: successfulRuns,
  };
}

/**
 * Record a run attempt
 */
export async function recordRunAttempt(
  supabase: SupabaseClient,
  userId: string,
  theme: string,
  status: 'success' | 'failure'
): Promise<void> {
  const { error } = await supabase.from('run_attempts').insert({
    user_id: userId,
    theme,
    status,
  });

  if (error) {
    console.error('Error recording run attempt:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Get start of current month in UTC
 */
function getStartOfMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Get remaining free runs for display
 */
export async function getRemainingRuns(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const gating = await checkGating(supabase, userId);
  return gating.is_subscribed ? Infinity : gating.remaining_runs;
}
