'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import NextImage from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bell, User, Coins, Users, PhoneCall, ShareNetwork,
  CheckCircle, Warning, SignOut, TrendUp, Gift, UserPlus,
  CreditCard, ArrowRight, Copy, WhatsappLogo, Lock, Camera, Printer,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  logoutUser, markNotificationRead, formatDate,
  recordActivationPayment, getReferralStats, isCampaignActive,
  requestWithdrawal, getUserWithdrawal, recordLinkShare, upgradeGenerosityStep,
  getUserTrio, submitIdentitySelfie,
} from '@/lib/firebase-service';
import type { ReferralStats } from '@/lib/firebase-service';
import type { Withdrawal, Trio } from '@/lib/types';
import type { AppNotification, UserData } from '@/lib/types';
import type { Timestamp } from 'firebase/firestore';
import { PLUS_TIERS, GOLD_TIERS, ACTIVATION_AMOUNT, SHARE_MIN_WITHDRAWAL, GENEROSITY_STEPS } from '@/lib/constants';


function toDate(value: Timestamp | null | undefined): Date | null {
  if (!value) return null;
  return typeof value.toDate === 'function' ? value.toDate() : new Date(value as unknown as string);
}

function localDate(value: Timestamp | null | undefined): string {
  const d = toDate(value);
  if (!d) return '-';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getActivationFee(tierName: string, planType: 'plus' | 'gold'): number {
  const tiers = planType === 'gold' ? GOLD_TIERS : PLUS_TIERS;
  return tiers.find((t) => t.name === tierName)?.feeAmount ?? ACTIVATION_AMOUNT;
}

function getTierCover(tierName: string, planType: 'plus' | 'gold'): string {
  const tiers = planType === 'gold' ? GOLD_TIERS : PLUS_TIERS;
  return tiers.find((t) => t.name === tierName)?.cover ?? '-';
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

function previousBusinessDay(date: Date): Date {
  const next = new Date(date);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() - 1);
  }
  return next;
}

