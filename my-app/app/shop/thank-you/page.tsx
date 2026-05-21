'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, ArrowRight } from '@phosphor-icons/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { markOrderPaid } from '@/lib/pearl-service';
import { useCart } from '@/components/CartContext';

type Phase = 'verifying' | 'success' | 'pending' | 'error';

function ShopThankYouInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const checkoutId = searchParams.get('checkoutId');
  const [phase, setPhase] = useState<Phase>('verifying');
  const [error, setError] = useState('');
  const { clear } = useCart();

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      if (!orderId) {
        setError('Missing order reference.');
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

        const marked = await markOrderPaid(orderId);
        if (!marked.success) {
          setError(marked.error || 'Could not finalise order.');
          setPhase('error');
          return;
        }
        clear();
        if (cancelled) return;
        setPhase('success');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to finalise order.');
        setPhase('error');
      }
    }

    activate();
    return () => {
      cancelled = true;
    };
  }, [orderId, checkoutId, clear]);

  return (
    <>
      <Navbar />
      <section className="bg-[#191c1f] min-h-screen pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-5">
          {phase === 'verifying' && (
            <div className="bg-[#111315] border border-white/10 rounded-2xl p-10 text-center">
              <div className="text-[#f3cc20] text-sm mb-2">Verifying your payment…</div>
              <div className="text-white/40 text-xs">Just a few seconds.</div>
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
                href="/shop/cart"
                className="inline-block bg-[#f3cc20] text-[#191c1f] font-display font-bold px-6 py-3 rounded-full text-sm"
              >
                Back to cart
              </Link>
            </div>
          )}

          {phase === 'success' && (
            <div className="bg-[#111315] border border-[#00a87e]/30 rounded-2xl p-8 md:p-10 text-center">
              <div className="bg-[#00a87e]/10 border border-[#00a87e]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="text-[#00a87e]" size={32} weight="fill" />
              </div>
              <h1 className="font-display font-extrabold text-white text-3xl mb-3">
                Thank you for your order! 🎉
              </h1>
              <p className="text-white/65 text-sm mb-7">
                Your payment was successful. We&apos;ll prepare your order and let you know
                when it ships.
              </p>

              <div className="bg-[#191c1f] border border-white/10 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Package size={16} className="text-[#f3cc20]" />
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wide">
                    Order reference
                  </p>
                </div>
                <p className="text-white font-mono text-sm break-all">{orderId}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/shop"
                  className="flex items-center justify-center gap-2 bg-[#f3cc20] text-[#191c1f] font-display font-bold px-5 py-3.5 rounded-full text-sm hover:bg-[#c9a800] transition-all"
                >
                  Keep shopping <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 bg-white/10 text-white border border-white/15 font-display font-bold px-5 py-3.5 rounded-full text-sm hover:bg-white/15 transition-all"
                >
                  Back to home
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

export default function ShopThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#191c1f] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <ShopThankYouInner />
    </Suspense>
  );
}
