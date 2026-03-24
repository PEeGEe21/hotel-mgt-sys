'use client';
import { useEffect, useState } from 'react';
import { Hotel, Lock, Mail, Eye, EyeOff, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/app.store';
import { useHotelBranding } from '@/hooks/useHotelBranding';
import openToast from '@/components/ToastComponent';

export default function LoginPage() {
  // const login = useAuthStore((s) => s.login);

  const { login, isLoading, error, clearError } = useAuthStore();
  const { setHotel } = useAppStore();
  const hotel = useHotelBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState('');

  useEffect(() => {
    return () => clearError();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // setError('');
    try {
      const result = await login(email, password);
      if (!result.success) {
        // setError(result.message ?? 'Invalid email or password.');
        setLoading(false);
        return;
      }

      if (result.hotel) setHotel(result.hotel);

      openToast('success', 'Logged In Successfully');
      
      if (result.user?.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      // Respect ?from= redirect, fall back to dashboard
      const from = searchParams.get('from') ?? '/dashboard';
      router.push(from);
    } catch {
      // setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      {/* Bg glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {hotel?.logo ? (
            <img
              src={hotel.logo}
              alt={hotel.name}
              className="w-14 h-14 rounded-2xl object-cover mb-4 shadow-xl"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/25">
              <Hotel size={26} className="text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{hotel?.name ?? 'HotelOS'}</h1>
          {hotel?.city && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              <MapPin size={11} />
              {hotel.city}, {hotel.country}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-2">Sign in to your account</p>
        </div>

        {/* <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/25">
            <Hotel size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to HotelOS</p>
        </div> */}

        {/* Card */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@hotel.com"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">
          {hotel?.name ?? 'HotelOS'} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
