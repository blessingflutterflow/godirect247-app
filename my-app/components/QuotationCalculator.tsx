'use client';

import { useMemo, useState } from 'react';
import { CalendarBlank, Coins, Crown, Shield, TrendUp } from '@phosphor-icons/react';
import { GOLD_TIERS, PLUS_TIERS, type TierData } from '@/lib/constants';

type PlanMode = 'gold' | 'plus';

const PLUS_QUOTATION_TIERS = PLUS_TIERS.filter((tier) => tier.name !== 'Superior Plus');

function formatCurrency(value: number): string {
  return `R${value.toLocaleString('en-ZA', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatInputDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatInputTime(value: Date): string {
  return value.toTimeString().slice(0, 5);
}

function parseActivation(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue || '00:00'}:00`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dateKey(date: Date): string {
  return formatInputDate(date);
}

function getSouthAfricanPublicHolidayKeys(year: number): Set<string> {
  const holidays = [
    new Date(year, 0, 1),
    new Date(year, 2, 21),
    new Date(year, 3, 27),
    new Date(year, 4, 1),
    new Date(year, 5, 16),
    new Date(year, 7, 9),
    new Date(year, 8, 24),
    new Date(year, 11, 16),
    new Date(year, 11, 25),
    new Date(year, 11, 26),
  ];

  const easter = getEasterSunday(year);
  holidays.push(addDays(easter, -2), addDays(easter, 1));

  const keys = new Set(holidays.map(dateKey));
  holidays.forEach((holiday) => {
    if (holiday.getDay() === 0) {
      const observed = addDays(holiday, 1);
      if (!keys.has(dateKey(observed))) {
        keys.add(dateKey(observed));
      }
    }
  });

  return keys;
}

function isPublicHoliday(date: Date): boolean {
  return getSouthAfricanPublicHolidayKeys(date.getFullYear()).has(dateKey(date));
}

function previousBusinessDay(date: Date): Date {
  const next = new Date(date);
  while (next.getDay() === 0 || next.getDay() === 6 || isPublicHoliday(next)) {
    next.setDate(next.getDate() - 1);
  }
  return next;
}

function nextFridayOnOrAfter(date: Date): Date {
  const next = new Date(date);
  const daysUntilFriday = (5 - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysUntilFriday);
  return next;
}

function getFirstGoldPayoutDate(activationDate: Date): Date {
  const isFridayAfterCutoff =
    activationDate.getDay() === 5 &&
    (activationDate.getHours() > 23 || (activationDate.getHours() === 23 && activationDate.getMinutes() > 45));
  const minimumDate = addDays(activationDate, isFridayAfterCutoff ? 14 : 7);
  return nextFridayOnOrAfter(minimumDate);
}

function getCashbackSchedule(activationDate: Date, feeAmount: number) {
  return [3, 6, 9, 12].map((monthOffset, index) => {
    const periodEnd = addMonths(activationDate, monthOffset);
    const payDate = previousBusinessDay(new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 5));
    return {
      label: `Quarter ${index + 1}`,
      period: `Months ${index * 3 + 1}-${(index + 1) * 3}`,
      amount: feeAmount * 0.2,
      payDate,
    };
  });
}

function getGoldWeeklySummary(activationDate: Date, feeAmount: number) {
  const firstPayDate = getFirstGoldPayoutDate(activationDate);
  const weeklyAmount = feeAmount * 0.025;
  return {
    weeklyAmount,
    firstPayDate,
    lastPayDate: addDays(firstPayDate, 51 * 7),
    totalWeekly: weeklyAmount * 52,
  };
}

