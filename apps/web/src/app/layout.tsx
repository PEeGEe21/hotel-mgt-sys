import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'HotelOS — Hotel Management System',
  description: 'Complete hotel operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        <Toaster richColors position="top-right" closeButton />

        {children}
      </body>
    </html>
  );
}
