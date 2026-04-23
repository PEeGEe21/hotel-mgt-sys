'use client';

import { Compass, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotFoundFallbackProps = {
  title?: string;
  description?: string;
  homeHref?: string;
  fullScreen?: boolean;
};

export function NotFoundFallback({
  title = 'Page not found',
  description = 'The page you are looking for may have moved, been renamed, or no longer exists.',
  homeHref = '/dashboard',
  fullScreen = false,
}: NotFoundFallbackProps) {
  return (
    <div
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden bg-[#0f1117] px-6 py-12 text-white',
        fullScreen ? 'min-h-screen' : 'min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10',
      )}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(34,197,94,0.14),transparent_34%)]" />
      <div className="absolute left-1/2 top-10 -z-10 h-48 w-48 -translate-x-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-1/2 rounded-full border border-white/5" />

      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-300/10 shadow-[0_0_45px_rgba(14,165,233,0.18)]">
          <Compass className="h-7 w-7 text-sky-200" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-sky-100/70">
          404
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">{description}</p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            className="h-10 rounded-xl bg-blue-500 px-4 font-bold text-white hover:bg-blue-400"
          >
            <Link href={homeHref}>
              <Home className="mr-2 h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-white/15 bg-white/5 px-4 font-bold text-white hover:bg-white/10"
          >
            <Link href="/reservations">
              <Search className="mr-2 h-4 w-4" />
              Find reservations
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
