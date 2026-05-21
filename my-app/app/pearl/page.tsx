import Link from 'next/link';
import { CheckCircle, Sparkle, Robot, Lightning, Shield } from '@phosphor-icons/react/dist/ssr';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PEARL_PLANS } from '@/lib/pearl-types';

export default function PearlLandingPage() {
  const plans = [PEARL_PLANS['once-off'], PEARL_PLANS.monthly];

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-[#191c1f] pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-[#f3cc20]/10 border border-[#f3cc20]/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkle className="text-[#f3cc20]" size={14} weight="fill" />
            <span className="text-[#f3cc20] text-xs font-semibold tracking-wide">
              MEET PEARL · GoDirect247 AI Agent
            </span>
          </div>
          <h1 className="font-display font-extrabold text-white text-4xl md:text-6xl tracking-tight mb-5">
            Your personal AI assistant for{' '}
            <span className="text-[#f3cc20]">funeral cover, family & finances</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto mb-8">
            PEARL answers your questions, helps with claims, tracks your plan, and motivates
            you to build your generational legacy — 24/7, in plain language.
          </p>
          <Link
            href="#plans"
            className="inline-flex items-center gap-2 bg-[#f3cc20] text-[#191c1f] font-display font-bold px-7 py-3.5 rounded-full hover:bg-[#c9a800] transition-all text-sm"
          >
            Choose your plan
          </Link>
        </div>
      </section>

      {/* What PEARL does */}
      <section className="bg-[#111315] py-16">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <Robot size={24} weight="fill" className="text-[#f3cc20]" />,
                title: 'Always available',
                copy: 'Chat with PEARL anytime about your plan, claims, payments or rewards.',
              },
              {
                icon: <Lightning size={24} weight="fill" className="text-[#f3cc20]" />,
                title: 'Instant answers',
                copy: 'No call centres, no waiting. Plain answers in seconds.',
              },
              {
                icon: <Shield size={24} weight="fill" className="text-[#f3cc20]" />,
                title: 'Secure & private',
                copy: 'Built for GoDirect247 members. Your data stays protected.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#191c1f] border border-white/10 rounded-2xl p-6"
              >
                <div className="bg-[#f3cc20]/10 border border-[#f3cc20]/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-1.5">
                  {f.title}
                </h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="bg-[#191c1f] py-16">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display font-extrabold text-white text-3xl md:text-4xl mb-3">
              Subscribe to <span className="text-[#f3cc20]">PEARL</span>
            </h2>
            <p className="text-white/55 text-sm md:text-base max-w-xl mx-auto">
              Two simple options. Pay once for the year or month by month — your choice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-[#111315] border rounded-2xl p-7 ${
                  plan.id === 'once-off'
                    ? 'border-[#f3cc20]/50 shadow-[0_0_0_1px_rgba(243,204,32,0.15)]'
                    : 'border-white/10'
                }`}
              >
                <div
                  className={`inline-block text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full mb-4 ${
                    plan.id === 'once-off'
                      ? 'bg-[#f3cc20]/15 text-[#f3cc20] border border-[#f3cc20]/30'
                      : 'bg-white/5 text-white/60 border border-white/15'
                  }`}
                >
                  {plan.badge}
                </div>
                <h3 className="font-display font-extrabold text-white text-2xl mb-1">
                  {plan.label}
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display font-extrabold text-[#f3cc20] text-4xl">
                    {plan.priceLabel}
                  </span>
                  <span className="text-white/45 text-sm">{plan.cadence}</span>
                </div>
                <p className="text-white/60 text-sm mb-5">{plan.blurb}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-white/75 text-sm">
                      <CheckCircle
                        size={16}
                        weight="fill"
                        className="text-[#00a87e] mt-0.5 shrink-0"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/pearl/signup?plan=${plan.id}`}
                  className={`block text-center font-display font-bold py-3.5 rounded-full transition-all text-sm ${
                    plan.id === 'once-off'
                      ? 'bg-[#f3cc20] text-[#191c1f] hover:bg-[#c9a800]'
                      : 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                  }`}
                >
                  Subscribe & pay
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-white/35 text-xs mt-8 max-w-md mx-auto">
            Secure payment by Yoco. Once-off plan renews after 12 months. Monthly plan
            renews each month — cancel anytime.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