function StatCard({ label, value, tone = 'light' }: { label: string; value: string; tone?: 'light' | 'gold' }) {
  return (
    <div className={tone === 'gold' ? 'rounded-xl bg-[#f3cc20] p-4 text-[#191c1f]' : 'rounded-xl bg-white/[0.06] p-4'}>
      <p className={tone === 'gold' ? 'text-xs font-semibold text-[#191c1f]/60' : 'text-xs font-semibold text-white/40'}>
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

function TierOption({ tier }: { tier: TierData }) {
  return (
    <option value={tier.name}>
      {tier.name} - {tier.fee} activation / {tier.cover} cover
    </option>
  );
}

export function QuotationCalculator() {
  const now = new Date();
  const [mode, setMode] = useState<PlanMode>('gold');
  const [goldTierName, setGoldTierName] = useState(GOLD_TIERS[0].name);
  const [plusTierName, setPlusTierName] = useState(PLUS_QUOTATION_TIERS[0].name);
  const [activationDate, setActivationDate] = useState(formatInputDate(now));
  const [activationTime, setActivationTime] = useState(formatInputTime(now));

  const selectedTier = useMemo(() => {
    const tiers = mode === 'gold' ? GOLD_TIERS : PLUS_QUOTATION_TIERS;
    const tierName = mode === 'gold' ? goldTierName : plusTierName;
    return tiers.find((tier) => tier.name === tierName) ?? tiers[0];
  }, [goldTierName, mode, plusTierName]);

  const quote = useMemo(() => {
    const activatedAt = parseActivation(activationDate, activationTime);
    const cashbackSchedule = getCashbackSchedule(activatedAt, selectedTier.feeAmount);
    const cashbackTotal = cashbackSchedule.reduce((total, item) => total + item.amount, 0);
    const weekly = mode === 'gold' ? getGoldWeeklySummary(activatedAt, selectedTier.feeAmount) : null;
    const totalEarnings = cashbackTotal + (weekly?.totalWeekly ?? 0);

    return { activatedAt, cashbackSchedule, cashbackTotal, weekly, totalEarnings };
  }, [activationDate, activationTime, mode, selectedTier]);

  return (
    <div className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f3cc20]/25 bg-[#f3cc20]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#f3cc20]">
            <TrendUp size={14} /> Quotation calculator
          </div>
          <h3 className="font-display text-2xl font-extrabold text-white">Estimate package earnings</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            Compare 20% cashback on Plus and Gold packages. Gold quotations also include the 2.5%
            weekly earning payable every Friday for 52 weeks.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => setMode('gold')}
            className={`rounded-full px-4 py-2 transition-all ${
              mode === 'gold' ? 'bg-[#f3cc20] text-[#191c1f]' : 'text-white/50 hover:text-white'
            }`}
          >
            Gold
          </button>
          <button
            type="button"
            onClick={() => setMode('plus')}
            className={`rounded-full px-4 py-2 transition-all ${
              mode === 'plus' ? 'bg-white text-[#191c1f]' : 'text-white/50 hover:text-white'
            }`}
          >
            Plus
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
            {mode === 'gold' ? <Crown size={14} /> : <Shield size={14} />} Package
          </span>
          <select
            value={mode === 'gold' ? goldTierName : plusTierName}
            onChange={(event) =>
              mode === 'gold' ? setGoldTierName(event.target.value) : setPlusTierName(event.target.value)
            }
            className="w-full rounded-xl border border-white/10 bg-[#191c1f] px-4 py-3 text-sm font-semibold text-white"
          >
            {(mode === 'gold' ? GOLD_TIERS : PLUS_QUOTATION_TIERS).map((tier) => (
              <TierOption key={tier.name} tier={tier} />
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
            <CalendarBlank size={14} /> Activation date
          </span>
          <input
            type="date"
            value={activationDate}
            onChange={(event) => setActivationDate(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#191c1f] px-4 py-3 text-sm font-semibold text-white"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
            <CalendarBlank size={14} /> Activation time
          </span>
          <input
            type="time"
            value={activationTime}
            onChange={(event) => setActivationTime(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#191c1f] px-4 py-3 text-sm font-semibold text-white"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Activation fee" value={selectedTier.fee} />
        <StatCard label="Funeral cover" value={selectedTier.cover} />
        <StatCard label="20% cashback total" value={formatCurrency(quote.cashbackTotal)} />
        <StatCard label="Total estimated earnings" value={formatCurrency(quote.totalEarnings)} tone="gold" />
      </div>

      {mode === 'gold' && quote.weekly && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#f3cc20]/20 bg-[#f3cc20]/[0.04] p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#f3cc20]">
              <Coins size={14} /> Weekly Gold payout
            </p>
            <p className="mt-2 font-display text-2xl font-extrabold text-white">
              {formatCurrency(quote.weekly.weeklyAmount)}
            </p>
            <p className="mt-1 text-xs text-white/40">2.5% every Friday for 52 weeks.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">First Friday payout</p>
            <p className="mt-2 text-sm font-bold text-white">{formatDate(quote.weekly.firstPayDate)}</p>
            <p className="mt-1 text-xs text-white/40">Based on the Friday 23:45 activation cutoff.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">52-week Gold total</p>
            <p className="mt-2 text-sm font-bold text-white">{formatCurrency(quote.weekly.totalWeekly)}</p>
            <p className="mt-1 text-xs text-white/40">Last scheduled Friday: {formatDate(quote.weekly.lastPayDate)}.</p>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-white/10 bg-[#191c1f]">
        <div className="grid grid-cols-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white/35">
          <span>Cashback</span>
          <span className="text-center">Amount</span>
          <span className="text-right">Estimated pay date</span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {quote.cashbackSchedule.map((item) => (
            <div key={item.label} className="grid grid-cols-3 items-center px-4 py-3 text-sm">
              <span>
                <span className="font-semibold text-white">{item.label}</span>
                <span className="block text-xs text-white/35">{item.period}</span>
              </span>
              <span className="text-center font-display font-bold text-[#f3cc20]">
                {formatCurrency(item.amount)}
              </span>
              <span className="text-right text-white/60">{formatDate(item.payDate)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-white/35">
        This calculator is for information purposes only and helps customers make well-informed
        decisions. For further information, please contact your RJ, Introducer, or Sales Team at{' '}
        <a href="mailto:support@godirect247.com" className="font-semibold text-[#f3cc20]">
          support@godirect247.com
        </a>
        . Public holiday adjustments use standard South African public holidays.
      </p>
    </div>
  );
}
