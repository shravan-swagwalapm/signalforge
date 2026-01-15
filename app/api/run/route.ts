import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGating, recordRunAttempt } from '@/lib/gating';
import { runDiscovery, getPlatformStats } from '@/connectors';
import { RunRequest, RunResponse, PaywallResponse, ErrorResponse } from '@/lib/types';

/**
 * POST /api/run
 * 
 * Main discovery endpoint
 * 
 * Flow:
 * 1. Verify auth
 * 2. Check gating (trial/subscription)
 * 3. Run discovery pipeline
 * 4. Record attempt (only on success)
 * 5. Return results or paywall
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RunRequest = await request.json();
    
    if (!body.theme || typeof body.theme !== 'string') {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          code: 'INVALID_REQUEST',
          message: 'Theme is required',
        },
        { status: 400 }
      );
    }
    
    const theme = body.theme.trim();
    
    if (theme.length < 2 || theme.length > 200) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          code: 'INVALID_REQUEST',
          message: 'Theme must be between 2 and 200 characters',
        },
        { status: 400 }
      );
    }
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          code: 'AUTH_REQUIRED',
          message: 'Please sign in to continue',
        },
        { status: 401 }
      );
    }
    
    // Update LinkedIn URL if provided
    if (body.linkedin_url) {
      await supabase
        .from('profiles')
        .update({ linkedin_url: body.linkedin_url })
        .eq('id', user.id);
    }
    
    // Check gating (trial limits)
    const gating = await checkGating(supabase, user.id);
    
    if (!gating.allowed) {
      // User has exceeded free tier - return paywall
      // For MVP: we're skipping paywall enforcement, but structure is ready
      // TODO: Uncomment when enabling paywall
      /*
      return NextResponse.json<PaywallResponse>(
        {
          success: false,
          code: 'PAYWALL_REQUIRED',
          teaser: {
            title: 'Your content ideas are waiting...',
            why: 'Upgrade to unlock unlimited discovery runs',
            score: 85,
          },
          remaining_free_runs: 0,
        },
        { status: 402 }
      );
      */
    }
    
    // Run discovery pipeline
    console.log(`[RUN] Starting discovery for theme: "${theme}" (user: ${user.id})`);
    const startTime = Date.now();
    
    const result = await runDiscovery(theme);
    
    const duration = Date.now() - startTime;
    console.log(`[RUN] Discovery completed in ${duration}ms - ${result.total_posts} posts found`);
    
    // Check if discovery succeeded
    if (!result.success || result.total_posts === 0) {
      // Discovery failed - do NOT burn attempt
      console.log(`[RUN] Discovery failed - not counting as attempt`);
      
      // Optionally record failure for analytics
      await recordRunAttempt(supabase, user.id, theme, 'failure');
      
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          code: 'DISCOVERY_FAILED',
          message: 'Unable to find content for this theme. Try a different topic or check back later.',
        },
        { status: 500 }
      );
    }
    
    // Success! Record the attempt
    await recordRunAttempt(supabase, user.id, theme, 'success');
    
    // Calculate remaining runs
    const newGating = await checkGating(supabase, user.id);
    
    // Log platform stats
    const platformStats = getPlatformStats(result.platform_results);
    console.log(`[RUN] Platform stats:`, platformStats);
    
    // Return results
    return NextResponse.json<RunResponse>({
      success: true,
      clusters: result.clusters,
      total_posts: result.total_posts,
      remaining_free_runs: newGating.remaining_runs,
    });
    
  } catch (error) {
    console.error('[RUN] Unexpected error:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        code: 'DISCOVERY_FAILED',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/run' });
}
