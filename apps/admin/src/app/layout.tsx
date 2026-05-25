import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'HotelOS Platform Admin',
  description: 'Platform console for managing HotelOS tenants and operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
