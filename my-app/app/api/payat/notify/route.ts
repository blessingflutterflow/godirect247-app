import { NextRequest, NextResponse } from 'next/server';
import { confirmPayatPayment } from '@/lib/firebase-service';

/**
 * Pay@ Digi-API payment webhook (PaymentNotifyRequest).
 *
 * Pay@ store-and-forwards (retries) until we return HTTP 200, so we ALWAYS
 * respond 200 for a well-formed request — even for duplicates or unmatched
 * payments — and only return 4xx/5xx when we genuinely cannot process it and
 * want a retry.
 *
 * Auth: Basic auth over HTTPS (configured with Pay@). Set PAYAT_WEBHOOK_USER /
 * PAYAT_WEBHOOK_PASS to enforce it; if unset, auth is skipped (dev only).
 */

function authorized(request: NextRequest): boolean {
  const user = process.env.PAYAT_WEBHOOK_USER;
  const pass = process.env.PAYAT_WEBHOOK_PASS;
  if (!user || !pass) return true; // not configured — allow (dev)

  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const paymentResult = String(body.paymentResult ?? '');
  const accountNumber = String(body.accountNumber ?? '');
  const clientReference = body.clientReference ? String(body.clientReference) : undefined;
  const payatTransactionId = String(body.payatTransactionId ?? body.messageId ?? '');
  const amountPaidCents = typeof body.amountPaid === 'number' ? body.amountPaid : undefined;

  // Only successful payments activate cover. Acknowledge failures so Pay@ stops retrying.
  if (paymentResult !== 'SUCCESS') {
    return NextResponse.json({ received: true });
  }

  if (!accountNumber && !clientReference) {
    // Nothing to correlate on — ack to avoid an endless retry loop.
    console.error('[payat/notify] success webhook missing account/reference', body);
    return NextResponse.json({ received: true });
  }

  const result = await confirmPayatPayment({
    clientReference,
    accountNumber,
    amountPaidCents,
    payatTransactionId,
  });

  if (!result.success && !result.alreadyProcessed) {
    // Genuine failure — return 500 so Pay@ retries the delivery.
    console.error('[payat/notify] confirm failed:', result.error, body);
    return NextResponse.json({ error: result.error || 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
