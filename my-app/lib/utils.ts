import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getCommissionRate(count: number) {
  if (count >= 20) return 100;
  if (count >= 10) return 75;
  if (count >= 1) return 50;
  return 0;
}

export function getTierLabel(count: number) {
  if (count >= 20) return 'Platinum';
  if (count >= 10) return 'Gold';
  if (count >= 1) return 'Silver';
  return 'Starter';
}

export function formatCurrency(amount: number) {
  return 'R' + amount.toLocaleString('en-ZA');
}

export function formatDate(date: Date | string | { toDate: () => Date } | null) {
  if (!date) return '-';
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date as string);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysBetween(d1: Date, d2: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((d2.getTime() - d1.getTime()) / msPerDay);
}

const CAMPAIGN_END = new Date('2026-08-09T23:59:59');

export function isCampaignActive() {
  return new Date() < CAMPAIGN_END;
}

export function getCampaignTimeRemaining() {
  const now = new Date();
  const diff = CAMPAIGN_END.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, expired: false };
}
