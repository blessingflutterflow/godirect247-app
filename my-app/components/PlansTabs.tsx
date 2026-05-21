'use client';

import Link from 'next/link';
import { Shield } from '@phosphor-icons/react';
import { PLUS_TIERS, type TierData } from '@/lib/constants';
import { QuotationCalculator } from '@/components/QuotationCalculator';

function TierRow({ tier }: { tier: TierData }) {
  const topClass = 'hover:bg-[#f3cc20]/5 bg-[#f3cc20]/[0.03]';
  const normalClass = 'hover:bg-white/[0.03]';

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
  return (
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
            <TierRow key={tier.name} tier={tier} />
          ))}
        </div>
      </div>
      <Link
        href="/signup?plan=plus"
        className="flex items-center justify-center gap-2 w-full bg-[#f3cc20] text-[#191c1f] font-bold py-3.5 rounded-full hover:bg-[#c9a800] transition-all text-sm"
      >
        <Shield size={16} /> Get started with Plus Plan
      </Link>

      <div className="mt-6 flex flex-col sm:flex-row gap-4 text-xs text-white/30 border-t border-white/10 pt-6">
        <span className="flex items-center gap-1.5">⏱ 6-month waiting period (natural death)</span>
        <span className="flex items-center gap-1.5">💰 Cashback paid 5th of month 4</span>
        <span className="flex items-center gap-1.5">🔄 Renew by month 11 to stay active</span>
      </div>

      <QuotationCalculator />
    </div>
  );
}
