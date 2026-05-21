'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft, Camera, CheckCircle, Eye, EyeSlash, Microphone, PaperPlaneTilt, UploadSimple } from '@phosphor-icons/react';
import { Shield } from '@phosphor-icons/react';
import { signUpUser } from '@/lib/firebase-service';
import { PLUS_TIERS } from '@/lib/constants';
import type { Dependent, PolicyDocuments, SignUpFormData, UploadedDocument } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanType = 'plus' | 'gold';
type Step = 1 | 2 | 3 | 4;
type SpeechField = string | null;

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultListItem {
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResultListItem;
    length: number;
  };
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface PersonalForm {
  name: string;
  idNumber: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  employment: string;
  source: string;
  referral: string;
}

interface BeneficiaryForm {
  name: string;
  idNumber: string;
  relation: string;
}

interface SpouseForm {
  firstName: string;
  surname: string;
  idNumber: string;
  cell: string;
}

interface ExtendedForm {
  name: string;
  idNumber: string;
}

// ── Input helper ──────────────────────────────────────────────────────────────

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

const inputCls =
  'w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/30 text-sm transition-all';
const selectCls =
  'w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3.5 text-white text-sm transition-all';

function formatCurrency(value: number): string {
  return `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function resizeSelfie(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selfie.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load selfie.'));
      img.onload = () => {
        const maxWidth = 720;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare selfie.'));
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

function readDocumentFile(file: File, label: string): Promise<UploadedDocument> {
  return new Promise((resolve, reject) => {
    if (file.size > 900000) {
      reject(new Error('Please upload a document smaller than 900KB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read document.'));
    reader.onload = () => {
      resolve({
        label,
        fileName: file.name,
        dataUrl: String(reader.result),
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  });
}

function DocumentUploadField({
  label,
  required,
  document,
  onChange,
}: {
  label: string;
  required?: boolean;
  document: UploadedDocument | null | undefined;
  onChange: (document: UploadedDocument | null) => void;
}) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      onChange(await readDocumentFile(file, label));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not upload document.');
      event.target.value = '';
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-white text-xs font-semibold">{label}</p>
          <p className="text-white/35 text-[10px]">{required ? 'Required' : 'Optional'} · PDF, JPG or PNG</p>
        </div>
        {document && <CheckCircle size={16} weight="fill" className="text-[#00a87e] flex-shrink-0" />}
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/10">
        <UploadSimple size={14} />
        {document ? 'Replace document' : 'Upload document'}
        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
      </label>
      {document && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-[10px] text-white/45">{document.fileName}</p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] font-semibold text-[#e23b4a]/80 hover:text-[#e23b4a]"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [personal, setPersonal] = useState<PersonalForm>({
    name: '', idNumber: '', phone: '', email: '', password: '', confirmPassword: '',
    employment: '', source: '', referral: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [beneficiary, setBeneficiary] = useState<BeneficiaryForm>({ name: '', idNumber: '', relation: '' });
  const [showSpouse, setShowSpouse] = useState(false);
  const [spouse, setSpouse] = useState<SpouseForm>({ firstName: '', surname: '', idNumber: '', cell: '' });
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showExtended, setShowExtended] = useState(false);
  const [extended, setExtended] = useState<ExtendedForm>({ name: '', idNumber: '' });
  const [documents, setDocuments] = useState<PolicyDocuments>({
    policyHolderId: null,
    spouseId: null,
    dependentIds: [],
    extendedFamilyId: null,
  });
  const [identitySelfieDataUrl, setIdentitySelfieDataUrl] = useState<string | null>(null);
  const [selfieError, setSelfieError] = useState('');
  const [selfieProcessing, setSelfieProcessing] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const [listeningField, setListeningField] = useState<SpeechField>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [checkingOtp, setCheckingOtp] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'plus' || plan === 'gold') {
      setPlanType('plus');
    }
  }, [searchParams]);

  const tiers = PLUS_TIERS;
  const progress = (step / 4) * 100;
  const selectedTier = tiers.find((t) => t.name === tier) ?? null;
  const baseActivationFee = selectedTier?.feeAmount ?? 0;
  const hasExtendedFamily = showExtended && Boolean(extended.name);
  const extendedFamilyFee = hasExtendedFamily ? baseActivationFee * 0.2 : 0;
  const totalApplicationFee = baseActivationFee + extendedFamilyFee;

  async function handleSendOtp() {
    setSendingOtp(true);
    setOtpError('');
    const res = await fetch('/api/verify/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: personal.phone }),
    });
    const data = await res.json();
    setSendingOtp(false);
    if (!res.ok || data.error) {
      setOtpError(data.error || 'Could not send OTP. Check your number and try again.');
    } else {
      setOtpSent(true);
    }
  }

  async function handleCheckOtp() {
    setCheckingOtp(true);
    setOtpError('');
    const res = await fetch('/api/verify/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: personal.phone, code: otpCode }),
    });
    const data = await res.json();
    setCheckingOtp(false);
    if (!res.ok || !data.valid) {
      setOtpError(data.error || 'Incorrect code. Please try again.');
    } else {
      setPhoneVerified(true);
      setOtpError('');
    }
  }

  function nextStep() {
    if (step === 1 && (!planType || !tier)) return;
    if (step === 2) {
      if (!personal.name || !personal.idNumber || !personal.email) {
        alert('Please fill in your name, ID number and email.');
        return;
      }
      if (!personal.password || personal.password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }
      if (personal.password !== personal.confirmPassword) {
        alert('Please make sure both passwords match.');
        return;
      }
      if (!phoneVerified) {
        alert('Please verify your phone number before continuing.');
        return;
      }
    }
    if (step === 3 && !documents.policyHolderId) {
      alert('Please upload the policy holder ID document before reviewing your application.');
      return;
    }
    if (step < 4) setStep((s) => (s + 1) as Step);
  }

  function prevStep() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function addDependent() {
    if (dependents.length >= 4) return;
    setDependents([...dependents, { name: '', relation: '', id: '' }]);
  }

  function updateDependent(index: number, field: keyof Dependent, value: string) {
    setDependents((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function removeDependent(index: number) {
    setDependents((prev) => prev.filter((_, i) => i !== index));
    setDocuments((prev) => ({
      ...prev,
      dependentIds: (prev.dependentIds || []).filter((_, i) => i !== index),
    }));
  }

  function updateDependentDocument(index: number, document: UploadedDocument | null) {
    setDocuments((prev) => {
      const next = [...(prev.dependentIds || [])];
      if (document) {
        next[index] = document;
      } else {
        next.splice(index, 1);
      }
      return { ...prev, dependentIds: next };
    });
  }

  function startDictation(field: string, onText: (text: string) => void) {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      alert('Voice typing is not supported on this browser. Please type the information manually.');
      return;
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onend = null;
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = 'en-ZA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
      if (transcript) onText(transcript);
    };
    recognition.onerror = () => setListeningField(null);
    recognition.onend = () => setListeningField(null);
    setListeningField(field);
    recognition.start();
  }

  function dictationButton(field: string, onText: (text: string) => void) {
    const active = listeningField === field;
    return (
      <button
        key={field}
        type="button"
        onClick={() => startDictation(field, onText)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
          active ? 'text-[#f3cc20]' : 'text-white/45 hover:text-white/75'
        }`}
        aria-label="Speak this field"
        title="Speak this field"
      >
        <Microphone size={18} weight={active ? 'fill' : 'regular'} />
      </button>
    );
  }

  async function handleSelfieFile(file: File | null) {
    if (!file) return;
    setSelfieProcessing(true);
    setSelfieError('');
    try {
      setIdentitySelfieDataUrl(await resizeSelfie(file));
    } catch (err) {
      setSelfieError(err instanceof Error ? err.message : 'Could not prepare selfie.');
    }
    setSelfieProcessing(false);
    if (selfieInputRef.current) selfieInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!tcAccepted) { alert('Please accept the terms and conditions.'); return; }
    if (!planType || !tier) return;
    if (!documents.policyHolderId) {
      alert('Please upload the policy holder ID document before submitting.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    const formData: SignUpFormData = {
      fullName: personal.name,
      phone: personal.phone,
      idNumber: personal.idNumber,
      employmentStatus: personal.employment,
      source: personal.source,
      referredByName: personal.referral,
      planType,
      tier,
      beneficiary: beneficiary.name ? { name: beneficiary.name, idNumber: beneficiary.idNumber, relation: beneficiary.relation } : null,
      spouse: showSpouse && spouse.firstName ? { firstName: spouse.firstName, surname: spouse.surname, idNumber: spouse.idNumber, cell: spouse.cell } : null,
      dependents: dependents.filter((d) => d.name),
      extendedFamily: showExtended && extended.name ? { name: extended.name, idNumber: extended.idNumber } : null,
      documents,
      baseActivationFee,
      extendedFamilyFee,
      totalApplicationFee,
      identitySelfieDataUrl,
    };

    const result = await signUpUser(personal.email, personal.password, formData);
    setSubmitting(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setSubmitError(result.error || 'Could not create account. Please try again.');
    }
  }

  if (success) {
    return (
      <div className="w-full text-center ani1 py-10">
        <div className="w-20 h-20 bg-[#00a87e]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-[#00a87e]" />
        </div>
        <h2 className="font-display font-extrabold text-white text-3xl mb-3">Application submitted!</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          We&apos;ve received your application. Keep an eye on your phone — we&apos;ll send you a
          message to confirm your policy. Your cover activates on your payment date.
        </p>
        <Link
          href="/"
          className="inline-block border-2 border-white/25 text-white font-medium px-8 py-3.5 rounded-full hover:border-white/50 hover:bg-white/5 transition-all text-sm"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-5 py-10 max-w-lg mx-auto w-full">

      {/* Step 1: Plan selection */}
      {step === 1 && (
        <div className="w-full ani1">
          {/* Pre-launch banner */}
          <div className="bg-[#f3cc20]/[0.06] border border-[#f3cc20]/20 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#f3cc20] text-[#191c1f] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Limited Offer
              </span>
              <span className="text-[#f3cc20]/70 text-[10px] font-semibold">Ends 30 May 2026</span>
            </div>
            <h3 className="font-display font-bold text-[#f3cc20] text-lg mb-1 tracking-tight">
              Pre Launch SPECIAL
            </h3>
            <p className="text-white/60 text-xs leading-relaxed">
              <strong className="text-[#f3cc20]">Generosity Reward:</strong> Join, Activate = R650,
              Gift 2 Families, Activate with R650 x 2 = R1,300 For Them. Be Rewarded With A Cashback
              Of All Your 3 Activation Fees = R1,950. Plus A Thank Reward Worth R1,050 More.{' '}
              <strong className="text-[#f3cc20]">Total Reward: R3,000</strong> (paid after 6 weeks)
              including a <strong className="text-white">R10,000 Free Funeral Cover FOR the Whole Year</strong> for All 3
              Families.
            </p>
          </div>

          <h2 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2 tracking-tight">
            Choose your plan
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Select the Plus Plan tier that fits your budget.
          </p>

          {/* Plan card */}
          <div className="mb-6">
            <div className="border-2 border-[#0682B4] bg-sky-900/20 rounded-2xl p-5 text-left">
              <Shield className="text-sky-300 mb-3" size={24} />
              <div className="font-display font-bold text-white text-base">Plus Plan</div>
              <div className="text-white/40 text-xs mt-1">Cashback from month 4 · refer &amp; earn</div>
            </div>
          </div>

          {/* Tier grid */}
          {planType && (
            <div className="mb-6">
              <p className="text-white/50 text-xs uppercase tracking-wide font-semibold mb-3">
                Select your tier
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tiers.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTier(t.name)}
                    className={`border rounded-xl py-3 px-3 text-left transition-all ${
                      tier === t.name
                        ? 'border-[#f3cc20] text-[#f3cc20] bg-[#f3cc20]/10'
                        : 'border-white/15 text-white/60 hover:border-[#f3cc20]/40 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold">{t.name}</div>
                    <div className="text-[10px] text-white/50 mt-1 leading-tight">
                      {t.cover} cover · {t.fee}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {planType && tier && (
            <button
              onClick={nextStep}
              className="w-full bg-[#f3cc20] text-[#191c1f] font-display font-bold py-4 rounded-full hover:bg-[#c9a800] transition-all flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* Step 2: Personal details */}
      {step === 2 && (
        <div className="w-full ani1">
          <h2 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2 tracking-tight">
            About you
          </h2>
          <p className="text-white/50 text-sm mb-8">Your details for your policy.</p>

          <div className="space-y-4 mb-6">
            <Field label="Full name & surname">
              <div className="relative">
                <input type="text" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} placeholder="e.g. Thabo Nkosi" className={`${inputCls} pr-12`} />
                {dictationButton("personal-name", (text) => setPersonal({ ...personal, name: text }))}
              </div>
            </Field>
            <Field label="ID number">
              <div className="relative">
                <input type="text" inputMode="numeric" maxLength={13} value={personal.idNumber} onChange={(e) => setPersonal({ ...personal, idNumber: e.target.value })} placeholder="13-digit South African ID" className={`${inputCls} pr-12`} />
                {dictationButton("personal-id", (text) => setPersonal({ ...personal, idNumber: text.replace(/\D/g, '').slice(0, 13) }))}
              </div>
            </Field>
            <Field label="Phone number">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={personal.phone}
                      onChange={(e) => {
                        setPersonal({ ...personal, phone: e.target.value });
                        setPhoneVerified(false);
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      placeholder="e.g. 071 234 5678"
                      className={`${inputCls} pr-12`}
                      disabled={phoneVerified}
                    />
                    {!phoneVerified && (
                      <>
                        {dictationButton("personal-phone", (text) => {
                          setPersonal({ ...personal, phone: text });
                          setPhoneVerified(false);
                          setOtpSent(false);
                          setOtpCode('');
                        })}
                      </>
                    )}
                  </div>
                  {!phoneVerified ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || personal.phone.replace(/\D/g, '').length < 9}
                      className="flex-shrink-0 bg-white/10 border border-white/15 text-white/70 text-xs font-semibold px-4 rounded-xl hover:bg-white/20 disabled:opacity-40 transition-all"
                    >
                      {sendingOtp ? '...' : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 text-[#00a87e] text-xs font-semibold flex-shrink-0">
                      <CheckCircle size={16} weight="fill" /> Verified
                    </div>
                  )}
                </div>
                {otpSent && !phoneVerified && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className={`${inputCls} flex-1 tracking-[0.3em] text-center`}
                    />
                    <button
                      type="button"
                      onClick={handleCheckOtp}
                      disabled={checkingOtp || otpCode.length !== 6}
                      className="flex-shrink-0 bg-[#f3cc20] text-[#191c1f] font-bold text-xs px-5 rounded-xl disabled:opacity-40 transition-all"
                    >
                      {checkingOtp ? '...' : 'Confirm'}
                    </button>
                  </div>
                )}
                {otpError && <p className="text-[#e23b4a] text-xs">{otpError}</p>}
              </div>
            </Field>
            <Field label="Email address">
              <div className="relative">
                <input type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} placeholder="you@example.com" className={`${inputCls} pr-12`} />
                {dictationButton("personal-email", (text) => setPersonal({ ...personal, email: text.toLowerCase().replace(/\s+/g, '') }))}
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={personal.password}
                  onChange={(e) => setPersonal({ ...personal, password: e.target.value })}
                  placeholder="Create a password (min 6 chars)"
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password">
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={personal.confirmPassword}
                  onChange={(e) => setPersonal({ ...personal, confirmPassword: e.target.value })}
                  placeholder="Repeat your password"
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((show) => !show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Employment status">
              <select value={personal.employment} onChange={(e) => setPersonal({ ...personal, employment: e.target.value })} className={selectCls}>
                <option value="" className="bg-[#191c1f]">Select status</option>
                {['Full Time', 'Part Time', 'Seasonal', 'Grant Recipient', 'Pensioner'].map((o) => (
                  <option key={o} value={o} className="bg-[#191c1f]">{o}</option>
                ))}
              </select>
            </Field>
            <Field label="How did you hear about us?">
              <select value={personal.source} onChange={(e) => setPersonal({ ...personal, source: e.target.value })} className={selectCls}>
                <option value="" className="bg-[#191c1f]">Select source</option>
                {['Facebook', 'TikTok', 'Google Ads', 'A Friend', 'A Representative', 'WhatsApp'].map((o) => (
                  <option key={o} value={o} className="bg-[#191c1f]">{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Referred by (optional)">
              <div className="relative">
                <input type="text" value={personal.referral} onChange={(e) => setPersonal({ ...personal, referral: e.target.value })} placeholder="Name of person who referred you" className={`${inputCls} pr-12`} />
                {dictationButton("personal-referral", (text) => setPersonal({ ...personal, referral: text }))}
              </div>
            </Field>
          </div>

          <div className="flex gap-3">
            <button onClick={prevStep} className="flex-shrink-0 border-2 border-white/20 text-white py-4 px-6 rounded-full hover:border-white/40 transition-all">
              <ArrowLeft size={16} />
            </button>
            <button onClick={nextStep} className="flex-1 bg-[#f3cc20] text-[#191c1f] font-display font-bold py-4 rounded-full hover:bg-[#c9a800] transition-all flex items-center justify-center gap-2">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Family */}
      {step === 3 && (
        <div className="w-full ani1">
          <h2 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2 tracking-tight">
            Your family
          </h2>
          <p className="text-white/50 text-sm mb-8">Who are you covering? Add as many as apply.</p>

          {/* Beneficiary */}
          <div className="mb-5">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Main beneficiary</p>
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="relative">
                <input type="text" value={beneficiary.name} onChange={(e) => setBeneficiary({ ...beneficiary, name: e.target.value })} placeholder="Beneficiary full name" className={`${inputCls} pr-12`} />
                {dictationButton("beneficiary-name", (text) => setBeneficiary({ ...beneficiary, name: text }))}
              </div>
              <div className="relative">
                <input type="text" value={beneficiary.idNumber} onChange={(e) => setBeneficiary({ ...beneficiary, idNumber: e.target.value })} placeholder="Beneficiary ID number" className={`${inputCls} pr-12`} />
                {dictationButton("beneficiary-id", (text) => setBeneficiary({ ...beneficiary, idNumber: text.replace(/\D/g, '').slice(0, 13) }))}
              </div>
              <select value={beneficiary.relation} onChange={(e) => setBeneficiary({ ...beneficiary, relation: e.target.value })} className={selectCls}>
                <option value="" className="bg-[#191c1f]">Relationship to beneficiary</option>
                {['Partner', 'Child', 'Parent', 'Other'].map((o) => (
                  <option key={o} value={o} className="bg-[#191c1f]">{o}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Spouse */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Spouse</p>
              <button
                onClick={() => {
                  setShowSpouse(!showSpouse);
                  if (showSpouse) setDocuments((prev) => ({ ...prev, spouseId: null }));
                }}
                className="bg-white/10 text-white/60 text-xs px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"
              >
                {showSpouse ? '− Remove' : '+ Add spouse'}
              </button>
            </div>
            {showSpouse && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="relative">
                  <input type="text" value={spouse.firstName} onChange={(e) => setSpouse({ ...spouse, firstName: e.target.value })} placeholder="Spouse first name" className={`${inputCls} pr-12`} />
                  {dictationButton("spouse-first", (text) => setSpouse({ ...spouse, firstName: text }))}
                </div>
                <div className="relative">
                  <input type="text" value={spouse.surname} onChange={(e) => setSpouse({ ...spouse, surname: e.target.value })} placeholder="Spouse surname" className={`${inputCls} pr-12`} />
                  {dictationButton("spouse-surname", (text) => setSpouse({ ...spouse, surname: text }))}
                </div>
                <div className="relative">
                  <input type="text" value={spouse.idNumber} onChange={(e) => setSpouse({ ...spouse, idNumber: e.target.value })} placeholder="Spouse ID number" className={`${inputCls} pr-12`} />
                  {dictationButton("spouse-id", (text) => setSpouse({ ...spouse, idNumber: text.replace(/\D/g, '').slice(0, 13) }))}
                </div>
                <div className="relative">
                  <input type="tel" value={spouse.cell} onChange={(e) => setSpouse({ ...spouse, cell: e.target.value })} placeholder="Spouse cell number" className={`${inputCls} pr-12`} />
                  {dictationButton("spouse-cell", (text) => setSpouse({ ...spouse, cell: text }))}
                </div>
              </div>
            )}
          </div>

          {/* Dependents */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                Dependents <span className="text-white/30 normal-case font-normal">(up to 4)</span>
              </p>
              <button
                onClick={addDependent}
                disabled={dependents.length >= 4}
                className="bg-white/10 text-white/60 text-xs px-3 py-1.5 rounded-full hover:bg-white/20 transition-all disabled:opacity-40"
              >
                + Add dependent
              </button>
            </div>
            <div className="space-y-3">
              {dependents.map((dep, i) => (
                <div key={i} className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-semibold">Dependent {i + 1}</span>
                    <button
                      onClick={() => removeDependent(i)}
                      className="text-[#e23b4a]/60 hover:text-[#e23b4a] text-xs"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <div className="relative">
                    <input type="text" value={dep.name} onChange={(e) => updateDependent(i, 'name', e.target.value)} placeholder="Full name" className={`${inputCls} pr-12`} />
                    {dictationButton(`dependent-${i}-name`, (text) => updateDependent(i, 'name', text))}
                  </div>
                  <div className="relative">
                    <input type="text" value={dep.relation} onChange={(e) => updateDependent(i, 'relation', e.target.value)} placeholder="Relationship (e.g. Son, Daughter)" className={`${inputCls} pr-12`} />
                    {dictationButton(`dependent-${i}-relation`, (text) => updateDependent(i, 'relation', text))}
                  </div>
                  <div className="relative">
                    <input type="text" value={dep.id} onChange={(e) => updateDependent(i, 'id', e.target.value)} placeholder="ID number" className={`${inputCls} pr-12`} />
                    {dictationButton(`dependent-${i}-id`, (text) => updateDependent(i, 'id', text.replace(/\D/g, '').slice(0, 13)))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extended family */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                Extended family <span className="text-white/30 normal-case font-normal">(optional)</span>
              </p>
              <button
                onClick={() => {
                  setShowExtended(!showExtended);
                  if (showExtended) setDocuments((prev) => ({ ...prev, extendedFamilyId: null }));
                }}
                className="bg-white/10 text-white/60 text-xs px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"
              >
                {showExtended ? '− Remove' : '+ Add'}
              </button>
            </div>
            {showExtended && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="relative">
                  <input type="text" value={extended.name} onChange={(e) => setExtended({ ...extended, name: e.target.value })} placeholder="Extended family full name" className={`${inputCls} pr-12`} />
                  {dictationButton("extended-name", (text) => setExtended({ ...extended, name: text }))}
                </div>
                <div className="relative">
                  <input type="text" value={extended.idNumber} onChange={(e) => setExtended({ ...extended, idNumber: e.target.value })} placeholder="Extended family ID number" className={`${inputCls} pr-12`} />
                  {dictationButton("extended-id", (text) => setExtended({ ...extended, idNumber: text.replace(/\D/g, '').slice(0, 13) }))}
                </div>
              </div>
            )}
          </div>

          {/* Selfie verification */}
          <div className="mb-6">
            <div className="mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Selfie verification</p>
              <p className="text-white/35 text-xs mt-1">
                Take a clear selfie now so GoDirect247 can review your identity before activation.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-4">
              {identitySelfieDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={identitySelfieDataUrl}
                  alt="Signup selfie preview"
                  className="mb-3 aspect-video w-full rounded-xl border border-white/10 object-cover"
                />
              ) : (
                <div className="mb-3 flex aspect-video w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Camera size={28} className="text-sky-300" />
                </div>
              )}
              {selfieError && <p className="mb-3 text-xs text-[#e23b4a]">{selfieError}</p>}
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(event) => handleSelfieFile(event.target.files?.[0] || null)}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  disabled={selfieProcessing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-sky-400/10 px-3 py-3 text-xs font-semibold text-sky-200 transition-all hover:bg-sky-400/20 disabled:opacity-50"
                >
                  <Camera size={14} />
                  {selfieProcessing ? 'Preparing...' : identitySelfieDataUrl ? 'Retake selfie' : 'Take selfie'}
                </button>
                <button
                  type="button"
                  onClick={() => setIdentitySelfieDataUrl(null)}
                  disabled={!identitySelfieDataUrl}
                  className="rounded-xl border border-white/15 px-3 py-3 text-xs font-semibold text-white/55 transition-all hover:border-white/30 disabled:opacity-35"
                >
                  Remove
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-white/35">
                Selfie upload is optional during signup, but taking it now helps reduce delays before payment and activation.
              </p>
            </div>
          </div>

          {/* Documents */}
          <div className="mb-6">
            <div className="mb-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Documents</p>
              <p className="text-white/35 text-xs mt-1">
                Policy holder ID is required. Spouse, dependent and extended-family documents can be uploaded now or supplied later.
              </p>
            </div>
            <div className="space-y-3">
              <DocumentUploadField
                label="Policy Holder ID"
                required
                document={documents.policyHolderId}
                onChange={(document) => setDocuments((prev) => ({ ...prev, policyHolderId: document }))}
              />
              {showSpouse && spouse.firstName && (
                <DocumentUploadField
                  label="Spouse ID"
                  document={documents.spouseId}
                  onChange={(document) => setDocuments((prev) => ({ ...prev, spouseId: document }))}
                />
              )}
              {dependents.map((dep, index) => (
                dep.name ? (
                  <DocumentUploadField
                    key={`dependent-doc-${index}`}
                    label={`Dependent ${index + 1} birth certificate or ID`}
                    document={documents.dependentIds?.[index] || null}
                    onChange={(document) => updateDependentDocument(index, document)}
                  />
                ) : null
              ))}
              {showExtended && extended.name && (
                <DocumentUploadField
                  label="Extended family ID"
                  document={documents.extendedFamilyId}
                  onChange={(document) => setDocuments((prev) => ({ ...prev, extendedFamilyId: document }))}
                />
              )}
            </div>
          </div>

          <div className="bg-[#f3cc20]/10 border border-[#f3cc20]/20 rounded-2xl p-4 mb-6">
            <p className="text-[#f3cc20] text-xs font-bold uppercase tracking-wide mb-3">Amount due before processing</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Selected package</span>
                <span className="text-white font-semibold">{formatCurrency(baseActivationFee)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/50">Extended family extra fee</span>
                <span className="text-white font-semibold">
                  {hasExtendedFamily ? `${formatCurrency(extendedFamilyFee)} (20%)` : 'R0'}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#f3cc20]/20 pt-2">
                <span className="text-white font-bold">Total due</span>
                <span className="text-[#f3cc20] font-display font-extrabold">{formatCurrency(totalApplicationFee)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={prevStep} className="flex-shrink-0 border-2 border-white/20 text-white py-4 px-6 rounded-full hover:border-white/40 transition-all">
              <ArrowLeft size={16} />
            </button>
            <button onClick={nextStep} className="flex-1 bg-[#f3cc20] text-[#191c1f] font-display font-bold py-4 rounded-full hover:bg-[#c9a800] transition-all flex items-center justify-center gap-2">
              Review application <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & submit */}
      {step === 4 && (
        <div className="w-full ani1">
          <h2 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2 tracking-tight">
            Review &amp; submit
          </h2>
          <p className="text-white/50 text-sm mb-8">Check your details before submitting.</p>

          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-5 space-y-3 text-sm">
            {[
              ['Plan', `${tier} (${planType === 'plus' ? 'Plus' : 'Gold'} Plan)`],
              ['Applicant', personal.name],
              ['ID Number', personal.idNumber],
              ['Phone', personal.phone || 'Not provided'],
              ['Email', personal.email],
              ['Employment', personal.employment || 'Not specified'],
              ['Referred by', personal.referral || 'N/A'],
              ['Beneficiary', beneficiary.name || 'Not added'],
              ...(showSpouse && spouse.firstName ? [['Spouse', `${spouse.firstName} ${spouse.surname}`]] : []),
              ['Policy Holder ID', documents.policyHolderId ? 'Uploaded' : 'Required'],
              ['Selfie verification', identitySelfieDataUrl ? 'Submitted for review' : 'Can be completed after login'],
              ['Spouse ID', documents.spouseId ? 'Uploaded' : showSpouse ? 'Not uploaded' : 'N/A'],
              ['Dependent documents', `${documents.dependentIds?.filter(Boolean).length || 0} uploaded`],
              ['Extended family document', documents.extendedFamilyId ? 'Uploaded' : hasExtendedFamily ? 'Not uploaded' : 'N/A'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-start gap-4">
                <span className="text-white/40 text-xs uppercase tracking-wide font-semibold flex-shrink-0">
                  {k}
                </span>
                <span className="text-white text-right">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#f3cc20]/10 border border-[#f3cc20]/20 rounded-2xl p-5 mb-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Base activation fee</span>
              <span className="text-white font-semibold">{formatCurrency(baseActivationFee)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Extended family extra fee</span>
              <span className="text-white font-semibold">
                {hasExtendedFamily ? `${formatCurrency(extendedFamilyFee)} (20%)` : 'R0'}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#f3cc20]/20 pt-2">
              <span className="text-white font-bold">Whole amount due</span>
              <span className="text-[#f3cc20] font-display font-extrabold">{formatCurrency(totalApplicationFee)}</span>
            </div>
          </div>

          {/* T&Cs */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-5 max-h-40 overflow-y-auto text-xs text-white/40 leading-relaxed">
            <p className="font-semibold text-white/60 mb-2">Key Terms &amp; Conditions</p>
            A 6-month waiting period applies for natural death. Accidental death covered immediately. A 12-month
            waiting period applies for suicide. Cashback is payable on the 5th day of the 4th month from
            activation. Gold Plan payouts are payable after 6 weeks from activation. Renewal must be done on the
            11th month to avoid policy lapse. Early withdrawal is payable at 10% (full amount lapses). No advance
            requests for cashback or payout will be granted. Activation date means the date you paid for your
            policy, not the date you submitted your application.
          </div>

          <label className="flex items-start gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={tcAccepted}
              onChange={(e) => setTcAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#f3cc20] flex-shrink-0"
            />
            <span className="text-white/60 text-sm">
              I have read and accept the terms &amp; conditions above
            </span>
          </label>

          {submitError && <p className="text-[#e23b4a] text-xs text-center mb-4">{submitError}</p>}

          <div className="flex gap-3">
            <button onClick={prevStep} className="flex-shrink-0 border-2 border-white/20 text-white py-4 px-6 rounded-full hover:border-white/40 transition-all">
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-[#f3cc20] text-[#191c1f] font-display font-bold py-4 rounded-full hover:bg-[#c9a800] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : (
                <><PaperPlaneTilt size={16} /> Submit application</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  return (
    <div className="bg-[#191c1f] min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <SignupNav />
        <SignupContent />
      </Suspense>
    </div>
  );
}

function SignupNav() {
  const searchParams = useSearchParams();
  const step = 1; // resolved inside SignupContent — nav just shows the shell
  void step;
  void searchParams;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#191c1f]/95 backdrop-blur border-b border-white/10 h-14 flex items-center px-5">
      <Link href="/" className="font-display font-extrabold text-white text-lg">
        Go<span className="text-[#f3cc20]">Direct</span>247
      </Link>
    </nav>
  );
}
