import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { policyId, userId, amountInCents } = await request.json();

    if (!policyId || !userId || !amountInCents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const policyRef = doc(db, 'additionalPolicies', policyId);
    const policySnap = await getDoc(policyRef);
    if (!policySnap.exists()) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const policy = policySnap.data();
    if (policy.userId !== userId) {
      return NextResponse.json({ error: 'Not authorised for this policy' }, { status: 403 });
    }

    const secret = process.env.YOCO_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

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
        successUrl: `${origin}/dashboard?payment=success&additionalPolicyId=${policyId}`,
        cancelUrl: `${origin}/dashboard?payment=cancelled&additionalPolicyId=${policyId}`,
        metadata: {
          userId,
          additionalPolicyId: policyId,
          planType: policy.planType,
          tier: policy.tier,
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

    await updateDoc(policyRef, {
      yocoCheckoutId: data.id,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      checkoutId: data.id,
      redirectUrl: data.redirectUrl,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
