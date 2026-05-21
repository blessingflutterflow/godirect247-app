'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Crown } from '@phosphor-icons/react';
import { PLUS_TIERS, GOLD_TIERS, type TierData } from '@/lib/constants';
import { QuotationCalculator } from '@/components/QuotationCalculator';

function TierRow({ tier, isGold }: { tier: TierData; isGold: boolean }) {
  const topClass = isGold
    ? 'hover:bg-[#f3cc20]/5 bg-[#f3cc20]/[0.03]'
    : 'hover:bg-[#f3cc20]/5 bg-[#f3cc20]/[0.03]';
  const normalClass = isGold ? 'hover:bg-[#f3cc20]/[0.03]' : 'hover:bg-white/[0.03]';

  if (tier.isTop) {
    return (
      <div className={`grid grid-cols-3 px-5 py-4 transition-colors items-center ${topClass}`}>
        <span className="font-semibold text-[#f3cc20] text-sm flex items-center gap-2">
          {tier.name}
          <span className="text-[10px] bg-[#f3cc20]/20 text-[#f3cc20] px-1.5 py-0.5 rounded-full border border-[#f3cc20]/30">
            Top
          </span>
        </span>
        <span className="text-center font-display font-bold text-[#f3cc20]">{tier.cover}</span>
        <span className="text-right text-[#f3cc20]/70 text-sm">{tier.fee}</span>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-3 px-5 py-4 transition-colors items-center ${normalClass}`}>
      <span className="font-medium text-white text-sm">{tier.name}</span>
      <span className="text-center font-display font-bold text-white">{tier.cover}</span>
      <span className="text-right text-white/60 text-sm">{tier.fee}</span>
    </div>
  );
}

export function PlansTabs() {
  const [active, setActive] = useState<'plus' | 'gold'>('plus');

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex bg-white/[0.06] border border-white/10 rounded-full p-1 mb-8 max-w-xs mx-auto">
        <button
          onClick={() => setActive('plus')}
          className={`flex-1 py-2.5 px-5 rounded-full text-sm font-semibold transition-all ${
            active === 'plus' ? 'bg-white text-[#191c1f]' : 'text-white/50'
          }`}
        >
          Plus Plan
        </button>
        <button
          onClick={() => setActive('gold')}
          className={`flex-1 py-2.5 px-5 rounded-full text-sm font-semibold transition-all ${
            active === 'gold' ? 'bg-[#f3cc20] text-[#191c1f]' : 'text-white/50'
          }`}
        >
          Gold Plan
        </button>
      </div>

      {/* Plus Plan panel */}
      {active === 'plus' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-sky-900/30 border border-sky-700/20 rounded-xl p-2.5">
              <Shield className="text-sky-300" size={20} />
            </div>
            <div>
              <span className="font-display font-bold text-white text-lg">Plus Plan</span>
              <p className="text-white/40 text-xs mt-0.5">
                Funeral cover · cashback from month 4 · refer &amp; earn · no medicals
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 overflow-hidden mb-5">
            <div className="grid grid-cols-3 bg-white/[0.04] px-5 py-3 text-xs text-white/30 font-semibold uppercase tracking-wider border-b border-white/10">
              <span>Tier</span>
              <span className="text-center">Cover</span>
              <span className="text-right">Activation fee</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {PLUS_TIERS.map((tier) => (
                <TierRow key={tier.name} tier={tier} isGold={false} />
              ))}
            </div>
          </div>
          <Link
            href="/signup?plan=plus"
            className="flex items-center justify-center gap-2 w-full border-2 border-white/20 text-white font-semibold py-3.5 rounded-full hover:border-white/40 hover:bg-white/5 transition-all text-sm"
          >
            <Shield size={16} /> Get started with Plus Plan
          </Link>
        </div>
      )}

      {/* Gold Plan panel */}
      {active === 'gold' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#f3cc20]/15 border border-[#f3cc20]/25 rounded-xl p-2.5">
              <Crown className="text-[#f3cc20]" size={20} />
            </div>
            <div>
              <span className="font-display font-bold text-white text-lg">Gold Plan</span>
              <p className="text-white/40 text-xs mt-0.5">
                Funeral cover · cashback from month 4 ·{' '}
                <span className="text-[#f3cc20]">quarterly payouts</span> · refer &amp; earn
              </p>
            </div>
            <span className="ml-auto bg-[#f3cc20] text-[#191c1f] text-xs font-bold px-3 py-1 rounded-full">
              Popular
            </span>
          </div>
          <div className="rounded-2xl border border-[#f3cc20]/20 overflow-hidden mb-5 bg-[#f3cc20]/[0.02]">
            <div className="grid grid-cols-3 bg-[#f3cc20]/[0.06] px-5 py-3 text-xs text-white/30 font-semibold uppercase tracking-wider border-b border-[#f3cc20]/15">
              <span>Tier</span>
              <span className="text-center">Cover</span>
              <span className="text-right">Activation fee</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {GOLD_TIERS.map((tier) => (
                <TierRow key={tier.name} tier={tier} isGold={true} />
              ))}
            </div>
          </div>
          <Link
            href="/signup?plan=gold"
            className="flex items-center justify-center gap-2 w-full bg-[#f3cc20] text-[#191c1f] font-bold py-3.5 rounded-full hover:bg-[#c9a800] transition-all text-sm"
          >
            <Crown size={16} /> Get started with Gold Plan
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-4 text-xs text-white/30 border-t border-white/10 pt-6">
        <span className="flex items-center gap-1.5">⏱ 6-month waiting period (natural death)</span>
        <span className="flex items-center gap-1.5">💰 Cashback paid 5th of month 4</span>
        <span className="flex items-center gap-1.5">🔄 Renew by month 11 to stay active</span>
      </div>

      <QuotationCalculator />
    </div>
  );
}
