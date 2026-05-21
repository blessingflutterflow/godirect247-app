'use client';

import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, Trash, ShoppingCart } from '@phosphor-icons/react';
import { useCart } from './CartContext';

export function CartDrawer() {
  const { items, open, setOpen, remove, setQty, total } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#191c1f] border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} weight="fill" className="text-[#f3cc20]" />
            <h2 className="font-display font-bold text-white text-lg">Your cart</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/40 hover:text-white p-1"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Your cart is empty.</p>
              <Link
                href="/shop"
                onClick={() => setOpen(false)}
                className="inline-block mt-5 text-[#f3cc20] text-sm font-semibold hover:underline"
              >
                Browse the shop →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li
                  key={`${it.productId}-${it.size}`}
                  className="bg-white/[0.04] border border-white/10 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                    {it.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.imageDataUrl}
                        alt={it.name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{it.name}</p>
                    <p className="text-white/45 text-xs">Size {it.size}</p>
                    <p className="text-[#f3cc20] font-semibold text-sm mt-0.5">
                      R{it.priceAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQty(it.productId, it.size, it.qty - 1)}
                      className="text-white/60 hover:text-white bg-white/5 border border-white/10 rounded-full w-7 h-7 flex items-center justify-center"
                      aria-label="Decrease"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-white text-sm w-6 text-center font-semibold">
                      {it.qty}
                    </span>
                    <button
                      onClick={() => setQty(it.productId, it.size, it.qty + 1)}
                      className="text-white/60 hover:text-white bg-white/5 border border-white/10 rounded-full w-7 h-7 flex items-center justify-center"
                      aria-label="Increase"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => remove(it.productId, it.size)}
                      className="text-[#e23b4a] hover:text-[#ff5f6d] p-1 ml-1"
                      aria-label="Remove"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-white/10">
            <div className="flex justify-between mb-4">
              <span className="text-white/55 text-sm">Total</span>
              <span className="text-[#f3cc20] font-display font-extrabold text-2xl">
                R{total.toLocaleString()}
              </span>
            </div>
            <Link
              href="/shop/cart"
              onClick={() => setOpen(false)}
              className="block text-center w-full bg-[#f3cc20] text-[#191c1f] font-display font-bold py-3.5 rounded-full text-sm hover:bg-[#c9a800] transition-all"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
