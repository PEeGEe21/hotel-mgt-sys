'use client';

import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { useAuthStore } from '@/store/auth.store';
import { useHydration } from '@/hooks/useHydration';
import { useAppStore } from '@/store/app.store';
import { Hotel, ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { usePathname, useRouter } from 'next/navigation';
import { stopImpersonationAction } from '@/actions/auth.actions';
import { useState } from 'react';
import openToast from '@/components/ToastComponent';

function AuthOverlay({ label }: { label: string }) {
  const hotel = useAppStore((s) => s.hotel);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117] flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center overflow-hidden shadow-lg mb-4">
        {hotel?.logo ? (
          <img src={hotel.logo} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <Hotel size={26} className="text-white" />
        )}
      </div>
      <p className="text-white font-semibold text-lg">{hotel?.name ?? 'HotelOS'}</p>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
      <div className="mt-5 w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydration();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setHotel = useAppStore((s) => s.setHotel);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { canPath, ready } = usePermissions();

  if (!hydrated) {
    return (
      <AuthProvider>
        <AuthOverlay label="Loading workspace..." />
      </AuthProvider>
    );
  }

  if (isLoading) {
    return (
      <AuthProvider>
        <AuthOverlay label="Signing out..." />
      </AuthProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthProvider>
        <AuthOverlay label="Verifying session..." />
      </AuthProvider>
    );
  }

  if (ready && !canPath(pathname)) {
    return (
      <AuthProvider>
        <div className="flex h-screen bg-[#0f1117] items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={24} className="text-red-400" />
            </div>
            <h1 className="text-white font-semibold text-xl">Access denied</h1>
            <p className="text-slate-500 text-sm mt-2">
              You don’t have permission to view this page.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="flex h-screen bg-[#0f1117] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {user?.isImpersonation && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-6 py-2.5 flex items-center justify-between">
              <div className="text-sm">
                You are impersonating <span className="font-semibold">{user.name}</span>
              </div>
              <button
                onClick={async () => {
                  if (stoppingImpersonation) return;
                  setStoppingImpersonation(true);
                  const result = await stopImpersonationAction();
                  if (result.success) {
                    setUser(result.user);
                    if (result.hotel) setHotel(result.hotel);
                    openToast('success', 'Returned to your account');
                    router.push('/dashboard');
                  } else {
                    openToast('error', result.message);
                  }
                  setStoppingImpersonation(false);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
              >
                {stoppingImpersonation ? 'Stopping...' : 'Stop impersonation'}
              </button>
            </div>
          )}
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
