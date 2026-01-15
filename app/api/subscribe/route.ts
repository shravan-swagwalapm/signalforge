import { NextResponse } from 'next/server';

/**
 * POST /api/subscribe
 * 
 * Stub endpoint for future payment gateway integration
 * Currently returns NOT_IMPLEMENTED
 */
export async function POST() {
  return NextResponse.json(
    {
      status: 'NOT_IMPLEMENTED',
      message: 'Payment gateway integration pending. Stay tuned!',
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/subscribe',
    implementation_status: 'pending',
  });
}
