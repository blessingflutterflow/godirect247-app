'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, ShoppingCart, Storefront } from '@phosphor-icons/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { listActiveProducts } from '@/lib/pearl-service';
import type { Product, MerchSize } from '@/lib/pearl-types';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { add, setOpen, count } = useCart();

  useEffect(() => {
    (async () => {
      try {
        const list = await listActiveProducts();
        setProducts(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-[#191c1f] pt-24 pb-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#f3cc20]/10 border border-[#f3cc20]/30 rounded-full px-3 py-1 mb-3">
              <Storefront size={12} weight="fill" className="text-[#f3cc20]" />
              <span className="text-[#f3cc20] text-[11px] font-semibold tracking-wide">
                GODIRECT247 SHOP
              </span>
            </div>
            <h1 className="font-display font-extrabold text-white text-3xl md:text-4xl mb-2">
              Official Merchandise
            </h1>
            <p className="text-white/55 text-sm">
              Wear the brand. Carry the mission. Choose your size and pay securely.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/75 text-xs">
                <span className="text-[#f3cc20] font-semibold">R99</span>
                Nationwide delivery · 5–7 days
              </span>
              <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/75 text-xs">
                <span className="text-[#f3cc20] font-semibold">R199</span>
                SADC Region · 14–21 days
              </span>
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="self-start sm:self-end relative bg-white/10 border border-white/15 hover:bg-white/15 text-white text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2"
          >
            <ShoppingCart size={16} weight="fill" />
            View cart
            {count > 0 && (
              <span className="bg-[#f3cc20] text-[#191c1f] text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-[#111315] py-12 min-h-[400px]">
        <div className="max-w-6xl mx-auto px-5">
          {loading ? (
            <p className="text-white/40 text-sm">Loading products…</p>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">
                No products yet. Check back soon — Xolani is loading the store.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={add} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (item: {
    productId: string;
    name: string;
    imageDataUrl: string;
    size: MerchSize;
    priceAmount: number;
    qty: number;
  }) => void;
}) {
  const [size, setSize] = useState<MerchSize>(product.sizes[0]);

  return (
    <div className="bg-[#191c1f] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-square bg-white/5 relative overflow-hidden">
        {product.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageDataUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <ShoppingBag size={48} />
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-display font-bold text-white text-lg mb-1">{product.name}</h3>
        <p className="text-white/50 text-sm mb-4 flex-1">{product.description}</p>

        {/* Sizes */}
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wide mb-2">
          Size
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                s === size
                  ? 'bg-[#f3cc20] border-[#f3cc20] text-[#191c1f]'
                  : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Price + buy */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#f3cc20] font-display font-extrabold text-2xl">
            R{product.priceAmount.toLocaleString()}
          </span>
          <button
            onClick={() =>
              onAdd({
                productId: product.id,
                name: product.name,
                imageDataUrl: product.imageDataUrl,
                size,
                priceAmount: product.priceAmount,
                qty: 1,
              })
            }
            className="bg-[#f3cc20] text-[#191c1f] font-display font-bold px-5 py-2.5 rounded-full text-sm hover:bg-[#c9a800] transition-all"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
