'use client';

import { use, useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Invoice, type InvoiceData } from '@/components/Invoice';
import type { AdditionalPolicy } from '@/lib/types';

export default function AdditionalPolicyInvoicePage({
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
        const snap = await getDoc(doc(db, 'additionalPolicies', id));
        if (!snap.exists()) {
          setError('Invoice not found.');
          return;
        }
        const policy = snap.data() as AdditionalPolicy;

        const userSnap = await getDoc(doc(db, 'users', policy.userId));
        const userEmail =
          userSnap.exists() ? (userSnap.data().email as string) ?? '' : '';

        const issuedAt =
          policy.createdAt instanceof Timestamp ? policy.createdAt.toDate() : new Date();
        const planLabel = policy.planType === 'gold' ? 'Gold Plan' : 'Plus Plan';

        const lineItems = [
          {
            description: `GoDirect247 ${planLabel} — ${policy.tier} additional cover (${policy.mainMemberName})`,
            quantity: 1,
            unitPrice: policy.baseActivationFee,
            total: policy.baseActivationFee,
          },
        ];
        if (policy.extendedFamilyFee > 0) {
          lineItems.push({
            description: 'Extended family add-on (+20%)',
            quantity: 1,
            unitPrice: policy.extendedFamilyFee,
            total: policy.extendedFamilyFee,
          });
        }

        setData({
          invoiceNumber: `GD-${id.slice(0, 8).toUpperCase()}`,
          issuedAt,
          customerName: policy.mainMemberName,
          customerEmail: policy.customerEmail || userEmail,
          customerPhone: policy.mainMemberPhone,
          lineItems,
          subtotal: policy.totalApplicationFee,
          handlingFee: 0,
          total: policy.totalApplicationFee,
          paymentMethod: policy.paymentMethod ?? 'eft',
          status:
            policy.status === 'active'
              ? 'paid'
              : policy.status === 'cancelled'
                ? 'cancelled'
                : 'awaiting payment',
          notes:
            'Once your payment reflects, this additional cover will be activated within 1 working day. Email proof of payment to payments@godirect247.co.za to speed up activation.',
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
