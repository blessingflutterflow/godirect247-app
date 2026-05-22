'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Sparkle, Heart, ArrowRight } from '@phosphor-icons/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getSubscription, markSubscriptionPaid } from '@/lib/pearl-service';
import { PEARL_PLANS } from '@/lib/pearl-types';

type Phase = 'verifying' | 'success' | 'pending' | 'error';

function PearlWelcomeInner() {
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId');
  const checkoutId = searchParams.get('checkoutId');
  const [phase, setPhase] = useState<Phase>('verifying');
  const [error, setError] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [planLabel, setPlanLabel] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      if (!subscriptionId) {
        setError('Missing subscription reference.');
        setPhase('error');
        return;
      }
      try {
        if (checkoutId) {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkoutId }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setError(verifyData.error || 'Could not verify payment.');
            setPhase('error');
            return;
          }
          if (verifyData.status !== 'succeeded') {
            setPhase('pending');
            return;
          }
        }

        const sub = await getSubscription(subscriptionId);
        if (!sub) {
          setError('Subscription not found.');
          setPhase('error');
          return;
        }
        setMemberName(sub.fullName);
        setMemberEmail(sub.email);
        setPlanLabel(PEARL_PLANS[sub.plan].label);

        if (sub.status !== 'active') {
          const activated = await markSubscriptionPaid(subscriptionId);
          if (!activated.success) {
            setError(activated.error || 'Could not activate subscription.');
            setPhase('error');
            return;
          }
          // Send welcome email (fire & forget)
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: sub.email,
              subject: 'Welcome to PEARL — your GoDirect247 AI Agent is ready',
              html: buildWelcomeHtml(sub.fullName, sub.email, PEARL_PLANS[sub.plan].label),
            }),
          }).catch(() => {});
        }

        if (cancelled) return;
        setPhase('success');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Activation failed.');
        setPhase('error');
      }
    }

    activate();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId, checkoutId]);

  return (
    <>
      <Navbar />
      <section className="bg-[#191c1f] min-h-screen pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-5">
          {phase === 'verifying' && (
            <div className="bg-[#111315] border border-white/10 rounded-2xl p-10 text-center">
              <div className="text-[#f3cc20] text-sm mb-2">Verifying your payment…</div>
              <div className="text-white/40 text-xs">Hold tight, this takes a few seconds.</div>
            </div>
          )}

          {phase === 'pending' && (
            <div className="bg-[#111315] border border-[#f3cc20]/30 rounded-2xl p-10 text-center">
              <h1 className="font-display font-extrabold text-white text-2xl mb-3">
                Payment pending
              </h1>
              <p className="text-white/60 text-sm">
                Your payment hasn&apos;t completed yet. Please refresh in a minute, or contact
                support if you were charged.
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="bg-[#111315] border border-[#e23b4a]/30 rounded-2xl p-10 text-center">
              <h1 className="font-display font-extrabold text-white text-2xl mb-3">
                Something went wrong
              </h1>
              <p className="text-[#e23b4a] text-sm mb-5">{error}</p>
              <Link
                href="/pearl/signup"
                className="inline-block bg-[#f3cc20] text-[#191c1f] font-display font-bold px-6 py-3 rounded-full text-sm"
              >
                Try again
              </Link>
            </div>
          )}

          {phase === 'success' && (
            <div className="bg-[#111315] border border-[#00a87e]/30 rounded-2xl p-8 md:p-10">
              <div className="inline-flex items-center gap-2 bg-[#00a87e]/10 border border-[#00a87e]/30 rounded-full px-3 py-1 mb-5">
                <CheckCircle className="text-[#00a87e]" size={14} weight="fill" />
                <span className="text-[#00a87e] text-xs font-semibold tracking-wide">
                  PAYMENT CONFIRMED
                </span>
              </div>
              <h1 className="font-display font-extrabold text-white text-3xl md:text-4xl mb-3 leading-tight">
                Thank you{memberName ? `, ${memberName.split(' ')[0]}` : ''}.{' '}
                <span className="text-[#f3cc20]">PEARL is ready for you.</span>
              </h1>
              <p className="text-white/65 text-sm md:text-base mb-7 leading-relaxed">
                You just made a powerful move. Your family&apos;s peace of mind, your money
                decisions, and your legacy — PEARL is here to help with all of it,
                <strong className="text-white"> 24 hours a day</strong>.
              </p>

              <div className="bg-[#191c1f] border border-white/10 rounded-2xl p-5 mb-6">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">
                  Your login details
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/55">Email</span>
                    <span className="text-white font-medium break-all">{memberEmail}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/55">Password</span>
                    <span className="text-white font-medium">The one you set at sign-up</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/55">Plan</span>
                    <span className="text-[#f3cc20] font-semibold">{planLabel}</span>
                  </div>
                </div>
                <p className="text-white/35 text-xs mt-4">
                  A copy was emailed to {memberEmail}.
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#f3cc20]/10 to-transparent border border-[#f3cc20]/20 rounded-2xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkle
                    className="text-[#f3cc20] mt-0.5 shrink-0"
                    size={20}
                    weight="fill"
                  />
                  <p className="text-white/80 text-sm leading-relaxed">
                    <strong className="text-[#f3cc20]">A word from us:</strong> The fact that
                    you&apos;re here means you&apos;re taking control. Every great family legacy
                    started with one small, brave decision — yours is today. PEARL will be by
                    your side. Go forward with confidence.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 bg-[#f3cc20] text-[#191c1f] font-display font-bold px-5 py-3.5 rounded-full text-sm hover:bg-[#c9a800] transition-all"
                >
                  Login to PEARL <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 bg-white/10 text-white border border-white/15 font-display font-bold px-5 py-3.5 rounded-full text-sm hover:bg-white/15 transition-all"
                >
                  <Heart size={16} weight="fill" /> Back to home
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}

function buildWelcomeHtml(fullName: string, email: string, planLabel: string): string {
  const firstName = fullName.split(' ')[0] || fullName;
  return `
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;">Welcome to PEARL, ${firstName} 👋</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">
      Your subscription is <strong>active</strong>. You&rsquo;ve just unlocked your personal
      GoDirect247 AI Agent — 24/7 support for your funeral cover, your family, and your
      financial decisions.
    </p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">
      <strong>The fact that you&rsquo;re reading this means one thing:</strong> you&rsquo;re
      the kind of person who makes brave moves for the people you love. We&rsquo;re honoured
      to walk this journey with you.
    </p>
    <div style="background:#f9f6e6;border:1px solid #f3cc20;border-radius:14px;padding:16px 18px;margin:18px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.4px;color:#7a6a00;text-transform:uppercase;margin-bottom:8px;">
        Your login details
      </div>
      <div style="font-size:14px;line-height:1.7;">
        <div><strong>Email:</strong> ${email}</div>
        <div><strong>Password:</strong> the one you set at sign-up</div>
        <div><strong>Plan:</strong> ${planLabel}</div>
      </div>
      <div style="margin-top:14px;">
        <a href="https://godirect247.com/dashboard"
           style="display:inline-block;background:#191c1f;color:#f3cc20;font-weight:800;font-size:13px;padding:10px 18px;border-radius:999px;text-decoration:none;">
          Login to PEARL →
        </a>
      </div>
    </div>
    <p style="margin:18px 0 0;font-size:14px;color:#505a63;line-height:1.55;">
      Need help? Reply to this email or call us on 021 140 8083 / 010 003 0789.<br/>
      With you always — the GoDirect247 team.
    </p>
  `;
}

export default function PearlWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#191c1f] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <PearlWelcomeInner />
    </Suspense>
  );
}
