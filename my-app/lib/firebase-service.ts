import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserData, Payment, AppNotification, Referral, Reward, Withdrawal, SignUpFormData, Trio, AdditionalPolicy, AdditionalPolicyFormData } from './types';
import {
  ACTIVATION_AMOUNT,
  TOTAL_ACTIVATION,
  REWARD_CASHBACK,
  REWARD_BONUS,
  REWARD_TOTAL,
  REWARD_DELAY_WEEKS,
  CAMPAIGN_END_DATE,
  MAX_DAILY_SHARES,
  GENEROSITY_STEPS,
  PLUS_TIERS,
  GOLD_TIERS,
  ACTIVATION_COMMISSION_RATE,
  PLUS_HANDSHAKE_COMMISSION,
  MAX_MONTHLY_HANDSHAKES,
  HANDSHAKE_START_DATE,
  HANDSHAKE_END_DATE,
} from './constants';

// ── SMS helper ────────────────────────────────────────────────────────────────

function sendSMSNotification(to: string, message: string): void {
  if (typeof window === 'undefined' || !to) return;
  fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  }).catch(() => {});
}

function sendEmailNotification(to: string, subject: string, html: string): void {
  if (typeof window === 'undefined' || !to) return;
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html }),
  }).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatCurrency(value: number): string {
  return `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
}

function getActivationFee(tierName: string, planType: 'plus' | 'gold'): number {
  const tiers = planType === 'gold' ? GOLD_TIERS : PLUS_TIERS;
  return tiers.find((tier) => tier.name === tierName)?.feeAmount ?? ACTIVATION_AMOUNT;
}

function getShareRewardAmount(shareCount: number): number {
  if (shareCount >= 41) return 5;
  if (shareCount >= 31) return 4;
  if (shareCount >= 21) return 3;
  if (shareCount >= 11) return 2;
  return 1;
}

function getNextReferralPayDate(fromDate = new Date()): Date {
  const payDate = new Date(fromDate);
  const day = payDate.getDay();
  const minutes = payDate.getHours() * 60 + payDate.getMinutes();
  const fridayCutoffMinutes = 13 * 60;
  const daysToThisFriday = (5 - day + 7) % 7;
  const missedCurrentWeek = day === 5 && minutes >= fridayCutoffMinutes;
  payDate.setDate(payDate.getDate() + daysToThisFriday + (missedCurrentWeek ? 7 : 0) + 7);
  payDate.setHours(9, 0, 0, 0);
  return payDate;
}

function isHandshakeActive(now = new Date()): boolean {
  return now >= HANDSHAKE_START_DATE && now <= HANDSHAKE_END_DATE;
}

function getHandshakeMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function getMonthlyHandshakeCount(referrerId: string, monthKey = getHandshakeMonth()): Promise<number> {
  const snap = await getDocs(query(collection(db, 'referrals'), where('referrerId', '==', referrerId)));
  return snap.docs.filter((referralDoc) => {
    const referral = referralDoc.data() as Referral;
    return (referral.handshakeCommissionAmount || 0) > 0 && referral.handshakeMonth === monthKey;
  }).length;
}

export function formatDate(value: Timestamp | Date | null | undefined): string {
  if (!value) return '-';
  const d = value instanceof Date ? value : value.toDate();
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isCampaignActive(): boolean {
  return new Date() < CAMPAIGN_END_DATE;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUpUser(
  email: string,
  password: string,
  userData: SignUpFormData
): Promise<{ success: boolean; uid?: string; referralCode?: string; error?: string }> {
  try {
    if (!isCampaignActive()) {
      throw new Error('This special offer has ended. Please contact support.');
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    let referralCode = generateReferralCode();
    for (let i = 0; i < 10; i++) {
      const snap = await getDocs(
        query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1))
      );
      if (snap.empty) break;
      referralCode = generateReferralCode();
    }

    let referredBy: string | null = null;
    if (typeof window !== 'undefined') {
      const refCode =
        new URLSearchParams(window.location.search).get('ref') ||
        localStorage.getItem('referralCode');
      if (refCode) {
        const snap = await getDocs(
          query(collection(db, 'users'), where('referralCode', '==', refCode), limit(1))
        );
        if (!snap.empty && snap.docs[0].id !== uid) {
          referredBy = snap.docs[0].id;
        }
      }
    }

    const now = serverTimestamp();
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      fullName: userData.fullName,
      phone: userData.phone,
      idNumber: userData.idNumber,
      employmentStatus: userData.employmentStatus,
      source: userData.source,
      planType: userData.planType,
      tier: userData.tier,
      referralCode,
      referredBy,
      referredByName: userData.referredByName,
      beneficiary: userData.beneficiary,
      spouse: userData.spouse,
      dependents: userData.dependents,
      extendedFamily: userData.extendedFamily,
      documents: userData.documents,
      baseActivationFee: userData.baseActivationFee,
      extendedFamilyFee: userData.extendedFamilyFee,
      totalApplicationFee: userData.totalApplicationFee,
      isActivated: false,
      totalPaid: 0,
      activationDate: null,
      rewardReleaseDate: null,
      families: [],
      funeralCoverActive: false,
      funeralCoverExpiry: null,
      applicationStatus: 'submitted',
      identityVerificationStatus: userData.identitySelfieDataUrl ? 'approved' : 'not_started',
      identitySelfieDataUrl: userData.identitySelfieDataUrl || null,
      identitySubmittedAt: userData.identitySelfieDataUrl ? now : null,
      identityReviewedAt: userData.identitySelfieDataUrl ? now : null,
      identityReviewedBy: userData.identitySelfieDataUrl ? 'auto-clarity' : null,
      identityRejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    if (userData.identitySelfieDataUrl) {
      await createNotification(
        uid,
        'identity',
        'Your selfie passed the clarity check. You can now activate your cover.'
      );
    } else {
      await createNotification(
        uid,
        'identity',
        'Please complete your selfie verification before activating your cover.'
      );
      sendEmailNotification(
        email,
        'Complete your GoDirect247 selfie verification',
        `
          <p>Hi ${userData.fullName || 'there'},</p>
          <p>Your GoDirect247 application has been received.</p>
          <p>Please log in and take a selfie so we can protect your profile before you activate your cover.</p>
          <p><a href="${typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://godirect247.com/login'}">Log in to GoDirect247</a></p>
        `
      );
    }

    if (referredBy) {
      const activationFee = getActivationFee(userData.tier, userData.planType);
      const handshakeMonth = getHandshakeMonth();
      const monthlyHandshakeCount = await getMonthlyHandshakeCount(referredBy, handshakeMonth);
      const qualifiesForHandshake =
        userData.planType === 'plus' && isHandshakeActive() && monthlyHandshakeCount < MAX_MONTHLY_HANDSHAKES;
      const handshakeCommissionAmount = qualifiesForHandshake ? PLUS_HANDSHAKE_COMMISSION : 0;
      const signupCommissionAmount = handshakeCommissionAmount;
      const potentialActivationCommission = qualifiesForHandshake
        ? 0
        : Math.round(activationFee * ACTIVATION_COMMISSION_RATE * 100) / 100;
      await addDoc(collection(db, 'referrals'), {
        referrerId: referredBy,
        referredUserId: uid,
        referredUserName: userData.fullName,
        status: 'signed_up',
        commissionAmount: signupCommissionAmount,
        signupCommissionAmount,
        activationCommissionAmount: 0,
        potentialActivationCommission,
        handshakeCommissionAmount,
        handshakeMonth: qualifiesForHandshake ? handshakeMonth : null,
        handshakePaidOnSignup: qualifiesForHandshake,
        duePaymentDate: Timestamp.fromDate(getNextReferralPayDate()),
        paidAt: null,
        createdAt: now,
      });
      const referrerSnap = await getDoc(doc(db, 'users', referredBy));
      if (referrerSnap.exists() && signupCommissionAmount > 0) {
        const referrerData = referrerSnap.data() as UserData;
        await updateDoc(doc(db, 'users', referredBy), {
          totalEarnings: (referrerData.totalEarnings || 0) + signupCommissionAmount,
          updatedAt: now,
        });
      }
      await createNotification(
        referredBy,
        'joined',
        qualifiesForHandshake
          ? `${userData.fullName || 'Someone'} joined using your referral link. Plus Plan handshake commission: ${formatCurrency(handshakeCommissionAmount)}.`
          : `${userData.fullName || 'Someone'} joined using your referral link. Activation commission will be earned after payment.`
      );
      if (referrerSnap.exists() && referrerSnap.data().phone) {
        sendSMSNotification(
          referrerSnap.data().phone as string,
          qualifiesForHandshake
            ? `GoDirect247: ${userData.fullName || 'Someone'} joined using your link. Plus Plan handshake commission ${formatCurrency(handshakeCommissionAmount)} is scheduled for the next Friday pay run.`
            : `GoDirect247: ${userData.fullName || 'Someone'} joined using your link. Potential activation commission ${formatCurrency(potentialActivationCommission)}.`
        );
      }
    }

    return { success: true, uid, referralCode };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, uid: cred.user.uid };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
  }
}

export async function sendPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const actionCodeSettings =
      typeof window !== 'undefined'
        ? { url: `${window.location.origin}/login`, handleCodeInApp: false }
        : undefined;

    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not send reset email',
    };
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserData(uid: string): Promise<UserData | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserData;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getAllMembers(): Promise<{
  success: boolean;
  members?: (UserData & { id: string })[];
  error?: string;
}> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    const members = snap.docs.map((d) => {
      const data = { id: d.id, ...d.data() } as UserData & { id: string };
      if (!data.status) data.status = data.isActivated ? 'Active' : 'Pending';
      return data;
    });
    return { success: true, members };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load members' };
  }
}

export async function getPendingPayments(): Promise<{
  success: boolean;
  payments?: Payment[];
  error?: string;
}> {
  try {
    const snap = await getDocs(
      query(collection(db, 'payments'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
    );
    const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
    return { success: true, payments };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load payments' };
  }
}

export async function verifyPayment(
  paymentId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = serverTimestamp();
    const paymentRef = doc(db, 'payments', paymentId);
    const paymentSnap = await getDoc(paymentRef);
    if (!paymentSnap.exists()) throw new Error('Payment not found');
    const payment = paymentSnap.data() as Payment;

    await updateDoc(paymentRef, { status: 'paid', verifiedBy: adminId, verifiedAt: now, paidAt: now });

    const userRef = doc(db, 'users', payment.userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    const user = userSnap.data() as UserData;

    const newTotalPaid = (user.totalPaid || 0) + payment.amount;
    const updates: Record<string, unknown> = { totalPaid: newTotalPaid, updatedAt: now };

    const isSelfActivation = payment.type === 'self' && payment.amount >= ACTIVATION_AMOUNT;
    const isFullyPaid = newTotalPaid >= TOTAL_ACTIVATION && !user.isActivated;

    if ((isSelfActivation || isFullyPaid) && !user.isActivated) {
      const rewardDate = new Date();
      rewardDate.setDate(rewardDate.getDate() + REWARD_DELAY_WEEKS * 7);
      const rewardTs = Timestamp.fromDate(rewardDate);
      const coverExpiry = new Date();
      coverExpiry.setMonth(coverExpiry.getMonth() + 12);

      updates.isActivated = true;
      updates.activationDate = now;
      updates.rewardReleaseDate = rewardTs;
      updates.funeralCoverActive = true;
      updates.funeralCoverExpiry = Timestamp.fromDate(coverExpiry);

      if (isFullyPaid) {
        await setDoc(doc(db, 'rewards', payment.userId), {
          userId: payment.userId,
          cashbackAmount: REWARD_CASHBACK,
          bonusAmount: REWARD_BONUS,
          totalAmount: REWARD_TOTAL,
          status: 'pending',
          releaseDate: rewardTs,
          releasedAt: null,
          createdAt: now,
        });
        await createNotification(payment.userId, 'reward_ready', `Your R${REWARD_TOTAL} reward is scheduled for ${formatDate(rewardDate)}.`);
      }
      await checkAndAwardPreLaunchReward(payment.userId);
    }

    await updateDoc(userRef, updates);

    if (user.referredBy) {
      await creditReferrerCommission(user.referredBy, payment.userId, payment.amount);
      await checkAndAwardPreLaunchReward(user.referredBy);
      await checkAllGenerosityMilestones(user.referredBy);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Verify failed' };
  }
}

export async function updateMemberStatus(
  memberId: string,
  status: 'Active' | 'Pending' | 'Lapsed'
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'users', memberId), {
      isActivated: status === 'Active',
      status,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function submitIdentitySelfie(
  uid: string,
  selfieDataUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!selfieDataUrl.startsWith('data:image/')) throw new Error('Please upload a valid selfie image.');
    if (selfieDataUrl.length > 900000) throw new Error('Selfie image is too large. Please try a smaller photo.');

    await updateDoc(doc(db, 'users', uid), {
      identitySelfieDataUrl: selfieDataUrl,
      identityVerificationStatus: 'approved',
      identitySubmittedAt: serverTimestamp(),
      identityReviewedAt: serverTimestamp(),
      identityReviewedBy: 'auto-clarity',
      identityRejectionReason: null,
      updatedAt: serverTimestamp(),
    });

    await createNotification(
      uid,
      'identity',
      'Your selfie passed the clarity check. You can now activate your cover.'
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not submit selfie' };
  }
}

export async function updateIdentityVerificationStatus(
  memberId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  reason = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'users', memberId), {
      identityVerificationStatus: status,
      identityReviewedAt: serverTimestamp(),
      identityReviewedBy: adminId,
      identityRejectionReason: status === 'rejected' ? reason || 'Selfie could not be verified.' : null,
      updatedAt: serverTimestamp(),
    });
    await createNotification(
      memberId,
      'identity',
      status === 'approved'
        ? 'Your selfie verification has been approved. You can now activate your cover.'
        : 'Your selfie verification was not approved. Please submit a clear selfie and try again.'
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Identity update failed' };
  }
}

export async function createEftActivationInvoice(
  uid: string,
  amount: number
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return { success: false, error: 'User not found' };
    const user = userSnap.data() as UserData;
    if (user.isActivated) return { success: false, error: 'Cover is already active.' };
    if (user.identityVerificationStatus !== 'approved') {
      return { success: false, error: 'Please complete selfie verification before requesting an invoice.' };
    }

    const now = serverTimestamp();
    const ref = await addDoc(collection(db, 'eftActivationInvoices'), {
      userId: uid,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      tier: user.tier,
      planType: user.planType,
      amount,
      status: 'awaiting_eft',
      createdAt: now,
      updatedAt: now,
      paidAt: null,
    });

    await createNotification(
      uid,
      'paid',
      `EFT invoice for R${amount.toLocaleString()} has been generated. Reference: GD-${ref.id.slice(0, 8).toUpperCase()}. Email proof of payment to support@godirect247.com.`
    );

    return { success: true, invoiceId: ref.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not create EFT invoice.' };
  }
}

export async function recordActivationPayment(
  uid: string,
  amount: number,
  chargeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = serverTimestamp();

    await addDoc(collection(db, 'payments'), {
      userId: uid,
      amount,
      type: 'self',
      status: 'paid',
      yocoChargeId: chargeId,
      createdAt: now,
      paidAt: now,
    });

    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) throw new Error('User not found');
    const user = userSnap.data() as UserData;

    const rewardDate = new Date();
    rewardDate.setDate(rewardDate.getDate() + REWARD_DELAY_WEEKS * 7);
    const coverExpiry = new Date();
    coverExpiry.setMonth(coverExpiry.getMonth() + 12);

    await updateDoc(doc(db, 'users', uid), {
      isActivated: true,
      activationDate: now,
      totalPaid: (user.totalPaid || 0) + amount,
      rewardReleaseDate: Timestamp.fromDate(rewardDate),
      funeralCoverActive: true,
      funeralCoverExpiry: Timestamp.fromDate(coverExpiry),
      updatedAt: now,
    });

    if (user.referredBy) {
      await creditReferrerCommission(user.referredBy, uid, amount);
      await checkAndAwardPreLaunchReward(user.referredBy);
      await checkAllGenerosityMilestones(user.referredBy);
    }

    await checkAndAwardPreLaunchReward(uid);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Activation failed' };
  }
}

export interface ReferralStats {
  total: number;
  paid: number;
  earnings: number;
  activatedEarnings: number;
  potentialEarnings: number;
  signupEarnings: number;
  handshakesThisMonth: number;
  nextPayDate: Date;
  tier: string;
  commissionRate: number;
  nextTierAt: number | null;
}

export async function getReferralStats(uid: string): Promise<ReferralStats> {
  const [allSnap, paidSnap, userSnap] = await Promise.all([
    getDocs(query(collection(db, 'referrals'), where('referrerId', '==', uid))),
    getDocs(query(collection(db, 'referrals'), where('referrerId', '==', uid), where('status', '==', 'paid'))),
    getDoc(doc(db, 'users', uid)),
  ]);

  const total = allSnap.size;
  const paid = paidSnap.size;
  const earnings = userSnap.exists() ? ((userSnap.data().totalEarnings as number) || 0) : 0;
  let activatedEarnings = 0;
  let potentialEarnings = 0;
  let signupEarnings = 0;
  let handshakesThisMonth = 0;
  const handshakeMonth = getHandshakeMonth();

  allSnap.docs.forEach((referralDoc) => {
    const referral = referralDoc.data() as Referral;
    signupEarnings += referral.signupCommissionAmount ?? 0;
    activatedEarnings += referral.status === 'paid'
      ? referral.activationCommissionAmount ?? 0
      : 0;
    potentialEarnings += referral.status === 'paid'
      ? 0
      : referral.potentialActivationCommission ?? 0;
    if ((referral.handshakeCommissionAmount || 0) > 0 && referral.handshakeMonth === handshakeMonth) {
      handshakesThisMonth += 1;
    }
  });

  const tier = '10% Activation';
  const commissionRate = ACTIVATION_COMMISSION_RATE * 100;
  const nextTierAt = null;
  const nextPayDate = getNextReferralPayDate();

  return { total, paid, earnings, activatedEarnings, potentialEarnings, signupEarnings, handshakesThisMonth, nextPayDate, tier, commissionRate, nextTierAt };
}

export async function getAllRewards(): Promise<Reward[]> {
  const snap = await getDocs(query(collection(db, 'rewards'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reward));
}

export async function getAllReferrals(): Promise<Referral[]> {
  const snap = await getDocs(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Referral));
}

// ── Withdrawals ───────────────────────────────────────────────────────────────

export async function requestWithdrawal(
  uid: string,
  userName: string,
  amount: number,
  bankDetails: { bankName: string; accountNumber: string; accountHolder: string; accountType: 'Cheque' | 'Savings' }
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getDocs(
      query(collection(db, 'withdrawals'), where('userId', '==', uid), where('status', '==', 'pending'), limit(1))
    );
    if (!existing.empty) return { success: false, error: 'You already have a pending withdrawal request.' };

    await addDoc(collection(db, 'withdrawals'), {
      userId: uid,
      userName,
      amount,
      ...bankDetails,
      status: 'pending',
      requestedAt: serverTimestamp(),
      processedAt: null,
      processedBy: null,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export async function getUserWithdrawal(uid: string): Promise<Withdrawal | null> {
  const snap = await getDocs(
    query(collection(db, 'withdrawals'), where('userId', '==', uid), where('status', '==', 'pending'), limit(1))
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Withdrawal;
}

export async function getAllWithdrawals(): Promise<{ success: boolean; withdrawals?: Withdrawal[]; error?: string }> {
  try {
    const snap = await getDocs(query(collection(db, 'withdrawals'), orderBy('requestedAt', 'desc')));
    return { success: true, withdrawals: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Withdrawal)) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function processWithdrawal(
  withdrawalId: string,
  action: 'approved' | 'rejected',
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = serverTimestamp();
    const wRef = doc(db, 'withdrawals', withdrawalId);
    const wSnap = await getDoc(wRef);
    if (!wSnap.exists()) throw new Error('Withdrawal not found');
    const w = wSnap.data() as Withdrawal;

    await updateDoc(wRef, { status: action, processedAt: now, processedBy: adminId });

    if (action === 'approved') {
      const userSnap = await getDoc(doc(db, 'users', w.userId));
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        const currentRefEarnings = userData.totalEarnings || 0;
        const currentShareEarnings = userData.shareEarnings || 0;

        let remainingToDeduct = w.amount;
        const deductRef = Math.min(currentRefEarnings, remainingToDeduct);
        remainingToDeduct -= deductRef;
        const deductShare = Math.min(currentShareEarnings, remainingToDeduct);

        await updateDoc(doc(db, 'users', w.userId), {
          totalEarnings: Math.max(0, currentRefEarnings - deductRef),
          shareEarnings: Math.max(0, currentShareEarnings - deductShare),
          updatedAt: now,
        });

        sendSMSNotification(
          userSnap.data().phone as string,
          `GoDirect247: Your R${w.amount} withdrawal has been approved! Funds will be transferred to your ${w.bankName} account within 1-3 business days.`
        );
      }
      await createNotification(w.userId, 'paid', `Your withdrawal of R${w.amount} was approved! Funds will be transferred to your account.`);
    } else {
      const userSnap = await getDoc(doc(db, 'users', w.userId));
      if (userSnap.exists() && userSnap.data().phone) {
        sendSMSNotification(
          userSnap.data().phone as string,
          `GoDirect247: Your R${w.amount} withdrawal was not approved. Please contact us on 078 018 7995 for assistance.`
        );
      }
      await createNotification(w.userId, 'paid', `Your withdrawal of R${w.amount} was not approved. Please contact support.`);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Process failed' };
  }
}

export async function releaseReward(
  rewardId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = serverTimestamp();
    const rRef = doc(db, 'rewards', rewardId);
    const rSnap = await getDoc(rRef);
    if (!rSnap.exists()) throw new Error('Reward not found');
    const r = rSnap.data() as Reward;
    await updateDoc(rRef, { status: 'released', releasedAt: now, releasedBy: adminId });
    await createNotification(r.userId, 'reward_ready', `Your R${r.totalAmount} Pre-Launch Special reward has been released!`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Release failed' };
  }
}

export async function recordLinkShare(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    const user = userSnap.data() as UserData;

    const now = new Date();
    const todayStr = now.toDateString();
    const lastShareTs = user.lastShareDate;
    const lastShareDate = lastShareTs ? (typeof lastShareTs.toDate === 'function' ? lastShareTs.toDate() : new Date(lastShareTs as unknown as string)) : null;
    const lastShareStr = lastShareDate ? lastShareDate.toDateString() : '';

    const dailyCount = (lastShareStr === todayStr) ? (user.dailyShareCount || 0) : 0;

    if (dailyCount >= MAX_DAILY_SHARES) {
      return { success: false, error: 'Daily share limit reached.' };
    }

    const newShareCount = (user.shareCount || 0) + 1;
    const shareRewardAmount = getShareRewardAmount(newShareCount);
    const newShareEarnings = (user.shareEarnings || 0) + shareRewardAmount;

    await updateDoc(userRef, {
      shareCount: newShareCount,
      shareEarnings: newShareEarnings,
      lastShareRewardAmount: shareRewardAmount,
      dailyShareCount: dailyCount + 1,
      lastShareDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to record share' };
  }
}


export async function checkAllGenerosityMilestones(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const user = userSnap.data() as UserData;
    const currentStep = user.generosityStep || 0;

    // Count paid referrals
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', uid),
      where('status', '==', 'paid')
    );
    const snap = await getDocs(q);
    const paidCount = snap.size;

    // Step 1: Silver Plan — 2 paid referrals → R3,000
    if (paidCount >= 2 && currentStep === 0) {
      const reward = GENEROSITY_STEPS[0].harvest;
      await updateDoc(userRef, {
        generosityStep: 1,
        harvestBalance: (user.harvestBalance || 0) + reward,
        updatedAt: serverTimestamp(),
      });
      await createNotification(uid, 'reward_ready', `Congratulations! Your Silver Plan harvest of R${reward.toLocaleString()} is ready.`);
      // Try auto-create trio if not in one
      await tryCreateTrio(uid);
    }

    // Steps 2-9: Each step requires the user to have upgraded to the previous step
    // and paid referrals at the threshold. For simplicity, after Step 1,
    // each upgrade is user-initiated via upgradeGenerosityStep().
    // Admin can also manually verify team completions.
  } catch (err) {
    console.error('Generosity milestone check failed:', err);
  }
}

export async function tryCreateTrio(leaderId: string): Promise<{ success: boolean; trioId?: string; error?: string }> {
  try {
    const leaderRef = doc(db, 'users', leaderId);
    const leaderSnap = await getDoc(leaderRef);
    if (!leaderSnap.exists()) return { success: false, error: 'Leader not found' };
    const leader = leaderSnap.data() as UserData;
    if (leader.trioId) return { success: true, trioId: leader.trioId };

    // Find 2 paid referrals
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', leaderId),
      where('status', '==', 'paid'),
      limit(2)
    );
    const snap = await getDocs(q);
    if (snap.size < 2) return { success: false, error: 'Need 2 paid referrals to form a trio' };

    const memberIds = snap.docs.map((d) => d.data().referredUserId as string);
    const memberNames: string[] = [];
    for (const mid of memberIds) {
      const mSnap = await getDoc(doc(db, 'users', mid));
      memberNames.push(mSnap.exists() ? (mSnap.data().fullName as string) || 'Unknown' : 'Unknown');
    }

    const now = serverTimestamp();
    const trioRef = doc(collection(db, 'trios'));
    const trioId = trioRef.id;

    await setDoc(trioRef, {
      leaderId,
      leaderName: leader.fullName || 'Unknown',
      memberIds,
      memberNames,
      status: 'active',
      step: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Link all members to the trio
    await updateDoc(leaderRef, { trioId, updatedAt: now });
    for (const mid of memberIds) {
      await updateDoc(doc(db, 'users', mid), { trioId, fundedBy: leaderId, updatedAt: now });
    }

    await createNotification(leaderId, 'reward_ready', `Your trio is formed with ${memberNames.join(' & ')}! Step 1 unlocked.`);
    return { success: true, trioId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Trio creation failed' };
  }
}

export async function getUserTrio(uid: string): Promise<Trio | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;
    const user = userSnap.data() as UserData;
    if (!user.trioId) return null;
    const trioSnap = await getDoc(doc(db, 'trios', user.trioId));
    if (!trioSnap.exists()) return null;
    return { id: trioSnap.id, ...trioSnap.data() } as Trio;
  } catch {
    return null;
  }
}

export async function getAllTrios(): Promise<{ success: boolean; trios?: Trio[]; error?: string }> {
  try {
    const snap = await getDocs(query(collection(db, 'trios'), orderBy('createdAt', 'desc')));
    const trios = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trio));
    return { success: true, trios };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load trios' };
  }
}

export async function awardDownstreamReward(userId: string, newStep: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const user = userSnap.data() as UserData;
    const funderId = user.fundedBy;
    if (!funderId) return;

    // Reward funder when funded member reaches Diamond Gold (Step 5) or higher
    if (newStep === 5) {
      const funderRef = doc(db, 'users', funderId);
      const funderSnap = await getDoc(funderRef);
      if (!funderSnap.exists()) return;
      const funder = funderSnap.data() as UserData;
      const reward = 2500;
      await updateDoc(funderRef, {
        downstreamRewards: (funder.downstreamRewards || 0) + reward,
        totalEarnings: (funder.totalEarnings || 0) + reward,
        updatedAt: serverTimestamp(),
      });
      await createNotification(funderId, 'paid', `R${reward.toLocaleString()} earned! ${user.fullName || 'Your team member'} reached Diamond Gold Status.`);
      sendSMSNotification(
        funder.phone as string,
        `GoDirect247: R${reward.toLocaleString()} earned! ${user.fullName || 'A team member'} reached Diamond Gold Status. Keep leading!`
      );
    }
  } catch (err) {
    console.error('Downstream reward failed:', err);
  }
}

export async function upgradeGenerosityStep(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    const user = userSnap.data() as UserData;

    const currentStep = user.generosityStep || 0;
    if (currentStep >= GENEROSITY_STEPS.length) throw new Error('You have reached the top!');

    const nextStepConfig = GENEROSITY_STEPS[currentStep]; // The step the user wants to join
    const harvestAvailable = user.harvestBalance || 0;

    if (harvestAvailable < nextStepConfig.seed) {
      throw new Error(`Insufficient harvest balance to seed ${nextStepConfig.name}. Requires R${nextStepConfig.seed}.`);
    }

    const newStep = currentStep + 1;
    const newHarvest = harvestAvailable - nextStepConfig.seed;
    const keepAmount = nextStepConfig.keep ?? 0;

    await updateDoc(userRef, {
      generosityStep: newStep,
      harvestBalance: newHarvest,
      totalEarnings: (user.totalEarnings || 0) + keepAmount,
      updatedAt: serverTimestamp(),
    });

    // Update trio step if leader
    if (user.trioId) {
      const trioRef = doc(db, 'trios', user.trioId);
      const trioSnap = await getDoc(trioRef);
      if (trioSnap.exists()) {
        const trio = trioSnap.data() as Trio;
        if (trio.leaderId === uid) {
          await updateDoc(trioRef, { step: newStep, updatedAt: serverTimestamp() });
        }
      }
    }

    // Notify downstream funder if milestone reached
    await awardDownstreamReward(uid, newStep);

    await createNotification(
      uid,
      'tier_up',
      `You have progressed to ${nextStepConfig.name}! Harvest: R${nextStepConfig.harvest.toLocaleString()}.`
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Upgrade failed' };
  }
}

export async function createNotification(
  userId: string,
  type: AppNotification['type'],
  message: string
): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function getUnreadNotifications(userId: string): Promise<{
  success: boolean;
  notifications?: AppNotification[];
  count?: number;
  error?: string;
}> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
    );
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
    return { success: true, notifications, count: notifications.length };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function creditReferrerCommission(
  referrerId: string,
  referredUserId: string,
  amount: number
): Promise<void> {
  const now = serverTimestamp();
  const referralQuery = await getDocs(
    query(
      collection(db, 'referrals'),
      where('referrerId', '==', referrerId),
      where('referredUserId', '==', referredUserId),
      limit(1)
    )
  );
  if (referralQuery.empty) return;

  const referralDoc = referralQuery.docs[0];
  const referral = referralDoc.data() as Referral;
  if (referral.status === 'paid') return;

  if ((referral.handshakeCommissionAmount || 0) > 0 && referral.handshakePaidOnSignup) {
    await updateDoc(referralDoc.ref, {
      status: 'paid',
      activationCommissionAmount: 0,
      potentialActivationCommission: 0,
      duePaymentDate: Timestamp.fromDate(getNextReferralPayDate()),
      paidAt: now,
      updatedAt: now,
    });
    await createNotification(
      referrerId,
      'paid',
      `Referral activated. No additional commission is due because the Plus Plan handshake commission was already paid on signup.`
    );
    return;
  }

  const activationCommissionAmount = Math.round(amount * ACTIVATION_COMMISSION_RATE * 100) / 100;

  await updateDoc(referralDoc.ref, {
    status: 'paid',
    commissionAmount: activationCommissionAmount,
    activationCommissionAmount,
    handshakeCommissionAmount: 0,
    duePaymentDate: Timestamp.fromDate(getNextReferralPayDate()),
    paidAt: now,
    updatedAt: now,
  });

  const referrerSnap = await getDoc(doc(db, 'users', referrerId));
  if (!referrerSnap.exists()) return;

  const referrerData = referrerSnap.data() as UserData;
  await updateDoc(doc(db, 'users', referrerId), {
    totalEarnings: (referrerData.totalEarnings || 0) + activationCommissionAmount,
    updatedAt: now,
  });

  await createNotification(
    referrerId,
    'paid',
    `Activation commission earned: ${formatCurrency(activationCommissionAmount)}.`
  );
  sendSMSNotification(
    referrerData.phone as string,
    `GoDirect247: ${formatCurrency(activationCommissionAmount)} activation commission earned. Payment is scheduled for the next Friday pay run.`
  );
}

// ── Additional Policies ───────────────────────────────────────────────────────

export async function createAdditionalPolicy(
  userId: string,
  data: AdditionalPolicyFormData
): Promise<{ success: boolean; policyId?: string; error?: string }> {
  try {
    const now = serverTimestamp();
    const ref = await addDoc(collection(db, 'additionalPolicies'), {
      userId,
      planType: data.planType,
      tier: data.tier,
      mainMemberName: data.mainMemberName,
      mainMemberIdNumber: data.mainMemberIdNumber,
      mainMemberPhone: data.mainMemberPhone,
      beneficiary: data.beneficiary,
      spouse: data.spouse,
      dependents: data.dependents,
      extendedFamily: data.extendedFamily,
      baseActivationFee: data.baseActivationFee,
      extendedFamilyFee: data.extendedFamilyFee,
      totalApplicationFee: data.totalApplicationFee,
      status: 'pending_payment',
      paymentMethod: data.paymentMethod ?? 'yoco',
      customerEmail: data.customerEmail ?? null,
      yocoCheckoutId: null,
      activationDate: null,
      funeralCoverExpiry: null,
      createdAt: now,
      updatedAt: now,
    });

    if (data.paymentMethod === 'eft') {
      await createNotification(
        userId,
        'paid',
        `EFT invoice for R${data.totalApplicationFee.toLocaleString()} (${data.tier} additional cover) has been generated. Reference: GD-${ref.id.slice(0, 8).toUpperCase()}. Email proof of payment to support@godirect247.com.`
      );
    }

    return { success: true, policyId: ref.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not create policy' };
  }
}

export async function getUserAdditionalPolicies(userId: string): Promise<AdditionalPolicy[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'additionalPolicies'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdditionalPolicy));
  } catch {
    return [];
  }
}

export async function activateAdditionalPolicy(
  policyId: string,
  yocoCheckoutId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const policyRef = doc(db, 'additionalPolicies', policyId);
    const policySnap = await getDoc(policyRef);
    if (!policySnap.exists()) return { success: false, error: 'Policy not found' };
    const policy = policySnap.data() as AdditionalPolicy;
    if (policy.status === 'active') return { success: true };

    const now = serverTimestamp();
    const coverExpiry = new Date();
    coverExpiry.setMonth(coverExpiry.getMonth() + 12);

    await updateDoc(policyRef, {
      status: 'active',
      yocoCheckoutId,
      activationDate: now,
      funeralCoverExpiry: Timestamp.fromDate(coverExpiry),
      updatedAt: now,
    });

    await addDoc(collection(db, 'payments'), {
      userId: policy.userId,
      amount: policy.totalApplicationFee,
      type: 'self',
      status: 'paid',
      yocoChargeId: yocoCheckoutId,
      additionalPolicyId: policyId,
      createdAt: now,
      paidAt: now,
    });

    await createNotification(
      policy.userId,
      'paid',
      `Additional ${policy.tier} policy for ${policy.mainMemberName} is now active.`
    );

    const userSnap = await getDoc(doc(db, 'users', policy.userId));
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserData;
      if (userData.referredBy) {
        await creditAdditionalPolicyCommission(userData.referredBy, policy.userId, policy.totalApplicationFee, policyId);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Activation failed' };
  }
}

async function creditAdditionalPolicyCommission(
  referrerId: string,
  buyerId: string,
  amount: number,
  policyId: string
): Promise<void> {
  const commissionAmount = Math.round(amount * ACTIVATION_COMMISSION_RATE * 100) / 100;
  const now = serverTimestamp();

  const buyerSnap = await getDoc(doc(db, 'users', buyerId));
  const buyerName = buyerSnap.exists() ? (buyerSnap.data().fullName as string) || 'Member' : 'Member';

  await addDoc(collection(db, 'referrals'), {
    referrerId,
    referredUserId: buyerId,
    referredUserName: buyerName,
    status: 'paid',
    commissionAmount,
    signupCommissionAmount: 0,
    activationCommissionAmount: commissionAmount,
    potentialActivationCommission: 0,
    handshakeCommissionAmount: 0,
    handshakeMonth: null,
    handshakePaidOnSignup: false,
    additionalPolicyId: policyId,
    duePaymentDate: Timestamp.fromDate(getNextReferralPayDate()),
    paidAt: now,
    createdAt: now,
  });

  const referrerSnap = await getDoc(doc(db, 'users', referrerId));
  if (!referrerSnap.exists()) return;
  const referrerData = referrerSnap.data() as UserData;
  await updateDoc(doc(db, 'users', referrerId), {
    totalEarnings: (referrerData.totalEarnings || 0) + commissionAmount,
    updatedAt: now,
  });

  await createNotification(
    referrerId,
    'paid',
    `${buyerName} bought an additional ${formatCurrency(amount)} package. Commission: ${formatCurrency(commissionAmount)}.`
  );
  if (referrerData.phone) {
    sendSMSNotification(
      referrerData.phone,
      `GoDirect247: ${buyerName} bought an additional package. Commission ${formatCurrency(commissionAmount)} scheduled for the next Friday pay run.`
    );
  }
}

async function checkAndAwardPreLaunchReward(userId: string): Promise<void> {
  const existing = await getDoc(doc(db, 'rewards', userId));
  if (existing.exists()) return;

  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return;
  const user = userSnap.data() as UserData;
  if (!user.isActivated) return;

  const paidSnap = await getDocs(
    query(collection(db, 'referrals'), where('referrerId', '==', userId), where('status', '==', 'paid'))
  );
  if (paidSnap.size < 2) return;

  const rewardDate = new Date();
  rewardDate.setDate(rewardDate.getDate() + REWARD_DELAY_WEEKS * 7);
  const now = serverTimestamp();

  await setDoc(doc(db, 'rewards', userId), {
    userId,
    cashbackAmount: REWARD_CASHBACK,
    bonusAmount: REWARD_BONUS,
    totalAmount: REWARD_TOTAL,
    status: 'pending',
    releaseDate: Timestamp.fromDate(rewardDate),
    releasedAt: null,
    preLaunchSpecial: true,
    referralCount: paidSnap.size,
    createdAt: now,
  });
  await createNotification(
    userId,
    'reward_ready',
    `Your R${REWARD_TOTAL} Pre-Launch Special reward is scheduled for ${formatDate(rewardDate)}.`
  );
}
