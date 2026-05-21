'use client';

import { Printer } from '@phosphor-icons/react';
import { COMPANY_DETAILS, EFT_DETAILS, type PaymentMethod } from '@/lib/pearl-types';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issuedAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  deliveryFee?: number;
  handlingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: string;
  notes?: string;
}

function formatRand(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function Invoice({ data }: { data: InvoiceData }) {
  const isEft = data.paymentMethod === 'eft';

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .invoice-sheet {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print bg-[#191c1f] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="text-white font-display font-extrabold text-sm">
            Invoice {data.invoiceNumber}
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[#f3cc20] text-[#191c1f] font-display font-bold px-5 py-2.5 rounded-full text-xs hover:bg-[#c9a800] transition-all"
          >
            <Printer size={16} weight="bold" />
            Download / Print PDF
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="invoice-sheet bg-white border border-gray-200 shadow-sm rounded-lg p-10">
          {/* Letterhead */}
          <header className="flex items-start justify-between gap-6 pb-6 border-b-2 border-[#f3cc20]">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/godirect247-logo.jpg"
                alt="GoDirect247"
                className="w-20 h-20 object-contain rounded-lg"
              />
              <div>
                <h1 className="font-display font-extrabold text-[#191c1f] text-2xl leading-tight">
                  {COMPANY_DETAILS.name}
                </h1>
                <p className="text-gray-600 text-sm mt-0.5">{COMPANY_DETAILS.group}</p>
                <p className="text-gray-500 text-xs mt-1">{COMPANY_DETAILS.fspLicence}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                Invoice
              </p>
              <p className="font-mono text-[#191c1f] text-sm mt-1">{data.invoiceNumber}</p>
              <p className="text-gray-600 text-xs mt-2">{formatDate(data.issuedAt)}</p>
              <p
                className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                  data.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {data.status}
              </p>
            </div>
          </header>

          {/* Parties */}
          <section className="grid grid-cols-2 gap-6 mt-6 mb-6">
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide font-bold mb-1">
                From
              </p>
              <p className="text-[#191c1f] font-semibold text-sm">
                {COMPANY_DETAILS.name}
              </p>
              <p className="text-gray-600 text-xs">{COMPANY_DETAILS.group}</p>
              <p className="text-gray-600 text-xs">{COMPANY_DETAILS.fspLicence}</p>
              <p className="text-gray-600 text-xs">{COMPANY_DETAILS.website}</p>
              <p className="text-gray-600 text-xs">{COMPANY_DETAILS.supportEmail}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide font-bold mb-1">
                Billed to
              </p>
              <p className="text-[#191c1f] font-semibold text-sm">{data.customerName}</p>
              <p className="text-gray-600 text-xs break-all">{data.customerEmail}</p>
              {data.customerPhone && (
                <p className="text-gray-600 text-xs">{data.customerPhone}</p>
              )}
              {data.shippingAddress && (
                <p className="text-gray-600 text-xs whitespace-pre-line">
                  {data.shippingAddress}
                </p>
              )}
            </div>
          </section>

          {/* Line items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left text-gray-500 text-[10px] uppercase tracking-wide font-bold pb-2">
                  Description
                </th>
                <th className="text-right text-gray-500 text-[10px] uppercase tracking-wide font-bold pb-2 w-16">
                  Qty
                </th>
                <th className="text-right text-gray-500 text-[10px] uppercase tracking-wide font-bold pb-2 w-28">
                  Unit price
                </th>
                <th className="text-right text-gray-500 text-[10px] uppercase tracking-wide font-bold pb-2 w-28">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-[#191c1f]">{item.description}</td>
                  <td className="py-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-700">
                    {formatRand(item.unitPrice)}
                  </td>
                  <td className="py-3 text-right text-[#191c1f] font-semibold">
                    {formatRand(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{formatRand(data.subtotal)}</span>
              </div>
              {typeof data.deliveryFee === 'number' && data.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Delivery</span>
                  <span>{formatRand(data.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>
                  {isEft
                    ? 'EFT handling fee'
                    : 'Yoco handling fee (2.9%)'}
                </span>
                <span>{formatRand(data.handlingFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-[#191c1f] font-display font-extrabold text-[#191c1f] text-lg">
                <span>Total due</span>
                <span>{formatRand(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment instructions */}
          {isEft ? (
            <section className="bg-[#fffdf2] border-2 border-[#f3cc20] rounded-lg p-5 mb-6">
              <p className="text-[#191c1f] font-display font-extrabold text-sm mb-3">
                Payment instructions — EFT
              </p>
              <p className="text-gray-700 text-xs mb-3">
                Please make payment via EFT using the details below. Use your invoice
                number{' '}
                <span className="font-mono font-semibold">{data.invoiceNumber}</span> as
                the reference.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
                    Bank
                  </p>
                  <p className="text-[#191c1f] font-semibold">{EFT_DETAILS.bankName}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
                    Account holder
                  </p>
                  <p className="text-[#191c1f] font-semibold">
                    {EFT_DETAILS.accountHolder}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
                    Account number
                  </p>
                  <p className="text-[#191c1f] font-mono font-semibold">
                    {EFT_DETAILS.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
                    Branch code
                  </p>
                  <p className="text-[#191c1f] font-mono font-semibold">
                    {EFT_DETAILS.branchCode}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
                    Reference
                  </p>
                  <p className="text-[#191c1f] font-mono font-semibold">
                    {data.invoiceNumber}
                  </p>
                </div>
              </div>
              <p className="text-gray-600 text-[11px] mt-4">
                Once we&apos;ve received your payment, your order will be confirmed
                automatically. Please email proof of payment to{' '}
                {COMPANY_DETAILS.supportEmail} to speed things up.
              </p>
            </section>
          ) : (
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
              <p className="text-[#191c1f] font-display font-extrabold text-sm mb-2">
                Payment — Yoco
              </p>
              <p className="text-gray-700 text-xs">
                A 2.9% handling fee is added by Yoco. You were redirected to Yoco&apos;s
                secure checkout to complete payment.
              </p>
            </section>
          )}

          {data.notes && (
            <p className="text-gray-500 text-xs mb-4 italic">{data.notes}</p>
          )}

          <footer className="pt-4 border-t border-gray-200 text-center">
            <p className="text-gray-400 text-[11px]">
              {COMPANY_DETAILS.name} · {COMPANY_DETAILS.group} ·{' '}
              {COMPANY_DETAILS.fspLicence}
            </p>
            <p className="text-gray-400 text-[11px]">
              {COMPANY_DETAILS.website} · {COMPANY_DETAILS.supportEmail} ·{' '}
              {COMPANY_DETAILS.supportPhone}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
