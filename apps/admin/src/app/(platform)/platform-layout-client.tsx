'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { AdminAuthProvider } from '@/components/providers/AdminAuthProvider';
import { useAdminAuthStore } from '@/store/admin-auth.store';
import { useHydration } from '@/hooks/useHydration';
import { usePathname, useRouter } from 'next/navigation';

export default function PlatformLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <PlatformLayoutInner>{children}</PlatformLayoutInner>
    </AdminAuthProvider>
  );
}

function PlatformLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const hydrated = useHydration();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const user = useAdminAuthStore((s) => s.user);
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, user, router, pathname]);

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center bg-[#ece7dc] text-sm text-slate-600">Loading workspace...</div>;
  }

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return <div className="flex min-h-screen items-center justify-center bg-[#ece7dc] text-sm text-slate-600">Verifying session...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece7dc]">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
