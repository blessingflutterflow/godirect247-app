'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, MerchSize } from '@/lib/pearl-types';

interface CartContextValue {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: CartItem) => void;
  remove: (productId: string, size: MerchSize) => void;
  setQty: (productId: string, size: MerchSize, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'godirect247_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) => p.productId === item.productId && p.size === item.size
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
        return next;
      }
      return [...prev, item];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((productId: string, size: MerchSize) => {
    setItems((prev) => prev.filter((p) => !(p.productId === productId && p.size === size)));
  }, []);

  const setQty = useCallback((productId: string, size: MerchSize, qty: number) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.productId === productId && p.size === size ? { ...p, qty: Math.max(1, qty) } : p
        )
        .filter((p) => p.qty > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.priceAmount * it.qty, 0),
    [items]
  );
  const count = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items]);

  const value: CartContextValue = {
    items,
    open,
    setOpen,
    add,
    remove,
    setQty,
    clear,
    total,
    count,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
