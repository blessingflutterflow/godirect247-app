import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { checkoutId } = await request.json();

    if (!checkoutId) {
      return NextResponse.json({ error: 'Missing checkout ID' }, { status: 400 });
    }

    const secret = process.env.YOCO_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const response = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to verify payment' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: data.status, // 'succeeded', 'pending', 'failed'
      checkoutId: data.id,
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
