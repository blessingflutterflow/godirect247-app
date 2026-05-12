import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amountInCents, userId, tier, planType } = await request.json();

    if (!amountInCents || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const secret = process.env.YOCO_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: 'ZAR',
        successUrl: `${origin}/dashboard?payment=success&userId=${userId}&tier=${encodeURIComponent(tier || '')}&planType=${planType || ''}`,
        cancelUrl: `${origin}/dashboard?payment=cancelled`,
        metadata: {
          userId,
          tier,
          planType,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create checkout' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutId: data.id,
      redirectUrl: data.redirectUrl,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
