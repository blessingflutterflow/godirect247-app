'use client';

import { use, useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Invoice, type InvoiceData } from '@/components/Invoice';

interface EftActivationInvoiceDoc {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  tier: string;
  planType: 'plus' | 'gold';
  amount: number;
  status: 'awaiting_eft' | 'paid' | 'cancelled';
  createdAt: Timestamp;
  paidAt: Timestamp | null;
}

export default function ActivationInvoicePage({
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
        const snap = await getDoc(doc(db, 'eftActivationInvoices', id));
        if (!snap.exists()) {
          setError('Invoice not found.');
          return;
        }
        const inv = snap.data() as EftActivationInvoiceDoc;
        const issuedAt =
          inv.createdAt instanceof Timestamp ? inv.createdAt.toDate() : new Date();
        const planLabel = inv.planType === 'gold' ? 'Gold Plan' : 'Plus Plan';
        setData({
          invoiceNumber: `GD-${id.slice(0, 8).toUpperCase()}`,
          issuedAt,
          customerName: inv.fullName,
          customerEmail: inv.email,
          customerPhone: inv.phone,
          lineItems: [
            {
              description: `GoDirect247 ${planLabel} — ${inv.tier} cover activation`,
              quantity: 1,
              unitPrice: inv.amount,
              total: inv.amount,
            },
          ],
          subtotal: inv.amount,
          handlingFee: 0,
          total: inv.amount,
          paymentMethod: 'eft',
          status:
            inv.status === 'paid'
              ? 'paid'
              : inv.status === 'cancelled'
                ? 'cancelled'
                : 'awaiting payment',
          notes:
            'Once your payment reflects, your cover will be activated within 1 working day. Email proof of payment to support@godirect247.com to speed up activation.',
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