function formatCurrency(value: number): string {
  return `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
}

function formatReferralDate(value: Date | Timestamp | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : value.toDate();
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function getCurrentShareRewardAmount(shareCount = 0): number {
  const nextShare = shareCount + 1;
  if (nextShare >= 41) return 5;
  if (nextShare >= 31) return 4;
  if (nextShare >= 21) return 3;
  if (nextShare >= 11) return 2;
  return 1;
}

function getCashbackSchedule(activationDate: Date, amount: number) {
  return [3, 6, 9, 12].map((monthOffset, index) => {
    const maturity = addMonths(activationDate, monthOffset);
    const payDate = previousBusinessDay(new Date(maturity.getFullYear(), maturity.getMonth() + 1, 5));
    return {
      label: `Cashback ${index + 1}`,
      earnedPeriod: `${index * 13 + 1}-${(index + 1) * 13} weeks`,
      amount: amount * 0.2,
      payDate,
    };
  });
}

function getGoldWeeklySchedule(activationDate: Date, amount: number) {
  const weeklyAmount = amount * 0.025;
  return Array.from({ length: 52 }, (_, i) => ({
    week: i + 1,
    date: addDays(activationDate, (i + 1) * 7),
    amount: weeklyAmount,
  }));
}

function resizeSelfie(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image.'));
      img.onload = () => {
        const maxWidth = 720;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function TierProgressBar({ stats }: { stats: ReferralStats }) {
  const paid = stats.paid;
  const progress = Math.round((paid / Math.max(stats.total, 1)) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-white/50 mb-1.5">
        <span>{stats.tier} · {stats.commissionRate}% of activation fee</span>
        <span>{paid}/{stats.total} activated</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-2 bg-gradient-to-r from-[#f3cc20] to-[#c9a800] rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading, refreshUserData } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<Withdrawal | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountHolder: '', accountType: 'Cheque' as 'Cheque' | 'Savings' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [userTrio, setUserTrio] = useState<Trio | null>(null);
  const [selfieSubmitting, setSelfieSubmitting] = useState(false);
  const [selfieError, setSelfieError] = useState('');
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshUserData();
      getReferralStats(user.uid).then(setReferralStats);
      getUserWithdrawal(user.uid).then(setPendingWithdrawal);
      getUserTrio(user.uid).then(setUserTrio);
    }
  }, [user, refreshUserData]);

  // Handle Yoco payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    const checkoutId = searchParams.get('checkoutId');
    
    if (payment === 'cancelled') {
      setActivationError('Payment was cancelled. Please try again.');
    }
    // Success is handled by webhook or we can verify here if needed
  }, [searchParams]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleMarkAllRead() {
    for (const n of notifications) await markNotificationRead(n.id);
    setNotifications([]);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await logoutUser();
    router.push('/');
  }

  async function handleActivate() {
    if (!user || !userData) return;
    setActivationError('');
    if (userData.identityVerificationStatus !== 'approved') {
      setActivationError('Please complete selfie verification before activating your cover.');
      return;
    }
    setActivating(true);
    const u = userData as UserData;
    const fee = getActivationFee(u.tier, u.planType);

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInCents: fee * 100,
          userId: user.uid,
          tier: u.tier,
          planType: u.planType,
        }),
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setActivationError(data.error || 'Failed to initialize payment. Please try again.');
        setActivating(false);
        return;
      }

      // Redirect to Yoco hosted checkout
      window.location.href = data.redirectUrl;
    } catch {
      setActivationError('Something went wrong. Please contact support.');
      setActivating(false);
    }
  }

  async function handleWithdraw() {
    if (!user || !userData) return;
    setWithdrawError('');
    const { bankName, accountNumber, accountHolder, accountType } = bankDetails;
    if (!bankName || !accountNumber || !accountHolder) {
      setWithdrawError('Please fill in all bank details.');
      return;
    }
    const u = userData as UserData;
    const refEarnings = u.totalEarnings || 0;
    const shareEarnings = (u.shareEarnings || 0) >= SHARE_MIN_WITHDRAWAL ? (u.shareEarnings || 0) : 0;
    const amount = refEarnings + shareEarnings;

    if (amount <= 0) {
      if ((u.shareEarnings || 0) > 0 && (u.shareEarnings || 0) < SHARE_MIN_WITHDRAWAL) {
        setWithdrawError(`Link share earnings require a minimum of R${SHARE_MIN_WITHDRAWAL} to withdraw.`);
      }
      return;
    }
    setWithdrawing(true);
    const result = await requestWithdrawal(user.uid, u.fullName, amount, { bankName, accountNumber, accountHolder, accountType });
    if (!result.success) {
      setWithdrawError(result.error || 'Request failed.');
    } else {
      const w = await getUserWithdrawal(user.uid);
      setPendingWithdrawal(w);
      setShowWithdrawForm(false);
    }
    setWithdrawing(false);
  }

  function copyReferralLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    if (user) recordLinkShare(user.uid);
  }

  function handleShareClick() {
    if (user) recordLinkShare(user.uid);
  }

  async function handleUpgrade() {
    if (!user) return;
    const res = await upgradeGenerosityStep(user.uid);
    if (!res.success) alert(res.error);
    else refreshUserData();
  }

  async function handleSelfieFile(file: File | null) {
    if (!user || !file) return;
    setSelfieSubmitting(true);
    setSelfieError('');
    try {
      const selfieDataUrl = await resizeSelfie(file);
      const result = await submitIdentitySelfie(user.uid, selfieDataUrl);
      if (!result.success) {
        setSelfieError(result.error || 'Could not submit selfie. Please try again.');
      } else {
        await refreshUserData();
      }
    } catch (err) {
      setSelfieError(err instanceof Error ? err.message : 'Could not submit selfie. Please try again.');
    }
    setSelfieSubmitting(false);
    if (selfieInputRef.current) selfieInputRef.current.value = '';
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#191c1f] flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="min-h-screen bg-[#111315] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-white font-bold text-xl mb-2">Connection Issue</h2>
        <p className="text-white/40 text-sm mb-6 max-w-xs">
          We couldn't load your profile. This is usually due to a network issue or the database being offline.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#f3cc20] text-dark font-bold px-6 py-2 rounded-full text-sm"
          >
            Retry
          </button>
          <button 
            onClick={handleSignOut}
            className="border border-white/10 text-white/40 px-6 py-2 rounded-full text-sm hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const u = userData as UserData;
  const activationDate = toDate(u.activationDate);
  const renewalDate = activationDate
    ? new Date(new Date(activationDate).setMonth(activationDate.getMonth() + 12))
    : null;
  const accidentalMaturityDate = activationDate ? addDays(activationDate, 5) : null;
  const naturalMaturityDate = activationDate ? addMonths(activationDate, 6) : null;

  let cashbackProgress = 0;
  let cashbackLabel = 'Not activated';
  let cashbackDateStr = '-';
  if (u.isActivated && activationDate) {
    const daysActive = Math.max(0, Math.floor((Date.now() - activationDate.getTime()) / 86400000));
    cashbackProgress = Math.min(100, Math.floor((daysActive / 120) * 100));
    cashbackLabel = `Day ${daysActive} of 120`;
    const cbDate = new Date(activationDate);
    cbDate.setMonth(cbDate.getMonth() + 3);
    cbDate.setDate(5);
    cashbackDateStr = cbDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const waitingEnd = activationDate
    ? new Date(new Date(activationDate).setMonth(activationDate.getMonth() + 6))
    : null;

  const familyMembers = [
    { name: `${u.fullName || 'You'} (main member)`, label: u.tier || 'Member' },
    ...(u.beneficiary?.name ? [{ name: u.beneficiary.name, label: `Beneficiary · ${u.beneficiary.relation || ''}` }] : []),
    ...(u.spouse?.firstName ? [{ name: `${u.spouse.firstName} ${u.spouse.surname || ''}`, label: 'Spouse' }] : []),
    ...(u.dependents || []).filter((d) => d.name).map((d) => ({ name: d.name, label: `Dependent · ${d.relation || 'Child'}` })),
    ...(u.extendedFamily?.name ? [{ name: u.extendedFamily.name, label: 'Extended family' }] : []),
  ];

  const iconMap: Record<string, React.ReactNode> = {
    joined: <UserPlus size={14} className="text-sky-300" />,
    paid: <Coins size={14} className="text-[#f3cc20]" />,
    tier_up: <TrendUp size={14} className="text-[#00a87e]" />,
    reward_ready: <Gift size={14} className="text-[#f3cc20]" />,
    identity: <Camera size={14} className="text-sky-300" />,
  };

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${u.referralCode}`
    : `https://godirect247.co.za/signup?ref=${u.referralCode}`;

  const fee = getActivationFee(u.tier, u.planType);
  const coverTaken = getTierCover(u.tier, u.planType);
  const campaignActive = isCampaignActive();
  const identityStatus = u.identityVerificationStatus || 'not_started';
  const identityApproved = identityStatus === 'approved';
  const identitySubmitted = identityStatus === 'submitted';
  const identityRejected = identityStatus === 'rejected';

  const step1Done = u.isActivated;
  const step2Done = (referralStats?.paid ?? 0) >= 2;
  const rewardReleaseDate = toDate(u.rewardReleaseDate);
  const step3Done = !!(rewardReleaseDate && new Date() > rewardReleaseDate);

  const waLink = `https://wa.me/?text=${encodeURIComponent(
    `I'm using GoDirect247 for affordable funeral cover + cashback rewards. Join using my link: ${referralLink}`
  )}`;
  const cashbackSchedule = activationDate ? getCashbackSchedule(activationDate, fee) : [];
  const goldWeeklySchedule = activationDate && u.planType === 'gold' ? getGoldWeeklySchedule(activationDate, fee) : [];
  const weeklyGoldAmount = fee * 0.025;

  return (
    <div className="bg-[#191c1f] min-h-screen text-white">

      {/* Top bar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#191c1f] border-b border-white/10 h-14 flex items-center px-5 gap-3">
        <div className="font-display font-extrabold text-white text-lg">
          Go<span className="text-[#f3cc20]">Direct</span>247
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-all"
            >
              <Bell size={14} className="text-white/70" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e23b4a] rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {Math.min(notifications.length, 99)}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#191c1f] border border-white/15 rounded-2xl shadow-2xl z-[100] max-h-80 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <span className="text-white font-semibold text-sm">Notifications</span>
                  <button onClick={handleMarkAllRead} className="text-[#f3cc20] text-xs font-medium hover:text-[#f3cc20]/80">
                    Mark all read
                  </button>
                </div>
                <div className="overflow-y-auto max-h-64 px-3 py-2 space-y-1">
                  {notifications.length === 0 ? (
                    <p className="text-white/40 text-xs text-center py-6">No new notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {iconMap[n.type] ?? <Bell size={14} className="text-white/50" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs leading-relaxed">{n.message}</p>
                          <p className="text-white/30 text-[10px] mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                        <div className="w-2 h-2 bg-[#f3cc20] rounded-full flex-shrink-0 mt-2" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-[#f3cc20]/20 border border-[#f3cc20]/30 flex items-center justify-center">
            <User size={14} className="text-[#f3cc20]" />
          </div>
        </div>
      </nav>

      {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}

      <div className="pt-14 max-w-lg mx-auto px-4 py-6">
        {/* Greeting */}
        <div className="ani1 mb-6">
          <p className="text-white/40 text-sm">Welcome back,</p>
          <h1 className="font-display font-extrabold text-white text-2xl">
            {u.fullName || 'Member'}
          </h1>
        </div>

        {/* Identity verification card */}
        {!identityApproved && (
          <div className="ani2 bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-[#0682B4]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Camera size={20} className="text-sky-300" />
              </div>
              <div>
                <p className="font-display font-bold text-white text-base">Selfie verification required</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Take a clear selfie to protect your profile before activating your cover.
                </p>
              </div>
            </div>
            {identitySubmitted && (
              <p className="text-[#f3cc20] text-xs mb-3 bg-[#f3cc20]/10 border border-[#f3cc20]/20 rounded-xl px-3 py-2">
                Selfie submitted. GoDirect247 will review it before activation is unlocked.
              </p>
            )}
            {identityRejected && (
              <p className="text-[#e23b4a] text-xs mb-3 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                Your selfie was not approved. Please submit a new clear selfie.
              </p>
            )}
            {selfieError && (
              <p className="text-[#e23b4a] text-xs mb-3 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                {selfieError}
              </p>
            )}
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handleSelfieFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => selfieInputRef.current?.click()}
              disabled={selfieSubmitting}
              className="w-full bg-sky-400/10 border border-sky-300/20 text-sky-200 font-semibold py-3.5 rounded-xl hover:bg-sky-400/20 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Camera size={16} />
              {selfieSubmitting ? 'Submitting selfie…' : identitySubmitted ? 'Upload a new selfie' : 'Take selfie'}
            </button>
            <p className="text-white/30 text-xs text-center mt-2">
              One member account can still manage multiple packages after approval.
            </p>
          </div>
        )}

        {/* Activation card */}
        {!u.isActivated && (
          <div className="ani2 bg-[#f3cc20]/10 border border-[#f3cc20]/40 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f3cc20]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard size={20} className="text-[#f3cc20]" />
              </div>
              <div>
                <p className="font-display font-bold text-white text-base">Activate your cover</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Pay R{fee.toLocaleString()} to start your {u.tier} funeral cover
                </p>
              </div>
            </div>
            {activationError && (
              <p className="text-[#e23b4a] text-xs mb-3 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                {activationError}
              </p>
            )}
            <button
              onClick={handleActivate}
              disabled={activating || !identityApproved}
              className="w-full bg-[#f3cc20] text-[#191c1f] font-display font-bold py-3.5 rounded-xl hover:bg-[#c9a800] transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {activating ? 'Processing…' : (
                <>Pay Now (R{fee.toLocaleString()}) <ArrowRight size={16} /></>
              )}
            </button>
            <p className="text-white/30 text-xs text-center mt-2">
              {identityApproved ? 'Secured by Yoco · Card payments accepted' : 'Selfie verification approval required before payment'}
            </p>
          </div>
        )}

        {/* Policy card */}
        <div className="ani2 bg-[#f3cc20] rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[#191c1f]/60 text-xs font-semibold uppercase tracking-wide">Your plan</p>
              <p className="font-display font-extrabold text-[#191c1f] text-xl mt-0.5">{u.tier || '-'}</p>
            </div>
            <span className="bg-[#191c1f]/15 text-[#191c1f] font-bold text-xs px-3 py-1.5 rounded-full">
              {u.isActivated ? 'Active' : 'Pending'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[#191c1f]/70 text-xs">
            <div>
              <p className="font-semibold text-[#191c1f]">{localDate(u.activationDate)}</p>
              <p>Activation date</p>
            </div>
            <div>
              <p className="font-semibold text-[#191c1f]">
                {renewalDate
                  ? renewalDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '-'}
              </p>
              <p>Renewal due</p>
            </div>
          </div>
        </div>

        {/* Policy certificate */}
        {u.isActivated && activationDate && (
          <div className="ani2 bg-white text-[#191c1f] rounded-2xl p-5 mb-4 print:rounded-none print:p-0 print:shadow-none">
            <div id="policy-certificate" className="relative overflow-hidden border border-[#d7dde2] rounded-xl p-5 print:border-0 print:rounded-none">
              <NextImage
                src="/godirect247-logo.jpg"
                alt=""
                width={256}
                height={222}
                className="pointer-events-none absolute bottom-8 right-8 w-64 max-w-[55%] rounded-full opacity-[0.055] print:opacity-[0.07]"
              />
              <div className="flex items-start justify-between gap-4 border-b border-[#d7dde2] pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <NextImage
                      src="/godirect247-logo.jpg"
                      alt="GoDirect247"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover bg-white border border-[#e4e8eb]"
                    />
                    <div>
                      <div className="font-display font-extrabold text-2xl">
                        Go<span className="text-[#c9a800]">Direct</span>247
                      </div>
                      <p className="text-xs text-[#505a63] mt-1">Policy Certificate</p>
                      <p className="text-[10px] text-[#505a63] mt-1">Zarkudu Group · FSP Licence JR 50841</p>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-[#505a63] leading-relaxed max-w-[190px]">
                  <p className="font-bold text-[#191c1f] text-xs mb-1">Contact Details</p>
                  <p>Sandton: 010 003 0789</p>
                  <p>Cape Town: 021 140 8083</p>
                  <p>East London: 014 547 0285</p>
                  <p>WhatsApp: 078 063 8753</p>
                  <p>godirect247.com</p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-extrabold text-xl">Certificate of Cover</h2>
                  <p className="text-xs text-[#505a63]">
                    Issued after activation and subject to the terms and conditions below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="print:hidden bg-[#191c1f] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                {[
                  ['Policy Holder', u.fullName || '-'],
                  ['ID Number', u.idNumber || '-'],
                  ['Email', u.email || '-'],
                  ['Phone', u.phone || '-'],
                  ['Plan', `${u.tier || '-'} (${u.planType === 'gold' ? 'Gold' : 'Plus'} Plan)`],
                  ['Cover Taken', coverTaken],
                  ['Activation Date', localDate(u.activationDate)],
                  ['Renewal Date', renewalDate ? renewalDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'],
                  ['Natural Death Maturity', naturalMaturityDate ? naturalMaturityDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'],
                  ['Accidental Death Maturity', accidentalMaturityDate ? accidentalMaturityDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="border border-[#e4e8eb] rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase font-bold text-[#8d969e]">{label}</p>
                    <p className="font-semibold text-[#191c1f] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="border border-[#e4e8eb] rounded-xl p-3">
                  <p className="text-xs font-bold mb-2">Covered Members</p>
                  <div className="space-y-1.5 text-xs">
                    <p><span className="text-[#8d969e]">Main member:</span> {u.fullName || '-'}</p>
                    {u.spouse?.firstName && (
                      <p><span className="text-[#8d969e]">Spouse:</span> {u.spouse.firstName} {u.spouse.surname || ''}</p>
                    )}
                    {(u.dependents || []).filter((d) => d.name).map((d, i) => (
                      <p key={i}><span className="text-[#8d969e]">Dependent {i + 1}:</span> {d.name} · {d.relation || 'Dependent'}</p>
                    ))}
                    {u.extendedFamily?.name && (
                      <p><span className="text-[#8d969e]">Extended family:</span> {u.extendedFamily.name}</p>
                    )}
                  </div>
                </div>
                <div className="border border-[#e4e8eb] rounded-xl p-3">
                  <p className="text-xs font-bold mb-2">Beneficiary</p>
                  <div className="space-y-1.5 text-xs">
                    <p><span className="text-[#8d969e]">Name:</span> {u.beneficiary?.name || '-'}</p>
                    <p><span className="text-[#8d969e]">ID Number:</span> {u.beneficiary?.idNumber || '-'}</p>
                    <p><span className="text-[#8d969e]">Relation:</span> {u.beneficiary?.relation || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border border-[#e4e8eb] rounded-xl p-3 mb-4">
                <p className="text-xs font-bold mb-2">20% Cashback Schedule</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  {cashbackSchedule.map((item) => (
                    <div key={item.label} className="bg-[#f4f4f4] rounded-lg p-2">
                      <p className="font-bold text-[#191c1f]">{item.label}</p>
                      <p className="text-[#505a63]">{item.earnedPeriod}</p>
                      <p className="text-[#505a63]">{formatCurrency(item.amount)}</p>
                      <p className="font-semibold">
                        {item.payDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#505a63] mt-2">
                  Cashback is payable after 3 months, on the 5th of the 4th month, or earlier when the 5th falls on a weekend or public holiday.
                </p>
              </div>

              {u.planType === 'gold' && (
                <div className="border border-[#e4e8eb] rounded-xl p-3 mb-4">
                  <p className="text-xs font-bold mb-2">Gold Member Weekly Earnings</p>
                  <p className="text-[10px] text-[#505a63] mb-2">
                    Gold members earn 2.5% weekly for 52 weeks. Weekly earning shown: {formatCurrency(weeklyGoldAmount)}.
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-[9px] max-h-32 overflow-y-auto print:max-h-none print:overflow-visible">
                    {goldWeeklySchedule.map((item) => (
                      <div key={item.week} className="bg-[#f4f4f4] rounded p-1.5">
                        <p className="font-bold">W{item.week}</p>
                        <p>{item.date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}</p>
                        <p>{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-[#e4e8eb] rounded-xl p-3 text-[10px] text-[#505a63] leading-relaxed">
                <p className="text-xs font-bold text-[#191c1f] mb-1">Terms and Conditions</p>
                <p>
                  A 6-month waiting period applies for natural death. Accidental death cover matures after 5 days.
                  A 12-month waiting period applies for suicide. Cashback is payable on the 5th day of the 4th month
                  from activation, or earlier if the 5th is on a weekend or public holiday. Gold Plan weekly earnings
                  are calculated at 2.5% weekly for 52 weeks where applicable. Renewal must be completed by the
                  11th month to avoid policy lapse. Early withdrawal is payable at 10% and the remaining amount
                  lapses. No advance requests for cashback or payout will be granted. Activation date means the
                  date the member paid for the policy, not the date the application was submitted. Claims are processed
                  within 24-48 hours after all required documents are received.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cashback tracker */}
        <div className="ani2 bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins size={20} className="text-[#f3cc20]" />
              <span className="font-display font-bold text-white text-base">Cashback tracker</span>
            </div>
            <span className="text-white/40 text-xs">
              {u.planType ? `${u.planType.charAt(0).toUpperCase()}${u.planType.slice(1)} Plan` : '-'}
            </span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Progress to cashback</span>
              <span className="text-white font-semibold">{cashbackLabel}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-2 bg-[#f3cc20] rounded-full transition-all" style={{ width: `${cashbackProgress}%` }} />
            </div>
          </div>
          <p className="text-white/50 text-xs">
            First cashback on{' '}
            <span className="text-white font-semibold">{cashbackDateStr}</span>{' '}
            (5th of your 4th month)
          </p>
        </div>

          {/* Generosity Rewards Roadmap */}
          <div className="bg-gradient-to-br from-[#f3cc20]/20 to-transparent border border-[#f3cc20]/30 rounded-2xl p-5 mb-4 shadow-lg shadow-[#f3cc20]/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f3cc20] flex items-center justify-center">
                <TrendUp size={18} weight="bold" className="text-dark" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-white text-base leading-none">Steps To The Top</h3>
                <p className="text-[#f3cc20] text-[10px] font-bold uppercase tracking-widest mt-1">Generosity Roadmap</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/40 text-[10px] uppercase font-semibold mb-1">Current Status</p>
                  <p className="text-white font-display font-bold text-lg">{u.generosityStep ? GENEROSITY_STEPS[u.generosityStep - 1].name : 'Not Started'}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[10px] uppercase font-semibold mb-1">Harvest Balance</p>
                  <p className="text-[#f3cc20] font-display font-bold text-2xl leading-none">R{(u.harvestBalance || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Team / Trio */}
              {userTrio && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-[10px] uppercase font-semibold mb-2">My Team</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#f3cc20]/20 flex items-center justify-center">
                      <User size={12} className="text-[#f3cc20]" />
                    </div>
                    <span className="text-white text-xs font-semibold">{userTrio.leaderName} (Leader)</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {userTrio.memberNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00a87e]" />
                        <span className="text-white/70 text-xs">{name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-white/30 text-[9px] mt-2">Team step: {userTrio.step} of 9</p>
                </div>
              )}

              {/* Downstream Rewards */}
              {(u.downstreamRewards || 0) > 0 && (
                <div className="bg-[#00a87e]/10 border border-[#00a87e]/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[#00a87e] text-[10px] uppercase font-semibold">Team Rewards</p>
                    <p className="text-white/60 text-[10px]">From members reaching Diamond Gold</p>
                  </div>
                  <p className="text-[#00a87e] font-display font-bold text-lg">R{(u.downstreamRewards || 0).toLocaleString()}</p>
                </div>
              )}

              {u.generosityStep !== undefined && u.generosityStep < GENEROSITY_STEPS.length && (
                <div className="pt-2">
                  <p className="text-white/60 text-xs mb-3 italic">
                    "Let us not become weary in doing good..."
                  </p>
                  <button 
                    onClick={handleUpgrade}
                    className="w-full bg-[#f3cc20] hover:bg-[#f3cc20]/90 text-dark font-display font-black py-3 rounded-xl transition-all shadow-xl shadow-[#f3cc20]/20 flex items-center justify-center gap-2"
                  >
                    <span>Seed {GENEROSITY_STEPS[u.generosityStep].name}</span>
                    <span className="text-[10px] bg-dark/10 px-2 py-0.5 rounded-md">R{GENEROSITY_STEPS[u.generosityStep].seed}</span>
                  </button>
                  <p className="text-white/30 text-[10px] text-center mt-2 uppercase tracking-tighter">
                    Move to the next level and increase your harvest
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Referral Hub Card */}

        {/* Referral Hub */}
        <div className="ani3 bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShareNetwork size={20} className="text-[#f3cc20]" />
              <span className="font-display font-bold text-white text-base">Referral Hub</span>
            </div>
            {campaignActive && (
              <span className="bg-[#00a87e]/20 text-[#00a87e] text-xs font-semibold px-2.5 py-1 rounded-full">
                Campaign live
              </span>
            )}
          </div>

          {/* Link row */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 min-w-0">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Your link</p>
              <p className="text-white text-xs font-mono truncate">{referralLink}</p>
            </div>
            <button
              onClick={() => copyReferralLink(referralLink)}
              className="flex-shrink-0 w-10 h-10 mt-auto bg-white/10 border border-white/15 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all"
              title="Copy link"
            >
              {copied
                ? <CheckCircle size={16} className="text-[#00a87e]" />
                : <Copy size={16} className="text-white/60" />}
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleShareClick}
              className="flex-shrink-0 w-10 h-10 mt-auto bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl flex items-center justify-center hover:bg-[#25D366]/20 transition-all"
              title="Share on WhatsApp"
            >
              <WhatsappLogo size={16} className="text-[#25D366]" />
            </a>
          </div>

          {/* Generosity Reward Stats */}
          <div className="bg-[#f3cc20]/5 border border-[#f3cc20]/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-xs uppercase tracking-wider">Generosity Rewards</p>
              <span className="text-[#f3cc20] text-[10px] font-bold bg-[#f3cc20]/10 px-2 py-0.5 rounded-full">
                R{getCurrentShareRewardAmount(u.shareCount || 0)} next share
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-white/40 text-[10px] mb-0.5">Total Shares</p>
                <p className="font-display font-bold text-white text-xl leading-none">{u.shareCount || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[10px] mb-0.5">Share Earnings</p>
                <p className="font-display font-bold text-[#f3cc20] text-xl leading-none">R{(u.shareEarnings || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[9px] font-semibold text-white/45">
              {['1-10 R1', '11-20 R2', '21-30 R3', '31-40 R4', '41-50 R5'].map((label) => (
                <span key={label} className="rounded-md bg-white/5 px-1.5 py-1">{label}</span>
              ))}
            </div>
            {u.shareEarnings && u.shareEarnings < SHARE_MIN_WITHDRAWAL ? (
              <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#f3cc20]/40 rounded-full" 
                  style={{ width: `${Math.min(100, (u.shareEarnings / SHARE_MIN_WITHDRAWAL) * 100)}%` }} 
                />
              </div>
            ) : null}
            {u.shareEarnings && u.shareEarnings < SHARE_MIN_WITHDRAWAL && (
              <p className="text-white/30 text-[9px] mt-1.5 text-center">
                R{SHARE_MIN_WITHDRAWAL} minimum withdrawal · R{(SHARE_MIN_WITHDRAWAL - u.shareEarnings).toFixed(2)} to go
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Referred', value: referralStats?.total ?? '—' },
              { label: 'Activated', value: referralStats?.paid ?? '—' },
              {
                label: 'Potential',
                value: referralStats != null ? formatCurrency(referralStats.potentialEarnings || 0) : '—',
              },
              {
                label: 'Activated earnings',
                value: referralStats != null ? formatCurrency(referralStats.activatedEarnings || 0) : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className="font-display font-bold text-white text-lg">{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* Commission tier progress */}
          {referralStats && <TierProgressBar stats={referralStats} />}
          {referralStats && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/35 uppercase font-semibold text-[10px]">Signup commission</p>
                  <p className="text-white font-bold mt-0.5">5% on signup</p>
                </div>
                <div className="text-right">
                  <p className="text-white/35 uppercase font-semibold text-[10px]">Due payment</p>
                  <p className="text-[#f3cc20] font-bold mt-0.5">{formatReferralDate(referralStats.nextPayDate)}</p>
                </div>
              </div>
              <p className="mt-2 text-white/35 text-[10px] leading-relaxed">
                Activation commission is 10% of the activation fee paid. Current-week referral payments close at 13:00 on Friday and are due the following Friday. Signups have 30 days to activate; after 30 days, the account may be deactivated and closed. The R150 Plus Plan handshake referral commission runs from 25 May to 30 September 2026.
              </p>
            </div>
          )}

          {/* Pre-Launch Special tracker */}
          {campaignActive && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Gift size={16} className="text-[#f3cc20]" />
                <p className="text-white font-semibold text-sm">Pre-Launch Special · R3,000 reward</p>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    label: 'You activated',
                    done: step1Done,
                    sub: step1Done ? localDate(u.activationDate) : 'Complete activation above',
                  },
                  {
                    label: '2 referrals activated',
                    done: step2Done,
                    sub: `${referralStats?.paid ?? 0}/2 paid`,
                  },
                  {
                    label: '6-week lock passed',
                    done: step3Done,
                    sub: rewardReleaseDate
                      ? localDate(u.rewardReleaseDate)
                      : 'Unlocks 6 weeks after activation',
                  },
                ].map(({ label, done, sub }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                        done ? 'bg-[#00a87e] text-white' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {done ? <CheckCircle size={14} weight="fill" /> : <Lock size={12} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${done ? 'text-white' : 'text-white/50'}`}>
                        {label}
                      </p>
                      <p className="text-white/30 text-[10px]">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {step1Done && step2Done && step3Done && (
                <div className="mt-3 bg-[#00a87e]/10 border border-[#00a87e]/20 rounded-xl p-3 text-center">
                  <p className="text-[#00a87e] font-semibold text-sm">
                    All steps complete! Reward pending admin release.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Earnings & withdrawal */}
        {((u.totalEarnings || 0) > 0 || pendingWithdrawal) && (
          <div className="ani3 bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins size={20} className="text-[#00a87e]" />
                <span className="font-display font-bold text-white text-base">Your Earnings</span>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-[#f3cc20] text-xl block leading-none">
                  R{((u.totalEarnings || 0) + (u.shareEarnings || 0)).toLocaleString()}
                </span>
                <span className="text-white/30 text-[10px]">
                  R{u.totalEarnings || 0} Ref · R{u.shareEarnings || 0} Share
                </span>
              </div>
            </div>

            {pendingWithdrawal ? (
              <div className="bg-[#f3cc20]/10 border border-[#f3cc20]/20 rounded-xl p-3 text-center">
                <p className="text-[#f3cc20] text-xs font-semibold">Withdrawal pending admin approval</p>
                <p className="text-white/40 text-xs mt-0.5">R{pendingWithdrawal.amount} · {pendingWithdrawal.bankName}</p>
              </div>
            ) : !showWithdrawForm ? (
              <button
                onClick={() => { setShowWithdrawForm(true); setBankDetails(b => ({ ...b, accountHolder: u.fullName })); }}
                className="w-full bg-[#00a87e]/10 border border-[#00a87e]/20 text-[#00a87e] font-semibold text-sm py-3 rounded-xl hover:bg-[#00a87e]/20 transition-all"
              >
                Request Withdrawal
              </button>
            ) : (
              <div className="space-y-3">
                <select
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails((b) => ({ ...b, bankName: e.target.value }))}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm"
                >
                  <option value="" className="bg-[#191c1f]">Select bank…</option>
                  {['ABSA', 'Capitec', 'FNB', 'Nedbank', 'Standard Bank', 'TymeBank', 'African Bank', 'Other'].map((b) => (
                    <option key={b} value={b} className="bg-[#191c1f]">{b}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={bankDetails.accountHolder}
                  onChange={(e) => setBankDetails((b) => ({ ...b, accountHolder: e.target.value }))}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm"
                />
                <input
                  type="text"
                  placeholder="Account number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails((b) => ({ ...b, accountNumber: e.target.value }))}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  {(['Cheque', 'Savings'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBankDetails((b) => ({ ...b, accountType: t }))}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        bankDetails.accountType === t
                          ? 'bg-[#00a87e]/20 border-[#00a87e]/40 text-[#00a87e]'
                          : 'bg-white/5 border-white/15 text-white/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {withdrawError && (
                  <p className="text-[#e23b4a] text-xs bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                    {withdrawError}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setShowWithdrawForm(false); setWithdrawError(''); }}
                    className="py-3 rounded-xl border border-white/15 text-white/50 text-sm hover:border-white/30 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="py-3 rounded-xl bg-[#00a87e] text-white font-bold text-sm hover:bg-[#008c69] transition-all disabled:opacity-60"
                  >
                    {withdrawing ? 'Submitting…' : `Withdraw R${((u.totalEarnings || 0) + ((u.shareEarnings || 0) >= SHARE_MIN_WITHDRAWAL ? (u.shareEarnings || 0) : 0)).toLocaleString()}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Family covered */}
        <div className="ani3 bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-sky-300" />
              <span className="font-display font-bold text-white text-base">Family covered</span>
            </div>
            <span className="bg-[#00a87e]/20 text-[#00a87e] text-xs font-semibold px-2.5 py-1 rounded-full">
              {familyMembers.length} members
            </span>
          </div>
          <div className="space-y-3">
            {familyMembers.map((f, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    <User size={14} className="text-white/60" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{f.name}</p>
                    <p className="text-white/40 text-xs">{f.label}</p>
                  </div>
                </div>
                <CheckCircle size={18} className="text-[#00a87e]" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="ani4 grid grid-cols-2 gap-3 mb-4">
          <a
            href="tel:0780187995"
            className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 text-left hover:border-white/20 transition-all"
          >
            <PhoneCall size={24} className="text-sky-300 mb-3 block" />
            <p className="font-display font-bold text-white text-sm">Contact support</p>
            <p className="text-white/40 text-xs mt-0.5">078 018 7995</p>
          </a>
          <button
            onClick={() => copyReferralLink(referralLink)}
            className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 text-left hover:border-white/20 transition-all"
          >
            <ShareNetwork size={24} className="text-[#f3cc20] mb-3 block" />
            <p className="font-display font-bold text-white text-sm">Refer &amp; earn</p>
            <p className="text-white/40 text-xs mt-0.5">Copy referral link</p>
          </button>
        </div>

        {/* Waiting period */}
        {waitingEnd && (
          <div className="ani4 bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Warning size={20} className="text-[#f3cc20] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm mb-1">Waiting period active</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Your 6-month natural death waiting period ends on{' '}
                  <span className="text-white font-semibold">
                    {waitingEnd.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  . Accidental death is covered immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Referral code */}
        {u.referralCode && (
          <div className="ani4 bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-1">Your referral code</p>
            <p className="text-[#f3cc20] font-display font-bold text-xl tracking-widest">{u.referralCode}</p>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full border border-white/10 text-white/40 text-sm py-3.5 rounded-xl hover:border-white/20 hover:text-white/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <SignOut size={16} /> {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#191c1f] flex items-center justify-center"><div className="text-white/40 text-sm">Loading…</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
