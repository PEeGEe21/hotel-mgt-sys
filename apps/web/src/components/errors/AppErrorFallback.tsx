'use client';

import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AppErrorFallbackProps = {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  fullScreen?: boolean;
};

export function AppErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
  description = 'The page hit an unexpected issue. You can try again or return to a safe screen.',
  homeHref = '/dashboard',
  fullScreen = false,
}: AppErrorFallbackProps) {
  return (
    <div
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden bg-[#0f1117] px-6 py-12 text-white',
        fullScreen ? 'min-h-screen' : 'min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10',
      )}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 shadow-[0_0_45px_rgba(245,158,11,0.18)]">
          <AlertTriangle className="h-7 w-7 text-amber-200" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-amber-100/70">
          Recovery mode
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">{description}</p>

        {error?.digest && (
          <p className="mt-4 text-xs text-slate-500">
            Error reference: <span className="font-mono text-slate-300">{error.digest}</span>
          </p>
        )}

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {reset && (
            <Button
              type="button"
              onClick={reset}
              className="h-10 rounded-xl bg-blue-500 px-4 font-bold text-white hover:bg-blue-400"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-white/15 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
          >
            <Link href={homeHref}>
              <Home className="mr-2 h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
        </div>

        {process.env.NODE_ENV !== 'production' && error?.message && (
          <pre className="mt-7 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-left text-xs text-slate-300">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
