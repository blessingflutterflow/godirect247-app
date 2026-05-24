'use client';

import Link from 'next/link';
import { Coins, Lock } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';

export function GenerosityReward() {
  const { user, userData, loading } = useAuth();
  const isMember = !!(user && userData);

  return (
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
              <span className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5">
                <Lock size={11} weight="fill" /> Members Only
              </span>
            </div>
            <h2 className="font-display font-bold text-[#f3cc20] text-2xl md:text-3xl mb-3 tracking-tight">
              Generosity Reward · Marketing Acceleration
            </h2>
            <p className="font-display font-semibold text-white text-lg md:text-xl leading-snug mb-4">
              Turn your <span className="text-[#f3cc20]">R1,000</span> into <span className="text-[#f3cc20]">R114,600</span> in 6 weeks — without lifting a finger.
              <span className="block text-white/70 font-normal text-sm md:text-base mt-1.5">
                A simple AI Agent does all the work for you, and you reap all the benefits.
              </span>
            </p>
            <p className="text-white/70 text-sm md:text-base leading-relaxed mb-7">
              Activate together with PEARL. <strong className="text-white">You contribute R650, PEARL contributes R350</strong> — a R1,000 total
              activation. Then earn <strong className="text-[#f3cc20]">10% commission</strong> on every activation through your link, paid
              <strong className="text-[#f3cc20]"> 6 generations deep</strong>. PEARL also runs daily social media activities on your behalf, so
              you earn while you sleep.
            </p>

            {loading ? (
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
                <p className="text-white/50 text-sm">Loading…</p>
              </div>
            ) : isMember ? (
              <>
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
              </>
            ) : (
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 md:p-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#f3cc20]/15 border border-[#f3cc20]/30 mb-5">
                  <Lock size={24} className="text-[#f3cc20]" weight="fill" />
                </div>
                <h3 className="font-display font-bold text-white text-xl md:text-2xl mb-2">
                  Members Only
                </h3>
                <p className="text-white/60 text-sm md:text-base max-w-md mx-auto mb-6 leading-relaxed">
                  The full Generosity Reward breakdown — referral commissions, daily PEARL earnings and the 6-week potential — is reserved for registered members. Sign up free (or log in) to unlock it.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="bg-[#f3cc20] text-[#191c1f] font-semibold text-sm px-6 py-3 rounded-full hover:bg-[#f3cc20]/90 transition-colors"
                  >
                    Register Free
                  </Link>
                  <Link
                    href="/login"
                    className="bg-white/10 border border-white/20 text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/15 transition-colors"
                  >
                    Already a member · Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
