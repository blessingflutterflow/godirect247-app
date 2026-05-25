'use client';

import Link from 'next/link';
import { Gift, Heart, Crown, ArrowRight } from '@phosphor-icons/react';
import {
  YOUTH_PROMO_CODE,
  GENEROSITY_PROMO_CODE,
  YOUTH_FREE_COVER_LIMIT,
  PEARL_ACTIVIST_FEE,
} from '@/lib/promo-codes';

export default function PromoPage() {
  return (
    <main className="min-h-screen bg-[#191c1f] text-white">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-[#f3cc20] text-xs font-bold tracking-[0.2em] uppercase mb-3">
            Limited promo codes · Pearl × GoDirect247
          </p>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight">
            Free cover. Big discounts.
            <br />
            <span className="text-[#f3cc20]">Pick your code.</span>
          </h1>
          <p className="text-white/60 mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Two promo codes are now live across the GoDirect247 funeral plans. Use the code that fits your age at signup —
            the discount or free cover is applied automatically.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#f3cc20]/30 bg-gradient-to-br from-[#f3cc20]/10 to-transparent p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#f3cc20]/20 p-2.5">
                <Gift size={22} weight="fill" className="text-[#f3cc20]" />
              </div>
              <h2 className="font-display font-bold text-2xl">Youth · Free Cover</h2>
            </div>
            <p className="text-white/70 text-sm mb-5">
              Free funeral cover for ages <strong>16 – 35</strong>. Open to the first {YOUTH_FREE_COVER_LIMIT.toLocaleString()} new sign-ups.
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-white/50 text-[11px] uppercase tracking-wide">Promo code</span>
              <span className="font-mono text-lg font-bold text-[#f3cc20]">{YOUTH_PROMO_CODE}</span>
            </div>
            <div className="space-y-2 mb-6 text-sm text-white/70">
              <div className="flex items-start gap-2">
                <span className="text-[#00a87e]">✓</span>
                <span>100% off activation — free cover</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#00a87e]">✓</span>
                <span>Optional R{PEARL_ACTIVIST_FEE} to become a <strong className="text-[#f3cc20]">Pearl Activist</strong> in the Generosity Reward</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#00a87e]">✓</span>
                <span>Capped at {YOUTH_FREE_COVER_LIMIT.toLocaleString()} sign-ups</span>
              </div>
            </div>
            <Link
              href={`/signup?promo=${YOUTH_PROMO_CODE}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#f3cc20] px-5 py-3 text-sm font-bold text-[#191c1f] hover:bg-[#c9a800] transition-all"
            >
              Claim free cover <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-3xl border border-[#00a87e]/30 bg-gradient-to-br from-[#00a87e]/10 to-transparent p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#00a87e]/20 p-2.5">
                <Heart size={22} weight="fill" className="text-[#00a87e]" />
              </div>
              <h2 className="font-display font-bold text-2xl">Generosity Discount</h2>
            </div>
            <p className="text-white/70 text-sm mb-5">
              Apply this code inside the Generosity Reward signup. Age-tiered discount on your activation fee.
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-white/50 text-[11px] uppercase tracking-wide">Promo code</span>
              <span className="font-mono text-lg font-bold text-[#00a87e]">{GENEROSITY_PROMO_CODE}</span>
            </div>
            <div className="space-y-2 mb-6 text-sm text-white/70">
              <div className="flex items-start gap-2">
                <Crown size={16} weight="fill" className="text-[#f3cc20] mt-0.5 flex-shrink-0" />
                <span><strong className="text-white">70% off</strong> · ages 36 – 64</span>
              </div>
              <div className="flex items-start gap-2">
                <Crown size={16} weight="fill" className="text-[#f3cc20] mt-0.5 flex-shrink-0" />
                <span><strong className="text-white">50% off</strong> · ages 65 – 83</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white/40">•</span>
                <span>Generosity Reward sign-up only</span>
              </div>
            </div>
            <Link
              href={`/signup?special=generosity&promo=${GENEROSITY_PROMO_CODE}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#00a87e] px-5 py-3 text-sm font-bold text-white hover:bg-[#008a68] transition-all"
            >
              Apply discount <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-xs text-white/55 leading-relaxed">
          <p>
            Age is verified from your South African ID number at signup. Existing GoDirect247 members each get their own
            personal promo code in the format <span className="font-mono text-white">FirstName##</span> — log in to your dashboard to share yours.
            All promo offers are subject to GoDirect247 terms, FSP Licence JR 50841.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/40 text-xs hover:text-white/70">← Back to godirect247.com</Link>
        </div>
      </div>
    </main>
  );
}
