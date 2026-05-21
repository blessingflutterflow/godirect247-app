import type { Timestamp } from 'firebase/firestore';

export type PearlPlan = 'once-off' | 'monthly';

export const PEARL_PLANS = {
  'once-off': {
    id: 'once-off' as PearlPlan,
    label: '12-Month Plan',
    priceAmount: 350,
    priceLabel: 'R350',
    cadence: 'once-off · valid 12 months',
    blurb: 'Pay once, use PEARL for a full year. Renews after 12 months.',
    features: [
      'Full PEARL access for 12 months',
      'Best value — save R838 vs monthly',
      'No monthly billing surprises',
      'Renewable after 12 months',
    ],
    badge: 'BEST VALUE',
  },
  monthly: {
    id: 'monthly' as PearlPlan,
    label: 'Monthly Plan',
    priceAmount: 99,
    priceLabel: 'R99',
    cadence: 'per month',
    blurb: 'Pay as you go. Cancel anytime.',
    features: [
      'Full PEARL access, month by month',
      'Cancel anytime, no lock-in',
      'Low monthly commitment',
      'Auto-renew each month',
    ],
    badge: 'FLEXIBLE',
  },
} as const;

export interface PearlSubscription {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  plan: PearlPlan;
  priceAmount: number;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  nextBillingAt: Timestamp | null;
  checkoutId: string | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const MERCH_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type MerchSize = (typeof MERCH_SIZES)[number];

export interface Product {
  id: string;
  name: string;
  description: string;
  priceAmount: number;
  imageDataUrl: string;
  sizes: MerchSize[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CartItem {
  productId: string;
  name: string;
  imageDataUrl: string;
  size: MerchSize;
  priceAmount: number;
  qty: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  checkoutId: string | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
