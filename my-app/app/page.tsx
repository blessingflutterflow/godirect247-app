import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Users,
  Certificate,
  Clock,
  Coins,
  Lightning,
  ShareNetwork,
  Heartbeat,
  Gift,
} from '@phosphor-icons/react/dist/ssr';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PlansTabs } from '@/components/PlansTabs';
import { RefTracker } from '@/components/RefTracker';
import { VoiceEnquiry } from '@/components/VoiceEnquiry';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ref = typeof params.ref === 'string' ? params.ref : undefined;

  return (
    <>
      <Navbar />
      <RefTracker code={ref} />

      {/* ── Hero ── */}
      <section className="bg-[#191c1f] pt-16 min-h-screen flex flex-col justify-center">
        <div className="max-w-6xl mx-auto px-5 py-24 md:py-32">
          <div className="grid lg:grid-cols-[1fr_360px] gap-12 items-center">
            <div className="max-w-3xl">
              {ref && (
                <div className="ani1 inline-flex items-center gap-2 bg-[#f3cc20]/10 border border-[#f3cc20]/30 rounded-full px-4 py-1.5 mb-6">
                  <Gift className="text-[#f3cc20]" size={14} />
                  <span className="text-[#f3cc20]/90 text-xs font-medium">
                    You were invited — sign up to claim your funeral cover
                  </span>
                </div>
              )}
              <div className="ani1 inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-8">
                <ShieldCheck className="text-[#f3cc20]" size={14} />
                <span className="text-white/70 text-xs font-medium tracking-wide">
                  FSP Licence JR 50841
                </span>
              </div>
              <h1 className="ani2 font-display text-white text-5xl sm:text-6xl md:text-[78px] font-extrabold leading-none tracking-tight mb-6">
                Affordable cover<br />
                that protects<br />
                <span className="text-[#f3cc20]">your family.</span>
              </h1>
              <p className="ani3 text-white/50 text-lg md:text-xl leading-relaxed max-w-lg mb-10">
                No medical exams, claims support within 24-48 hours, and cashback rewards from
                month 4.
              </p>
              <div className="ani4 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="bg-[#f3cc20] text-[#191c1f] font-display font-bold text-base px-8 py-4 rounded-full text-center hover:bg-[#c9a800] transition-all"
                >
                  Choose your plan
                </Link>
                <Link
                  href="#how-it-works"
                  className="border-2 border-white/25 text-white font-medium text-base px-8 py-4 rounded-full text-center hover:border-white/50 hover:bg-white/5 transition-all"
                >
                  How it works
                </Link>
              </div>
            </div>

            <div className="ani3 hidden lg:flex justify-end">
              <div className="rounded-full bg-white p-5 shadow-2xl shadow-black/30 border border-white/20">
                <Image
                  src="/godirect247-logo.jpg"
                  alt="GoDirect247 logo"
                  width={288}
                  height={288}
                  priority
                  className="h-72 w-72 rounded-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="ani5 mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="bg-white/[0.06] border border-white/15 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-white">Plus Plan</span>
                <span className="bg-sky-900/40 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full border border-sky-700/30">
                  6 Tiers
                </span>
              </div>
              <p className="text-white/40 text-xs mb-4">
                Funeral cover &middot; cashback from month 4 &middot; refer &amp; earn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Silver', 'Gold', 'Diamond', 'Premier', 'Prestige', 'King'].map((t) => (
                  <span key={t} className="bg-white/10 text-white/60 text-xs px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-[#f3cc20]/[0.06] border border-[#f3cc20]/25 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-white">Gold Plan</span>
                <span className="bg-[#f3cc20]/20 text-[#f3cc20] text-xs font-semibold px-3 py-1 rounded-full border border-[#f3cc20]/30">
                  7 Tiers
                </span>
              </div>
              <p className="text-white/40 text-xs mb-4">
                Payout after 6 weeks &middot; cashback every 3 months &middot; refer &amp; earn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Silver', 'Gold', 'Diamond', 'Premier', 'Prestige', 'King'].map((t) => (
                  <span key={t} className="bg-[#f3cc20]/10 text-[#f3cc20]/70 text-xs px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
                <span className="bg-[#f3cc20]/20 text-[#f3cc20] font-semibold text-xs px-2.5 py-1 rounded-full">
                  Superior
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VoiceEnquiry />

      {/* ── Generosity Reward · Marketing Acceleration ── */}
      <section className="bg-[#191c1f] border-y border-[#f3cc20]/20">
        <div className="max-w-5xl mx-auto px-5 py-12">
          <div className="bg-[#f3cc20]/[0.06] border border-[#f3cc20]/20 rounded-2xl p-6 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#f3cc20]/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="bg-[#f3cc20] text-[#191c1f] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Limited Offer
                </span>
                <span className="text-[#f3cc20]/70 text-xs font-semibold">Ends 30 May 2026</span>
              </div>
              <h2 className="font-display font-bold text-[#f3cc20] text-2xl md:text-3xl mb-2 tracking-tight">
                Generosity Reward · Marketing Acceleration
              </h2>
              <p className="text-white/70 text-sm md:text-base leading-relaxed mb-7">
                Activate together with PEARL. <strong className="text-white">You contribute R650, PEARL contributes R350</strong> — a R1,000 total
                activation. Then earn <strong className="text-[#f3cc20]">10% commission</strong> on every activation through your link, paid
                <strong className="text-[#f3cc20]"> 6 generations deep</strong>. PEARL also runs daily social media activities on your behalf, so
                you earn while you sleep.
              </p>

              {/* Contribution split */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-1">You</p>
                  <p className="font-display font-bold text-white text-xl md:text-2xl">R650</p>
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-1">PEARL</p>
                  <p className="font-display font-bold text-white text-xl md:text-2xl">R350</p>
                </div>
                <div className="bg-[#f3cc20]/15 border border-[#f3cc20]/40 rounded-xl p-4 text-center">
                  <p className="text-[#f3cc20] text-[10px] uppercase tracking-widest font-semibold mb-1">Total Contribution</p>
                  <p className="font-display font-bold text-[#f3cc20] text-xl md:text-2xl">R1,000</p>
                </div>
              </div>

              {/* Road to 6 Weeks — Referral Commission */}
              <div className="mb-8">
                <p className="text-white font-display font-bold text-base md:text-lg mb-1">Road to 6 Weeks · Referral Commission</p>
                <p className="text-white/50 text-xs mb-4">
                  Estimate: 3 new members introduced each week. 10% commission (R100) per activation, paid for 6 generations.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-white/50 text-[10px] uppercase tracking-widest">
                        <th className="px-3 py-2 font-semibold">Week</th>
                        <th className="px-3 py-2 font-semibold">Generation</th>
                        <th className="px-3 py-2 font-semibold">New Members</th>
                        <th className="px-3 py-2 font-semibold text-right">Commission Due</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/80">
                      {[
                        { wk: 1, gen: 'Gen 1', members: 3, due: 'R300' },
                        { wk: 2, gen: 'Gen 2', members: 9, due: 'R900' },
                        { wk: 3, gen: 'Gen 3', members: 27, due: 'R2,700' },
                        { wk: 4, gen: 'Gen 4', members: 81, due: 'R8,100' },
                        { wk: 5, gen: 'Gen 5', members: 243, due: 'R24,300' },
                        { wk: 6, gen: 'Gen 6', members: 729, due: 'R72,900' },
                      ].map((row) => (
                        <tr key={row.wk} className="bg-white/[0.03]">
                          <td className="px-3 py-2.5 rounded-l-lg">{row.wk}</td>
                          <td className="px-3 py-2.5">{row.gen}</td>
                          <td className="px-3 py-2.5">{row.members.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[#f3cc20] rounded-r-lg">{row.due}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#f3cc20]/15">
                        <td className="px-3 py-3 rounded-l-lg font-bold text-white" colSpan={2}>Total potential</td>
                        <td className="px-3 py-3 font-bold text-white">1,092</td>
                        <td className="px-3 py-3 text-right font-display font-bold text-[#f3cc20] text-base rounded-r-lg">R109,200</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PEARL's daily activities */}
              <div className="mb-8">
                <p className="text-white font-display font-bold text-base md:text-lg mb-1">PEARL Works Daily For You</p>
                <p className="text-white/50 text-xs mb-4">
                  Three social media activities every day, posted on your behalf — you earn R50 per activity.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-white/50 text-[10px] uppercase tracking-widest">
                        <th className="px-3 py-2 font-semibold">Action</th>
                        <th className="px-3 py-2 font-semibold">Platform</th>
                        <th className="px-3 py-2 font-semibold">Duration</th>
                        <th className="px-3 py-2 font-semibold text-right">Earning</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/80">
                      {[
                        { action: 'Video Post', platform: 'TikTok', dur: '1 / day', earn: 'R50' },
                        { action: 'Video Post', platform: 'Facebook', dur: '1 / day', earn: 'R50' },
                        { action: 'Video Status Share', platform: 'WhatsApp', dur: '1 / day', earn: 'R50' },
                      ].map((row) => (
                        <tr key={row.platform} className="bg-white/[0.03]">
                          <td className="px-3 py-2.5 rounded-l-lg">{row.action}</td>
                          <td className="px-3 py-2.5">{row.platform}</td>
                          <td className="px-3 py-2.5">{row.dur}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[#f3cc20] rounded-r-lg">{row.earn}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#f3cc20]/15">
                        <td className="px-3 py-3 rounded-l-lg font-bold text-white" colSpan={3}>Daily total · 3 activities</td>
                        <td className="px-3 py-3 text-right font-display font-bold text-[#f3cc20] text-base rounded-r-lg">R150 / day</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Road to 6 Weeks — PEARL earnings */}
              <div className="mb-8">
                <p className="text-white font-display font-bold text-base md:text-lg mb-1">Road to 6 Weeks · PEARL Earnings</p>
                <p className="text-white/50 text-xs mb-4">
                  R150/day × 6 days a week = R900/week from PEARL’s social media work alone.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((wk) => (
                    <div key={wk} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
                      <p className="text-white/50 text-[10px] uppercase font-semibold">Week {wk}</p>
                      <p className="font-display font-bold text-[#f3cc20] text-base mt-1">R900</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-[#f3cc20]/15 border border-[#f3cc20]/40 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">6-week total from PEARL’s work</span>
                  <span className="font-display font-bold text-[#f3cc20] text-xl">R5,400</span>
                </div>
              </div>

              {/* Grand total + benefits */}
              <div className="bg-gradient-to-r from-[#f3cc20]/20 to-[#0682B4]/15 border border-[#f3cc20]/40 rounded-2xl p-5 md:p-6 mb-5">
                <p className="text-white/60 text-[10px] uppercase tracking-widest font-semibold mb-1">Combined 6-Week Potential</p>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <p className="font-display font-extrabold text-[#f3cc20] text-3xl md:text-4xl">R114,600</p>
                  <p className="text-white/60 text-xs max-w-sm">
                    Referral commissions (R109,200) + PEARL’s daily social activities (R5,400). Monitor and encourage your network to maximise the chain.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1.5">
                  <Coins size={14} className="text-[#f3cc20]" /> Free R10,000 cover for 12 months
                </span>
                <span className="flex items-center gap-1.5">
                  <Coins size={14} className="text-[#f3cc20]" /> Join free · earn for helping us grow
                </span>
                <span className="flex items-center gap-1.5">
                  <Coins size={14} className="text-[#f3cc20]" /> 6 generations deep · 10% each
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-[#f4f4f4] border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: <Users size={24} className="text-[#0682B4]" />, stat: '1 000+', label: 'Families covered' },
              { icon: <Certificate size={24} className="text-[#0682B4]" />, stat: 'FSP Reg.', label: 'JR 50841' },
              { icon: <Clock size={24} className="text-[#0682B4]" />, stat: '24–48 hrs', label: 'Claim payout' },
              { icon: <Coins size={24} className="text-[#0682B4]" />, stat: 'Cashback', label: 'Real rewards' },
            ].map(({ icon, stat, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                {icon}
                <span className="font-display font-bold text-[#191c1f] text-lg">{stat}</span>
                <span className="text-[#8d969e] text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#0682B4] text-sm font-semibold tracking-widest uppercase">
              Simple process
            </span>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#191c1f] mt-3 tracking-tight">
              Up and covered in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                title: 'Choose your plan',
                body: "Pick Plus or Gold, then the tier that fits your budget. See exactly what's covered before committing.",
                bg: 'bg-[#f4f4f4]',
                bodyColor: 'text-[#505a63]',
              },
              {
                num: '02',
                title: 'Cover your family',
                body: 'Add your spouse, up to 4 dependents, and extended family in a few taps. No medicals required.',
                bg: 'bg-[#f4f4f4]',
                bodyColor: 'text-[#505a63]',
              },
              {
                num: '03',
                title: 'Activate & earn',
                body: 'Pay your activation fee and cover starts. Cashback arrives on the 5th of your 4th month.',
                bg: 'bg-[#f3cc20]',
                bodyColor: 'text-[#191c1f]/70',
              },
            ].map(({ num, title, body, bg, bodyColor }) => (
              <div key={num} className={`${bg} rounded-2xl p-8 relative overflow-hidden`}>
                <div className="w-10 h-10 bg-[#191c1f] rounded-xl flex items-center justify-center mb-6">
                  <span className="font-display font-bold text-white text-sm">{num}</span>
                </div>
                <h3 className="font-display font-bold text-xl text-[#191c1f] mb-3">{title}</h3>
                <p className={`${bodyColor} text-sm leading-relaxed`}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section id="plans" className="bg-[#191c1f] py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#f3cc20] text-sm font-semibold tracking-widest uppercase">
              Two plans
            </span>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white mt-3 tracking-tight">
              Find the right cover
            </h2>
            <p className="text-white/50 text-base mt-4 max-w-lg mx-auto">
              One activation fee. Funeral cover from day one. Cashback from month 4.
            </p>
          </div>
          <PlansTabs />
        </div>
      </section>

      {/* ── Benefits ── */}
      <section id="benefits" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#0682B4] text-sm font-semibold tracking-widest uppercase">
              Why GoDirect247
            </span>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl text-[#191c1f] mt-3 tracking-tight">
              Everything you need
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Lightning size={24} className="text-[#00a87e]" />,
                iconBg: 'bg-[#00a87e]/10',
                title: 'Fast claims',
                body: 'Processed and paid within 24–48 hours of receiving required documentation.',
              },
              {
                icon: <Coins size={24} className="text-yellow-600" />,
                iconBg: 'bg-[#f3cc20]/20',
                title: 'Cashback rewards',
                body: 'Real money back from month 4. Gold members also earn quarterly payouts.',
              },
              {
                icon: <ShareNetwork size={24} className="text-[#0682B4]" />,
                iconBg: 'bg-[#0682B4]/10',
                title: 'Refer & earn',
                body: 'Earn commission for every referral. Not mandatory — your choice entirely.',
              },
              {
                icon: <Users size={24} className="text-purple-500" />,
                iconBg: 'bg-purple-50',
                title: 'Full family cover',
                body: 'Spouse, up to 4 dependents, and extended family all under one policy.',
              },
              {
                icon: <Heartbeat size={24} className="text-[#00a87e]" />,
                iconBg: 'bg-[#00a87e]/10',
                title: 'No medicals',
                body: 'No health exams or questions. Apply in minutes from your phone.',
              },
              {
                icon: <Certificate size={24} className="text-[#191c1f]" />,
                iconBg: 'bg-gray-100',
                title: 'FSP Registered',
                body: 'Fully regulated. GoDirect247 is a division of Zarkudu Group. FSP Licence JR 50841.',
              },
            ].map(({ icon, iconBg, title, body }) => (
              <div
                key={title}
                className="p-7 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all"
              >
                <div
                  className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-5`}
                >
                  {icon}
                </div>
                <h3 className="font-display font-bold text-[#191c1f] text-lg mb-2">{title}</h3>
                <p className="text-[#505a63] text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Locations ── */}
      <section className="bg-[#f4f4f4] py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#0682B4] text-sm font-semibold tracking-widest uppercase">
              Our Offices
            </span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[#191c1f] mt-3 tracking-tight">
              Visit or contact us
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-display font-bold text-[#191c1f] text-lg mb-4">Sandton</h3>
              <address className="not-italic text-[#505a63] text-sm leading-relaxed space-y-1">
                <p>5th Street</p>
                <p>Atrium on 5th</p>
                <p>9th Floor</p>
                <p>Sandton JHB</p>
                <p>2196</p>
              </address>
              <p className="mt-4 text-sm">
                <span className="text-[#8d969e]">Tel:</span>{' '}
                <a href="tel:0100030789" className="text-[#0682B4] hover:underline">010 003 0789</a>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-display font-bold text-[#191c1f] text-lg mb-4">Cape Town</h3>
              <address className="not-italic text-[#505a63] text-sm leading-relaxed space-y-1">
                <p>54 Oxford Street</p>
                <p>Oxford Gate, 2nd Floor</p>
                <p>7550</p>
              </address>
              <p className="mt-4 text-sm">
                <span className="text-[#8d969e]">Tel:</span>{' '}
                <a href="tel:0211408083" className="text-[#0682B4] hover:underline">021 140 8083</a>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="font-display font-bold text-[#191c1f] text-lg mb-4">East London</h3>
              <address className="not-italic text-[#505a63] text-sm leading-relaxed space-y-1">
                <p>14 Stewart Drive</p>
                <p>East London Berea</p>
                <p>5241</p>
              </address>
              <p className="mt-4 text-sm">
                <span className="text-[#8d969e]">Tel:</span>{' '}
                <a href="tel:0145470285" className="text-[#0682B4] hover:underline">014 547 0285</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
