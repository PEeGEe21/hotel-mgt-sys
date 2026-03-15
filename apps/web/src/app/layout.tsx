import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Figtree } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const fig_tree = Figtree({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--fig-tree',
});

export const metadata: Metadata = {
  title: 'HotelOS — Hotel Management System',
  description: 'Complete hotel operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('font-sans', inter.variable, fig_tree.variable)}
      suppressHydrationWarning={true}
    >
      <body>
        <ReactQueryProvider>
          <Toaster richColors position="top-right" closeButton />
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
