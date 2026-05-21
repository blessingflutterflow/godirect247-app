'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowLeft,
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { auth } from '@/lib/firebase';
import { checkIsAdmin } from '@/lib/firebase-service';
import {
  listAllProducts,
  saveProduct,
  setProductActive,
} from '@/lib/pearl-service';
import { MERCH_SIZES, type MerchSize, type Product } from '@/lib/pearl-types';

const EMPTY_FORM = {
  id: '' as string | undefined,
  name: '',
  description: '',
  priceAmount: 0,
  imageDataUrl: '',
  sizes: [...MERCH_SIZES] as MerchSize[],
  active: true,
};

export default function AdminMerchandisePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/admin');
        return;
      }
      const admin = await checkIsAdmin(user.uid);
      if (!admin) {
        router.push('/admin');
        return;
      }
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  const reload = useCallback(async () => {
    const list = await listAllProducts();
    setProducts(list);
  }, []);

  useEffect(() => {
    if (ready) reload();
  }, [ready, reload]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
  }

  function startEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      priceAmount: p.priceAmount,
      imageDataUrl: p.imageDataUrl,
      sizes: [...p.sizes],
      active: p.active,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleImageUpload(file: File) {
    if (file.size > 2_500_000) {
      setError('Image is too large (max ~2.5MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageDataUrl: typeof reader.result === 'string' ? reader.result : '' }));
    };
    reader.readAsDataURL(file);
  }

  function toggleSize(size: MerchSize) {
    setForm((f) =>
      f.sizes.includes(size)
        ? { ...f, sizes: f.sizes.filter((s) => s !== size) }
        : { ...f, sizes: [...f.sizes, size] }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    if (form.priceAmount <= 0) return setError('Price must be greater than 0.');
    if (form.sizes.length === 0) return setError('Select at least one size.');
    if (!form.imageDataUrl) return setError('Please upload a product image.');

    setSaving(true);
    const result = await saveProduct({
      id: form.id || undefined,
      name: form.name.trim(),
      description: form.description.trim(),
      priceAmount: form.priceAmount,
      imageDataUrl: form.imageDataUrl,
      sizes: form.sizes,
      active: form.active,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save product.');
      return;
    }
    resetForm();
    await reload();
  }

  async function handleToggleActive(p: Product) {
    await setProductActive(p.id, !p.active);
    await reload();
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#111315] flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-[#111315] min-h-screen text-white">
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#191c1f] border-b border-white/10 h-14 flex items-center px-5 gap-3">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to admin
        </Link>
        <div className="ml-auto font-display font-extrabold text-white text-base">
          Go<span className="text-[#f3cc20]">Direct</span>247{' '}
          <span className="text-white/30 font-normal text-xs ml-1">Merchandise</span>
        </div>
      </nav>

      <div className="pt-20 max-w-5xl mx-auto px-4 pb-12">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-white text-2xl mb-1">
            Merchandise Store
          </h1>
          <p className="text-white/50 text-sm">
            Upload items, set prices and sizes. Products appear instantly on{' '}
            <Link href="/shop" className="text-[#f3cc20] hover:underline">
              godirect247.com/shop
            </Link>
            .
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#191c1f] border border-white/10 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-white text-lg">
              {editing ? 'Edit product' : 'Add a new product'}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-white/50 hover:text-white text-xs"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-[180px_1fr] gap-5">
            {/* Image */}
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
                Product image
              </label>
              <div className="aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden relative">
                {form.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageDataUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30 text-xs gap-2">
                    <ImageIcon size={28} />
                    <span>No image</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="mt-2 text-white/60 text-xs file:bg-[#f3cc20] file:text-[#191c1f] file:font-bold file:rounded-full file:border-0 file:px-3 file:py-1.5 file:mr-2 file:text-xs"
              />
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="GoDirect247 Cap"
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Branded snapback in premium black cotton."
                  rows={2}
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
                    Price (R)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.priceAmount || ''}
                    onChange={(e) =>
                      setForm({ ...form, priceAmount: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
                    Status
                  </label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { v: true, l: 'Active' },
                      { v: false, l: 'Hidden' },
                    ].map((opt) => (
                      <button
                        key={String(opt.v)}
                        type="button"
                        onClick={() => setForm({ ...form, active: opt.v })}
                        className={`flex-1 text-xs font-semibold rounded-full border py-2.5 transition-all ${
                          form.active === opt.v
                            ? 'bg-[#f3cc20]/10 border-[#f3cc20]/40 text-[#f3cc20]'
                            : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wide block mb-2">
                  Available sizes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MERCH_SIZES.map((s) => {
                    const active = form.sizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition-all ${
                          active
                            ? 'bg-[#f3cc20] border-[#f3cc20] text-[#191c1f]'
                            : 'bg-white/5 border-white/15 text-white/70'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-[#e23b4a] text-xs mt-5 bg-[#e23b4a]/10 border border-[#e23b4a]/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 bg-[#f3cc20] text-[#191c1f] font-display font-bold px-6 py-3 rounded-full text-sm hover:bg-[#c9a800] transition-all disabled:opacity-60"
          >
            <Plus size={16} weight="bold" />
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
          </button>
        </form>

        {/* List */}
        <div className="bg-[#191c1f] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base">All products</h3>
            <span className="bg-[#f3cc20]/20 text-[#f3cc20] text-xs font-semibold px-2.5 py-1 rounded-full">
              {products.length}
            </span>
          </div>

          {products.length === 0 ? (
            <p className="text-white/40 text-sm p-6">
              No products yet. Add your first one above.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {products.map((p) => (
                <li key={p.id} className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {p.imageDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageDataUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-white/45 text-xs truncate">
                      R{p.priceAmount.toLocaleString()} · {p.sizes.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                        p.active
                          ? 'bg-[#00a87e]/10 border-[#00a87e]/30 text-[#00a87e]'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {p.active ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle size={12} weight="fill" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <XCircle size={12} weight="fill" /> Hidden
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      className="text-white/60 hover:text-white text-xs border border-white/15 rounded-full px-3 py-1.5 inline-flex items-center gap-1"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
