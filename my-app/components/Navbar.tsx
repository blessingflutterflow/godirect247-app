'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { List, X, ShoppingCart } from '@phosphor-icons/react';
import { useCart } from './CartContext';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { setOpen: setCartOpen, count } = useCart();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#191c1f]/95 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="GoDirect247 home"
        >
          <Image
            src="/godirect247-logo.jpg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover bg-white"
          />
          <span className="font-display font-extrabold text-white text-xl tracking-tight">
            Go<span className="text-[#f3cc20]">Direct</span>247
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/#plans" className="text-white/60 hover:text-white transition-colors">
            Plans
          </Link>
          <Link href="/pearl" className="text-white/60 hover:text-white transition-colors">
            PEARL AI
          </Link>
          <Link href="/shop" className="text-white/60 hover:text-white transition-colors">
            Shop
          </Link>
          <Link href="/#how-it-works" className="text-white/60 hover:text-white transition-colors">
            How it works
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setCartOpen(true)}
            className="relative text-white/70 hover:text-white p-2 rounded-full transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart size={22} weight="fill" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#f3cc20] text-[#191c1f] text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <Link
            href="/dashboard"
            className="text-white/70 hover:text-white text-sm font-medium px-4 py-2"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-[#f3cc20] text-[#191c1f] text-sm font-bold px-5 py-2.5 rounded-full hover:bg-[#c9a800] transition-colors"
          >
            Get Started
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={() => setCartOpen(true)}
            className="relative text-white/80 hover:text-white p-2"
            aria-label="Open cart"
          >
            <ShoppingCart size={22} weight="fill" />
            {count > 0 && (
              <span className="absolute top-0 right-0 bg-[#f3cc20] text-[#191c1f] text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="text-white p-1"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#191c1f] border-t border-white/10 px-5 py-5 flex flex-col gap-4 text-sm">
          <Link href="/#plans" onClick={() => setOpen(false)} className="text-white/70 py-1">
            Plans
          </Link>
          <Link href="/pearl" onClick={() => setOpen(false)} className="text-white/70 py-1">
            PEARL AI
          </Link>
          <Link href="/shop" onClick={() => setOpen(false)} className="text-white/70 py-1">
            Shop
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setOpen(false)}
            className="text-white/70 py-1"
          >
            How it works
          </Link>
          <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-white/70 py-1 text-center"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="bg-[#f3cc20] text-[#191c1f] font-bold py-3 rounded-full text-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
