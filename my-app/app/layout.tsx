import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/components/CartContext';
import { CartDrawer } from '@/components/CartDrawer';

export const metadata: Metadata = {
  title: 'GoDirect247 — Funeral Cover & Family Protection',
  description:
    'Family funeral cover with no medical exams, fast claims, and cashback rewards from month 4.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
