'use client';

import { use, useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Invoice, type InvoiceData } from '@/components/Invoice';
import type { Order } from '@/lib/pearl-types';

export default function OrderInvoicePage({
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
        const snap = await getDoc(doc(db, 'orders', id));
        if (!snap.exists()) {
          setError('Order not found.');
          return;
        }
        const order = { id: snap.id, ...(snap.data() as Omit<Order, 'id'>) };
        const issuedAt =
          order.createdAt instanceof Timestamp
            ? order.createdAt.toDate()
            : new Date();
        const shippingAddress = [
          order.shippingStreet,
          order.shippingCity,
          order.shippingPostalCode,
        ]
          .filter(Boolean)
          .join('\n');
        setData({
          invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
          issuedAt,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          shippingAddress,
          lineItems: order.items.map((it) => ({
            description: `${it.name} · Size ${it.size}`,
            quantity: it.qty,
            unitPrice: it.priceAmount,
            total: it.priceAmount * it.qty,
          })),
          subtotal: order.subtotalAmount,
          deliveryFee: order.deliveryFee,
          handlingFee: order.handlingFee ?? 0,
          total: order.totalAmount,
          paymentMethod: order.paymentMethod ?? 'yoco',
          status:
            order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered'
              ? 'paid'
              : order.status === 'awaiting_eft'
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
