import { NextRequest, NextResponse } from 'next/server';

function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://godirect247.com';

  return configured.replace(/\/$/, '');
}

function wrapBrandedEmail(html: string): string {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/godirect247-logo.jpg`;

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#191c1f;">
        <div style="max-width:640px;margin:0 auto;padding:24px 14px;">
          <div style="background:#ffffff;border:1px solid #e4e8eb;border-radius:18px;overflow:hidden;">
            <div style="background:#191c1f;padding:18px 22px;display:flex;align-items:center;gap:12px;">
              <img src="${logoUrl}" alt="GoDirect247" width="54" height="54" style="border-radius:999px;display:block;background:#fff;object-fit:cover;" />
              <div>
                <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.2px;">Go<span style="color:#f3cc20;">Direct</span>247</div>
                <div style="font-size:12px;color:rgba(255,255,255,.62);margin-top:3px;">Zarkudu Group · FSP Licence JR 50841</div>
              </div>
            </div>
            <div style="position:relative;padding:28px 24px;line-height:1.55;font-size:15px;">
              <img src="${logoUrl}" alt="" width="260" height="225" style="position:absolute;right:16px;bottom:12px;opacity:.06;border-radius:999px;z-index:0;" />
              <div style="position:relative;z-index:1;">${html}</div>
            </div>
            <div style="border-top:1px solid #e4e8eb;padding:14px 22px;font-size:12px;color:#505a63;">
              <strong>GoDirect247</strong> · godirect247.com · WhatsApp 078 063 8753
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to, subject or html' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'GoDirect247 <noreply@godirect247.com>';

    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html: wrapBrandedEmail(html) }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Failed to send email' }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
