// Promo codes — Youth free cover + age-tiered Generosity discount
// Issued by GoDirect247 / Zarkudu Group · FSP JR 50841

export type PromoMode = 'standard' | 'generosity';

export interface PromoApplyResult {
  valid: boolean;
  code?: string;
  reason?: string;
  baseFee: number;
  discountPercent: number;
  discountAmount: number;
  payableFee: number;
  pearlActivationFee?: number;
  isFreeCover: boolean;
  generosityOnly: boolean;
  ageBracket?: string;
}

export const YOUTH_PROMO_CODE = 'YOUTH2026';
export const GENEROSITY_PROMO_CODE = 'GENEROSITY2026';

export const YOUTH_FREE_COVER_LIMIT = 10_000;
export const PEARL_ACTIVIST_FEE = 350;

interface PromoCodeRule {
  code: string;
  label: string;
  description: string;
  minAge: number;
  maxAge: number;
  brackets: Array<{ minAge: number; maxAge: number; discountPercent: number; bracket: string }>;
  generosityOnly: boolean;
  freeCover: boolean;
  maxUses: number | null;
  activistOptIn: boolean;
}

export const PROMO_CODES: Record<string, PromoCodeRule> = {
  [YOUTH_PROMO_CODE]: {
    code: YOUTH_PROMO_CODE,
    label: 'Youth Free Cover',
    description:
      'Free funeral cover for the first 10,000 youth (ages 16–35). Optional R350 activation fee to also join the Generosity Reward as a Pearl Activist.',
    minAge: 16,
    maxAge: 35,
    brackets: [{ minAge: 16, maxAge: 35, discountPercent: 100, bracket: 'Youth 16–35' }],
    generosityOnly: false,
    freeCover: true,
    maxUses: YOUTH_FREE_COVER_LIMIT,
    activistOptIn: true,
  },
  [GENEROSITY_PROMO_CODE]: {
    code: GENEROSITY_PROMO_CODE,
    label: 'Generosity Discount',
    description:
      'Generosity Reward discount: 70% off for ages 36–64, 50% off for ages 65–83. Valid inside the Generosity Reward signup only.',
    minAge: 36,
    maxAge: 83,
    brackets: [
      { minAge: 36, maxAge: 64, discountPercent: 70, bracket: 'Adult 36–64' },
      { minAge: 65, maxAge: 83, discountPercent: 50, bracket: 'Senior 65–83' },
    ],
    generosityOnly: true,
    freeCover: false,
    maxUses: null,
    activistOptIn: false,
  },
};

// Extract age from a South African ID number (first 6 digits = YYMMDD)
export function ageFromSaIdNumber(idNumber: string, referenceDate: Date = new Date()): number | null {
  const cleaned = (idNumber || '').replace(/\D/g, '');
  if (cleaned.length < 6) return null;
  const yy = parseInt(cleaned.slice(0, 2), 10);
  const mm = parseInt(cleaned.slice(2, 4), 10);
  const dd = parseInt(cleaned.slice(4, 6), 10);
  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYearShort = referenceDate.getFullYear() % 100;
  const fullYear = yy <= currentYearShort ? 2000 + yy : 1900 + yy;
  const dob = new Date(fullYear, mm - 1, dd);
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    referenceDate.getMonth() > dob.getMonth() ||
    (referenceDate.getMonth() === dob.getMonth() && referenceDate.getDate() >= dob.getDate());
  if (!hasHadBirthday) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function normalizePromoCode(input: string): string {
  return (input || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function applyPromoCode(args: {
  rawCode: string;
  idNumber: string;
  baseFee: number;
  mode: PromoMode;
}): PromoApplyResult {
  const empty: PromoApplyResult = {
    valid: false,
    baseFee: args.baseFee,
    discountPercent: 0,
    discountAmount: 0,
    payableFee: args.baseFee,
    isFreeCover: false,
    generosityOnly: false,
  };

  const code = normalizePromoCode(args.rawCode);
  if (!code) return empty;

  const rule = PROMO_CODES[code];
  if (!rule) return { ...empty, code, reason: 'Promo code not recognised.' };

  const age = ageFromSaIdNumber(args.idNumber);
  if (age == null) return { ...empty, code, reason: 'Please enter a valid South African ID number first.' };

  if (rule.generosityOnly && args.mode !== 'generosity') {
    return {
      ...empty,
      code,
      reason: 'This code only works on a Generosity Reward signup.',
      generosityOnly: true,
    };
  }

  const bracket = rule.brackets.find((b) => age >= b.minAge && age <= b.maxAge);
  if (!bracket) {
    return {
      ...empty,
      code,
      reason: `Age ${age} is outside this code's range (${rule.minAge}–${rule.maxAge}).`,
    };
  }

  const discountAmount = Math.round((args.baseFee * bracket.discountPercent) / 100);
  const payableFee = Math.max(args.baseFee - discountAmount, 0);

  return {
    valid: true,
    code,
    baseFee: args.baseFee,
    discountPercent: bracket.discountPercent,
    discountAmount,
    payableFee,
    pearlActivationFee: rule.activistOptIn ? PEARL_ACTIVIST_FEE : undefined,
    isFreeCover: rule.freeCover && bracket.discountPercent === 100,
    generosityOnly: rule.generosityOnly,
    ageBracket: bracket.bracket,
  };
}

// Member referral-style code: "FirstName" + two random digits (e.g. Xolani47)
export function generateMemberPromoCode(firstName: string): string {
  const cleaned = (firstName || '').trim().split(/\s+/)[0] || 'Member';
  const safe = cleaned.replace(/[^A-Za-z]/g, '') || 'Member';
  const titleCase = safe.charAt(0).toUpperCase() + safe.slice(1).toLowerCase();
  const digits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${titleCase}${digits}`;
}
