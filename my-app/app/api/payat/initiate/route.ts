import { NextRequest, NextResponse } from 'next/server';
import { getUserData, createPayatPayment, attachPayatDetails } from '@/lib/firebase-service';
import { generateAccountNumber, isConfigured, loadAccount, initiatePayment } from '@/lib/payat';
import { PLUS_TIERS, GOLD_TIERS, ACTIVATION_AMOUNT } from '@/lib/constants';

function getActivationFee(tierName: string, planType: 'plus' | 'gold'): number {
  const tiers = planType === 'gold' ? GOLD_TIERS : PLUS_TIERS;
  return tiers.find((t) => t.name === tierName)?.feeAmount ?? ACTIVATION_AMOUNT;
}

function baseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await getUserData(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const amount = getActivationFee(user.tier, user.planType);
    const amountCents = amount * 100;

    // Always record a pending payment so the webhook can correlate it back.
    const { id: paymentId } = await createPayatPayment(userId, amount);
    const accountNumber = generateAccountNumber();

    // Sandbox mode — no real credentials yet. Returns the retail number only.
    if (!isConfigured()) {
      await attachPayatDetails(paymentId, accountNumber, `sandbox-${paymentId}`);
      return NextResponse.json({
        success: true,
        sandbox: true,
        amount,
        accountNumber,
        webPaymentLinks: [],
        appPaymentLinks: [],
        qrCodeUrl: null,
        message: 'Pay@ is in sandbox mode (no live credentials). Use the account number for testing.',
      });
    }

    await loadAccount(accountNumber, amountCents, user.fullName || 'GoDirect247 Member');
    const result = await initiatePayment({
      accountNumber,
      amountCents,
      clientReference: paymentId,
      redirectBaseUrl: baseUrl(request),
    });

    await attachPayatDetails(paymentId, accountNumber, result.referenceKey || paymentId);

    return NextResponse.json({
      success: true,
      amount,
      accountNumber,
      referenceKey: result.referenceKey ?? null,
      webPaymentLinks: result.webPaymentLinks ?? [],
      appPaymentLinks: result.appPaymentLinks ?? [],
      qrCodeUrl: result.qrCodePayment?.qrCodeUrl ?? null,
    });
  } catch (err) {
    console.error('[payat/initiate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not start Pay@ payment' },
      { status: 500 }
    );
  }
}
