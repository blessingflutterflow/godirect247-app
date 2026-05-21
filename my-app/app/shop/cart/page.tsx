'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash, ShoppingBag } from '@phosphor-icons/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { createOrder, attachCheckoutToOrder } from '@/lib/pearl-service';
import { DELIVERY_OPTIONS, type DeliveryRegion } from '@/lib/pearl-types';

function CartPageInner() {
  const { items, total, remove, setQty } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState<DeliveryRegion>('nationwide');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const deliveryFee = DELIVERY_OPTIONS[deliveryRegion].fee;
  const grandTotal = total + deliveryFee;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!name || !email || !phone || !street || !city || !postal) {
      setError('Please complete all delivery details.');
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingStreet: street,
        shippingCity: city,
        shippingPostalCode: postal,
        items,
        deliveryRegion,
      });
      if (!order.success || !order.id) {
        setError(order.error || 'Could not place order.');
        setLoading(false);
        return;
      }
      const payable = order.totalAmount ?? grandTotal;
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInCents: payable * 100,
          orderId: order.id,
          email,
          fullName: name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || 'Could not start payment.');
        setLoading(false);
        return;
      }
      if (data.checkoutId) {
        await attachCheckoutToOrder(order.id, data.checkoutId);
      }
      try {
        sessionStorage.setItem('lastOrderId', order.id);
      } catch {}
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <section className="bg-[#191c1f] min-h-screen pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-5">
          <button
            type="button"
            onClick={() => router.push('/shop')}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Continue shopping
          </button>

          <h1 className="font-display font-extrabold text-white text-3xl mb-6">
            Checkout
          </h1>

          {cancelled && (
            <div className="bg-[#e23b4a]/10 border border-[#e23b4a]/30 rounded-2xl p-4 mb-6 text-[#e23b4a] text-sm">
              Payment was cancelled. Your cart is still here when you&apos;re ready.
            </div>
          )}

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Form */}
            <form
              onSubmit={handleCheckout}
              className="bg-[#111315] border border-white/10 rounded-2xl p-7"
            >
              <h2 className="font-display font-bold text-white text-xl mb-5">
                Delivery details
              </h2>

              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">
                Delivery region
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                {(Object.values(DELIVERY_OPTIONS)).map((opt) => {
                  const selected = deliveryRegion === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDeliveryRegion(opt.id)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        selected
                          ? 'bg-[#f3cc20]/10 border-[#f3cc20]'
                          : 'bg-white/5 border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-white font-semibold text-sm">{opt.label}</span>
                        <span className="text-[#f3cc20] font-display font-extrabold text-base">
                          R{opt.fee}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs">{opt.eta}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-white/40 text-[11px] mb-5">
                Delivery only — no in-person collection.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <Field label="Full name" value={name} onChange={setName} />
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
                <Field label="Postal code" value={postal} onChange={setPostal} />
                <div className="sm:col-span-2">
                  <Field label="Street address" value={street} onChange={setStreet} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="City" value={city} onChange={setCity} />
                </div>
              </div>

              {error && (
                <p className="text-[#e23b4a] text-xs mb-4 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="w-full bg-[#f3cc20] text-[#191c1f] font-display font-bold py-4 rounded-full hover:bg-[#c9a800] transition-all text-sm disabled:opacity-60"
              >
                {loading
                  ? 'Preparing payment…'
                  : `Pay R${grandTotal.toLocaleString()} via Yoco`}
              </button>
              <p className="text-center text-white/35 text-xs mt-3">
                Secure payment by Yoco. You&apos;ll receive an order confirmation by email.
              </p>
            </form>

            {/* Summary */}
            <aside className="bg-[#111315] border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="font-display font-bold text-white text-lg mb-4">
                Your order ({items.length})
              </h3>

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag size={32} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">Cart is empty.</p>
                  <Link
                    href="/shop"
                    className="inline-block mt-3 text-[#f3cc20] text-sm font-semibold hover:underline"
                  >
                    Browse the shop →
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="space-y-3 mb-5">
                    {items.map((it) => (
                      <li
                        key={`${it.productId}-${it.size}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                          {it.imageDataUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.imageDataUrl}
                              alt={it.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {it.name}
                          </p>
                          <p className="text-white/40 text-xs">Size {it.size}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setQty(it.productId, it.size, it.qty - 1)}
                            className="text-white/60 bg-white/5 border border-white/10 rounded-full w-6 h-6 flex items-center justify-center"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-white text-xs w-5 text-center font-semibold">
                            {it.qty}
                          </span>
                          <button
                            onClick={() => setQty(it.productId, it.size, it.qty + 1)}
                            className="text-white/60 bg-white/5 border border-white/10 rounded-full w-6 h-6 flex items-center justify-center"
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            onClick={() => remove(it.productId, it.size)}
                            className="text-[#e23b4a] p-1"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/10 pt-4 space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-white/55">Subtotal</span>
                      <span className="text-white font-semibold">
                        R{total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-white/55">
                        Delivery · {DELIVERY_OPTIONS[deliveryRegion].label}
                      </span>
                      <span className="text-white font-semibold">
                        R{deliveryFee.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
                      <span className="text-white/55 text-sm">Total</span>
                      <span className="text-[#f3cc20] font-display font-extrabold text-2xl">
                        R{grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm"
      />
    </div>
  );
}

export default function ShopCartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#191c1f] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <CartPageInner />
    </Suspense>
  );
}
