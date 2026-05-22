'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Plus, Trash, Shield, Crown, CreditCard, Bank } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import { createAdditionalPolicy } from '@/lib/firebase-service';
import { PLUS_TIERS, GOLD_TIERS } from '@/lib/constants';
import type { Dependent, AdditionalPolicyFormData } from '@/lib/types';
import {
  EFT_DETAILS,
  YOCO_HANDLING_FEE_RATE,
  calcYocoFee,
  type PaymentMethod,
} from '@/lib/pearl-types';

type PlanType = 'plus' | 'gold';

const inputCls =
  'w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/60 text-xs font-semibold uppercase tracking-wide block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function formatCurrency(value: number): string {
  return `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
}

export default function NewPackagePage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  const [mainMemberName, setMainMemberName] = useState('');
  const [mainMemberIdNumber, setMainMemberIdNumber] = useState('');
  const [mainMemberPhone, setMainMemberPhone] = useState('');

  const [benName, setBenName] = useState('');
  const [benId, setBenId] = useState('');
  const [benRelation, setBenRelation] = useState('');

  const [showSpouse, setShowSpouse] = useState(false);
  const [spouseFirstName, setSpouseFirstName] = useState('');
  const [spouseSurname, setSpouseSurname] = useState('');
  const [spouseIdNumber, setSpouseIdNumber] = useState('');
  const [spouseCell, setSpouseCell] = useState('');

  const [dependents, setDependents] = useState<Dependent[]>([]);

  const [showExtended, setShowExtended] = useState(false);
  const [extName, setExtName] = useState('');
  const [extId, setExtId] = useState('');

  const [forSelf, setForSelf] = useState<boolean | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yoco');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const tiers = planType === 'gold' ? GOLD_TIERS : PLUS_TIERS;
  const selectedTier = tiers.find((t) => t.name === tier) ?? null;
  const baseActivationFee = selectedTier?.feeAmount ?? 0;
  const hasExtendedFamily = showExtended && Boolean(extName);
  const extendedFamilyFee = hasExtendedFamily ? baseActivationFee * 0.2 : 0;
  const totalApplicationFee = baseActivationFee + extendedFamilyFee;
  const yocoHandlingFee =
    paymentMethod === 'yoco' ? calcYocoFee(totalApplicationFee) : 0;
  const payableTotal = totalApplicationFee + yocoHandlingFee;

  function addDependent() {
    if (dependents.length >= 4) return;
    setDependents([...dependents, { name: '', relation: '', id: '' }]);
  }

  function updateDependent(index: number, field: keyof Dependent, value: string) {
    setDependents((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function removeDependent(index: number) {
    setDependents((prev) => prev.filter((_, i) => i !== index));
  }

  function fillFromOwnDetails() {
    if (!userData) return;
    setMainMemberName(userData.fullName || '');
    setMainMemberIdNumber(userData.idNumber || '');
    setMainMemberPhone(userData.phone || '');
  }

  async function handleSubmit() {
    setError('');
    if (!user || !userData) return;
    if (!planType || !tier) {
      setError('Please choose a plan and tier.');
      return;
    }
    if (!mainMemberName || !mainMemberIdNumber) {
      setError('Please enter the main member name and ID number.');
      return;
    }
    if (!benName || !benId || !benRelation) {
      setError('Please fill in beneficiary details.');
      return;
    }

    setSubmitting(true);
    const formData: AdditionalPolicyFormData = {
      planType,
      tier,
      mainMemberName,
      mainMemberIdNumber,
      mainMemberPhone,
      beneficiary: { name: benName, idNumber: benId, relation: benRelation },
      spouse: showSpouse && spouseFirstName
        ? { firstName: spouseFirstName, surname: spouseSurname, idNumber: spouseIdNumber, cell: spouseCell }
        : null,
      dependents: dependents.filter((d) => d.name),
      extendedFamily: hasExtendedFamily ? { name: extName, idNumber: extId } : null,
      baseActivationFee,
      extendedFamilyFee,
      totalApplicationFee,
      paymentMethod,
      customerEmail: userData.email || '',
    };

    const createRes = await createAdditionalPolicy(user.uid, formData);
    if (!createRes.success || !createRes.policyId) {
      setSubmitting(false);
      setError(createRes.error || 'Could not create policy. Please try again.');
      return;
    }

    if (paymentMethod === 'eft') {
      router.push(`/invoice/additional-policy/${createRes.policyId}`);
      return;
    }

    const checkoutRes = await fetch('/api/create-additional-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyId: createRes.policyId,
        userId: user.uid,
        amountInCents: Math.round(payableTotal * 100),
      }),
    });
    const data = await checkoutRes.json();
    if (!checkoutRes.ok || !data.success) {
      setSubmitting(false);
      setError(data.error || 'Could not start payment. Please try again.');
      return;
    }
    window.location.href = data.redirectUrl;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#191c1f] flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || !userData) return null;

  return (
    <div className="min-h-screen bg-[#191c1f] text-white">
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#191c1f] border-b border-white/10 h-14 flex items-center px-5 gap-3">
        <Link href="/dashboard" className="text-white/70 hover:text-white flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="ml-auto font-display font-extrabold text-white text-base">
          Go<span className="text-[#f3cc20]">Direct</span>247
        </div>
      </nav>

      <div className="pt-14 max-w-lg mx-auto px-4 py-6 pb-32">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-white text-2xl mb-1">Buy another package</h1>
          <p className="text-white/50 text-sm">
            Add a new policy alongside your existing cover. For yourself or someone in your family.
          </p>
        </div>

        {/* Who is this for */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
            Who is this policy for?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setForSelf(true); fillFromOwnDetails(); }}
              className={`border rounded-xl py-3 px-3 text-left text-sm transition-all ${
                forSelf === true
                  ? 'border-[#f3cc20] bg-[#f3cc20]/10 text-[#f3cc20]'
                  : 'border-white/15 text-white/60 hover:border-white/30'
              }`}
            >
              <p className="font-bold">Myself</p>
              <p className="text-[10px] mt-0.5 opacity-75">Additional cover for me</p>
            </button>
            <button
              onClick={() => {
                setForSelf(false);
                setMainMemberName('');
                setMainMemberIdNumber('');
                setMainMemberPhone('');
              }}
              className={`border rounded-xl py-3 px-3 text-left text-sm transition-all ${
                forSelf === false
                  ? 'border-[#f3cc20] bg-[#f3cc20]/10 text-[#f3cc20]'
                  : 'border-white/15 text-white/60 hover:border-white/30'
              }`}
            >
              <p className="font-bold">Someone else</p>
              <p className="text-[10px] mt-0.5 opacity-75">Family member or friend</p>
            </button>
          </div>
        </div>

        {/* Plan selection */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Choose plan</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setPlanType('plus'); setTier(null); }}
              className={`border-2 rounded-2xl p-4 text-left transition-all ${
                planType === 'plus' ? 'border-[#0682B4] bg-sky-900/20' : 'border-white/15'
              }`}
            >
              <Shield className="text-sky-300 mb-2" size={20} />
              <p className="font-display font-bold text-white text-sm">Plus Plan</p>
              <p className="text-white/40 text-[10px] mt-0.5">Cashback from month 4</p>
            </button>
            <button
              onClick={() => { setPlanType('gold'); setTier(null); }}
              className={`border-2 rounded-2xl p-4 text-left transition-all ${
                planType === 'gold' ? 'border-[#f3cc20] bg-[#f3cc20]/5' : 'border-white/15'
              }`}
            >
              <Crown className="text-[#f3cc20] mb-2" size={20} />
              <p className="font-display font-bold text-white text-sm">Gold Plan</p>
              <p className="text-white/40 text-[10px] mt-0.5">Payout every 3 months</p>
            </button>
          </div>

          {planType && (
            <>
              <p className="text-white/50 text-xs uppercase tracking-wide font-semibold mb-2">
                Select tier
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tiers.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTier(t.name)}
                    className={`border rounded-xl py-2.5 px-3 text-left transition-all ${
                      tier === t.name
                        ? 'border-[#f3cc20] text-[#f3cc20] bg-[#f3cc20]/10'
                        : 'border-white/15 text-white/60 hover:border-[#f3cc20]/40'
                    }`}
                  >
                    <p className="text-xs font-semibold">{t.name}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">{t.cover} · {t.fee}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main member details */}
        {planType && tier && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
              Main member (policy holder)
            </p>
            <div className="space-y-3">
              <Field label="Full name & surname">
                <input
                  type="text"
                  value={mainMemberName}
                  onChange={(e) => setMainMemberName(e.target.value)}
                  placeholder="e.g. Thabo Nkosi"
                  className={inputCls}
                />
              </Field>
              <Field label="ID number">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={mainMemberIdNumber}
                  onChange={(e) => setMainMemberIdNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="13-digit South African ID"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone number">
                <input
                  type="tel"
                  value={mainMemberPhone}
                  onChange={(e) => setMainMemberPhone(e.target.value)}
                  placeholder="e.g. 082 123 4567"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Beneficiary */}
        {planType && tier && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Beneficiary</p>
            <div className="space-y-3">
              <Field label="Beneficiary name">
                <input
                  type="text"
                  value={benName}
                  onChange={(e) => setBenName(e.target.value)}
                  className={inputCls}
                  placeholder="Full name & surname"
                />
              </Field>
              <Field label="Beneficiary ID number">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={benId}
                  onChange={(e) => setBenId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className={inputCls}
                />
              </Field>
              <Field label="Relationship">
                <input
                  type="text"
                  value={benRelation}
                  onChange={(e) => setBenRelation(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Spouse, Child, Parent"
                />
              </Field>
            </div>
          </div>
        )}

        {/* Spouse (optional) */}
        {planType && tier && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Spouse (optional)</p>
              <button
                type="button"
                onClick={() => setShowSpouse((v) => !v)}
                className="text-[#f3cc20] text-xs font-semibold"
              >
                {showSpouse ? 'Remove' : 'Add spouse'}
              </button>
            </div>
            {showSpouse && (
              <div className="space-y-3">
                <Field label="First name">
                  <input type="text" value={spouseFirstName} onChange={(e) => setSpouseFirstName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Surname">
                  <input type="text" value={spouseSurname} onChange={(e) => setSpouseSurname(e.target.value)} className={inputCls} />
                </Field>
                <Field label="ID number">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={spouseIdNumber}
                    onChange={(e) => setSpouseIdNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Cell number">
                  <input type="tel" value={spouseCell} onChange={(e) => setSpouseCell(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* Dependents */}
        {planType && tier && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                Dependents (optional, up to 4)
              </p>
              <button
                type="button"
                onClick={addDependent}
                disabled={dependents.length >= 4}
                className="text-[#f3cc20] text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {dependents.length === 0 && (
              <p className="text-white/30 text-xs">No dependents added yet.</p>
            )}
            <div className="space-y-3">
              {dependents.map((d, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white/60 text-xs font-semibold">Dependent {i + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeDependent(i)}
                      className="text-[#e23b4a] text-xs flex items-center gap-1"
                    >
                      <Trash size={12} /> Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => updateDependent(i, 'name', e.target.value)}
                    placeholder="Full name"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={d.relation}
                    onChange={(e) => updateDependent(i, 'relation', e.target.value)}
                    placeholder="Relation (e.g. Child)"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={d.id}
                    onChange={(e) => updateDependent(i, 'id', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    placeholder="ID number"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extended family (optional) */}
        {planType && tier && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                  Extended family (optional)
                </p>
                <p className="text-white/30 text-[10px] mt-0.5">
                  Adds 20% to the activation fee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExtended((v) => !v)}
                className="text-[#f3cc20] text-xs font-semibold"
              >
                {showExtended ? 'Remove' : 'Add'}
              </button>
            </div>
            {showExtended && (
              <div className="space-y-3">
                <Field label="Name">
                  <input type="text" value={extName} onChange={(e) => setExtName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="ID number">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={extId}
                    onChange={(e) => setExtId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* Payment method */}
        {planType && tier && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
              Payment method
            </p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('yoco')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  paymentMethod === 'yoco'
                    ? 'bg-[#f3cc20]/10 border-[#f3cc20]'
                    : 'bg-white/5 border-white/15 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard
                    size={18}
                    weight="fill"
                    className={paymentMethod === 'yoco' ? 'text-[#f3cc20]' : 'text-white/60'}
                  />
                  <span className="text-white font-semibold text-sm">Card · Yoco</span>
                </div>
                <p className="text-white/50 text-xs">
                  Instant card payment. <span className="text-[#f3cc20]">{(YOCO_HANDLING_FEE_RATE * 100).toFixed(1)}% fee</span>.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('eft')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  paymentMethod === 'eft'
                    ? 'bg-[#f3cc20]/10 border-[#f3cc20]'
                    : 'bg-white/5 border-white/15 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bank
                    size={18}
                    weight="fill"
                    className={paymentMethod === 'eft' ? 'text-[#f3cc20]' : 'text-white/60'}
                  />
                  <span className="text-white font-semibold text-sm">EFT · Bank Zero</span>
                </div>
                <p className="text-white/50 text-xs">
                  Manual bank transfer. <span className="text-[#00a87e]">R0.00 fee</span>.
                </p>
              </button>
            </div>

            {paymentMethod === 'eft' && (
              <div className="bg-[#191c1f] border border-white/10 rounded-xl p-4 mt-3 text-xs">
                <p className="text-[#f3cc20] font-semibold mb-2">EFT banking details</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-white/70">
                  <span className="text-white/45">Bank</span>
                  <span className="text-white font-medium">{EFT_DETAILS.bankName}</span>
                  <span className="text-white/45">Account holder</span>
                  <span className="text-white font-medium">{EFT_DETAILS.accountHolder}</span>
                  <span className="text-white/45">Account number</span>
                  <span className="text-white font-mono">{EFT_DETAILS.accountNumber}</span>
                  <span className="text-white/45">Branch code</span>
                  <span className="text-white font-mono">{EFT_DETAILS.branchCode}</span>
                </div>
                <p className="text-white/40 text-[11px] mt-3">
                  After you submit, we&apos;ll generate a downloadable invoice with a
                  unique reference. Use that as the EFT payment reference.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Summary + Pay */}
        {planType && tier && (
          <div className="bg-[#f3cc20]/10 border border-[#f3cc20]/40 rounded-2xl p-5 mb-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Summary</p>
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-white/60">{tier}</span>
                <span className="text-white font-semibold">{formatCurrency(baseActivationFee)}</span>
              </div>
              {hasExtendedFamily && (
                <div className="flex justify-between">
                  <span className="text-white/60">Extended family (+20%)</span>
                  <span className="text-white font-semibold">{formatCurrency(extendedFamilyFee)}</span>
                </div>
              )}
              {yocoHandlingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60">Yoco handling fee ({(YOCO_HANDLING_FEE_RATE * 100).toFixed(1)}%)</span>
                  <span className="text-white font-semibold">{formatCurrency(yocoHandlingFee)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                <span className="text-white font-bold">Total</span>
                <span className="text-[#f3cc20] font-display font-extrabold text-lg">
                  {formatCurrency(payableTotal)}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-[#e23b4a] text-xs mb-3 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#f3cc20] text-[#191c1f] font-display font-bold py-3.5 rounded-xl hover:bg-[#c9a800] transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting
                ? (paymentMethod === 'eft' ? 'Generating invoice…' : 'Starting payment…')
                : paymentMethod === 'eft'
                  ? (<>Generate EFT invoice ({formatCurrency(payableTotal)}) <ArrowRight size={16} /></>)
                  : (<>Pay {formatCurrency(payableTotal)} by Card <ArrowRight size={16} /></>)}
            </button>
            <p className="text-white/30 text-xs text-center mt-2">
              {paymentMethod === 'eft'
                ? 'Cover activates within 1 working day of EFT clearing.'
                : 'Secured by Yoco · Card payments accepted'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
