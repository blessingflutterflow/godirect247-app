/**
 * Pay@ Digi-API v1.2 client (server-only).
 *
 * Flow: OAuth (client credentials) -> loadAccount -> initiatePayment.
 * Pay@ then notifies /api/payat/notify when the customer pays (card, EFT, QR
 * wallet, or cash at Shoprite/Checkers/PnP/Boxer/Spar).
 *
 * Spec: "API Spec/.../Pay@ Digi-API v1.2.yaml".
 *
 * If credentials are not configured, isConfigured() returns false and the
 * initiate route falls back to a sandbox response so the app still runs.
 */

const ENV = (process.env.PAYAT_ENV || 'qa').toLowerCase();
const IS_PROD = ENV === 'prod' || ENV === 'production';

// Host + scopes per the Digi-API spec (security section).
const HOST = IS_PROD ? 'https://payat.io:7447' : 'https://payat.io:9443';
const TOKEN_URL = `${HOST}/oauth/v1/token`;
const API_BASE = `${HOST}/digiapi/v1`;
const SCOPE = IS_PROD
  ? '042d7bfe-3ad2-11eb-adc1-0242ac120002'
  : 'f07aa83c-e6b9-11ea-adc1-0242ac120002';

const CLIENT_ID = process.env.PAYAT_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYAT_CLIENT_SECRET || '';
const ISSUER_PREFIX = process.env.PAYAT_ISSUER_PREFIX || '';

export function isConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && ISSUER_PREFIX);
}

// ── Account number ──────────────────────────────────────────────────────────

/** Luhn (mod-10) check digit, as used by Pay@/EasyPay barcodes. */
function luhnCheckDigit(numeric: string): number {
  let sum = 0;
  let double = true; // weighting starts from the rightmost body digit
  for (let i = numeric.length - 1; i >= 0; i--) {
    let d = numeric.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Generate a unique Pay@ account number: <issuerPrefix><7-digit suffix><check>.
 * Mirrors the sample extracts (e.g. prefix 11402 -> 1140281946521).
 */
export function generateAccountNumber(): string {
  const suffix = (Date.now() % 10_000_000).toString().padStart(7, '0');
  const body = `${ISSUER_PREFIX}${suffix}`;
  return `${body}${luhnCheckDigit(body)}`;
}

// ── OAuth ───────────────────────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Reuse the token until ~2 minutes before expiry (spec recommends frequent refresh).
  if (cachedToken && Date.now() < cachedToken.expiresAt - 120_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pay@ auth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlMs = (data.expires_in ?? 24 * 60 * 60) * 1000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messageId: crypto.randomUUID(),
      transmissionDateTime: new Date().toISOString(),
      ...body,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { errorRspDescription?: string }).errorRspDescription;
    throw new Error(`Pay@ ${path} failed (${res.status}): ${msg || 'unknown error'}`);
  }
  return data as T;
}

// ── API calls ───────────────────────────────────────────────────────────────

interface PaymentLink {
  paymentMethodName: string;
  paymentUrl: string;
}

interface LoadAccountResponse {
  responseCode: string;
  responseDescription: string;
}

interface InitiatePaymentResponse {
  responseCode: string;
  responseDescription: string;
  referenceKey?: string;
  appPaymentLinks?: PaymentLink[];
  webPaymentLinks?: PaymentLink[];
  qrCodePayment?: { qrCodeUrl?: string; supportedApplications?: string[] };
}

/**
 * Load (create/update) a payable account for the given amount.
 * Used because we are the bill issuer for these activation payments.
 */
export async function loadAccount(
  accountNumber: string,
  amountCents: number,
  accountHolderName: string
): Promise<LoadAccountResponse> {
  const res = await apiPost<LoadAccountResponse>('/payment/load', {
    accountNumber,
    accountHolderName,
    amount: amountCents,
  });
  if (res.responseCode !== 'SUCCESS' && res.responseCode !== 'ACCOUNT_ALREADY_AUTHORIZED') {
    throw new Error(`Pay@ loadAccount declined: ${res.responseCode} — ${res.responseDescription}`);
  }
  return res;
}

/** Retrieve the set of payment links (card, EFT, QR, wallet apps) for an account. */
export async function initiatePayment(opts: {
  accountNumber: string;
  amountCents: number;
  clientReference: string;
  redirectBaseUrl: string;
}): Promise<InitiatePaymentResponse> {
  const redirect = `${opts.redirectBaseUrl}/dashboard`;
  const res = await apiPost<InitiatePaymentResponse>('/payment/initiate', {
    accountNumber: opts.accountNumber,
    accountType: 'BILL_PAY',
    amount: opts.amountCents,
    clientReference: opts.clientReference,
    successUrl: `${redirect}?payat=success`,
    failedUrl: `${redirect}?payat=failed`,
    cancelledUrl: `${redirect}?payat=cancelled`,
  });
  if (res.responseCode !== 'SUCCESS') {
    throw new Error(`Pay@ initiatePayment declined: ${res.responseCode} — ${res.responseDescription}`);
  }
  return res;
}
