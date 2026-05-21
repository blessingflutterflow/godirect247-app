'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Sparkle } from '@phosphor-icons/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PEARL_PLANS, type PearlPlan } from '@/lib/pearl-types';
import { signUpPearlUser, attachCheckoutToSubscription } from '@/lib/pearl-service';

function PearlSignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const cancelled = searchParams.get('cancelled');
  const initialPlan: PearlPlan = planParam === 'monthly' ? 'monthly' : 'once-off';
  const [plan, setPlan] = useState<PearlPlan>(initialPlan);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (planParam === 'monthly' || planParam === 'once-off') setPlan(planParam);
  }, [planParam]);

  const planConfig = PEARL_PLANS[plan];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!fullName || !email || !phone) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const signup = await signUpPearlUser(email, password, fullName, phone, plan);
      if (!signup.success || !signup.subscriptionId) {
        setError(signup.error || 'Sign-up failed.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/pearl/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInCents: planConfig.priceAmount * 100,
          subscriptionId: signup.subscriptionId,
          plan,
          email,
          fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || 'Could not start payment.');
        setLoading(false);
        return;
      }
      if (data.checkoutId) {
        await attachCheckoutToSubscription(signup.subscriptionId, data.checkoutId);
      }
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <section className="bg-[#191c1f] min-h-screen pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-5">
          <Link
            href="/pearl"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to plans
          </Link>

          {cancelled && (
            <div className="bg-[#e23b4a]/10 border border-[#e23b4a]/30 rounded-2xl p-4 mb-6 text-[#e23b4a] text-sm">
              Payment was cancelled. You can try again below.
            </div>
          )}

          <div className="grid md:grid-cols-[1fr_360px] gap-6">
            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-[#111315] border border-white/10 rounded-2xl p-7"
            >
              <div className="inline-flex items-center gap-2 bg-[#f3cc20]/10 border border-[#f3cc20]/30 rounded-full px-3 py-1 mb-4">
                <Sparkle className="text-[#f3cc20]" size={12} weight="fill" />
                <span className="text-[#f3cc20] text-[11px] font-semibold tracking-wide">
                  Subscribe to PEARL
                </span>
              </div>
              <h1 className="font-display font-extrabold text-white text-2xl mb-1">
                Create your account
              </h1>
              <p className="text-white/50 text-sm mb-6">
                One step. We&apos;ll take you straight to payment after sign-up.
              </p>

              <div className="space-y-4 mb-5">
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Xolani Dube"
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.co.za"
                />
                <Field
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="082 000 0000"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                />
                <Field
                  label="Confirm password"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Re-enter password"
                />
              </div>

              {/* Plan switcher */}
              <div className="mb-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">
                  Your plan
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['once-off', 'monthly'] as PearlPlan[]).map((p) => {
                    const cfg = PEARL_PLANS[p];
                    const active = p === plan;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlan(p)}
                        className={`text-left rounded-xl border px-4 py-3 transition-all ${
                          active
                            ? 'bg-[#f3cc20]/10 border-[#f3cc20]/40 text-white'
                            : 'bg-white/5 border-white/10 text-white/65 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-semibold">{cfg.label}</div>
                        <div className="text-[#f3cc20] font-display font-bold text-lg">
                          {cfg.priceLabel}
                          <span className="text-white/40 text-[11px] font-medium ml-1">
                            {cfg.cadence}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-[#e23b4a] text-xs mb-4 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#f3cc20] text-[#191c1f] font-display font-bold py-4 rounded-full hover:bg-[#c9a800] transition-all text-sm disabled:opacity-60"
              >
                {loading ? 'Preparing payment…' : `Pay ${planConfig.priceLabel} & activate PEARL`}
              </button>
              <p className="text-center text-white/35 text-xs mt-3">
                Secure payment by Yoco. You can change your plan later.
              </p>
            </form>

            {/* Summary */}
            <aside className="bg-[#111315] border border-white/10 rounded-2xl p-6 h-fit">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">
                Order summary
              </p>
              <h3 className="font-display font-extrabold text-white text-xl mb-1">
                PEARL · {planConfig.label}
              </h3>
              <p className="text-white/45 text-xs mb-5">{planConfig.cadence}</p>

              <div className="flex items-baseline justify-between border-t border-white/10 pt-4 mb-4">
                <span className="text-white/55 text-sm">Today&apos;s charge</span>
                <span className="text-[#f3cc20] font-display font-extrabold text-2xl">
                  {planConfig.priceLabel}
                </span>
              </div>

              <ul className="space-y-2.5">
                {planConfig.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-white/65 text-sm">
                    <CheckCircle
                      size={14}
                      weight="fill"
                      className="text-[#00a87e] mt-1 shrink-0"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 text-sm"
      />
    </div>
  );
}

export default function PearlSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#191c1f] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <PearlSignupInner />
    </Suspense>
  );
}
