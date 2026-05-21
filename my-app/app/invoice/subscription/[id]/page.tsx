'use client';

import { use, useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Invoice, type InvoiceData } from '@/components/Invoice';
import { PEARL_PLANS, type PearlSubscription } from '@/lib/pearl-types';

export default function SubscriptionInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'pearlSubscriptions', id));
        if (!snap.exists()) {
          setError('Subscription not found.');
          return;
        }
        const sub = { id: snap.id, ...(snap.data() as Omit<PearlSubscription, 'id'>) };
        const planCfg = PEARL_PLANS[sub.plan];
        const issuedAt =
          sub.createdAt instanceof Timestamp ? sub.createdAt.toDate() : new Date();
        setData({
          invoiceNumber: `PRL-${sub.id.slice(0, 8).toUpperCase()}`,
          issuedAt,
          customerName: sub.fullName,
          customerEmail: sub.email,
          customerPhone: sub.phone,
          lineItems: [
            {
              description: `PEARL ${planCfg.label} (${planCfg.cadence})`,
              quantity: 1,
              unitPrice: sub.priceAmount,
              total: sub.priceAmount,
            },
          ],
          subtotal: sub.priceAmount,
          handlingFee: sub.handlingFee ?? 0,
          total: sub.totalAmount ?? sub.priceAmount,
          paymentMethod: sub.paymentMethod ?? 'yoco',
          status:
            sub.status === 'active'
              ? 'paid'
              : sub.status === 'awaiting_eft'
                ? 'awaiting payment'
                : 'pending',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice.');
      }
    }
    load();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">{error}</p>
          <p className="text-gray-500 text-sm">Invoice ID: {id}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-500 text-sm">
        Loading invoice…
      </div>
    );
  }

  return <Invoice data={data} />;
}
