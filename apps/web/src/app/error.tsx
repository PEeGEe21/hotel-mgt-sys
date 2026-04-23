'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '@/components/errors/AppErrorFallback';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      fullScreen
      title="We needs a quick reset"
      description="Something failed while loading this part of the app. Try again, or return to the dashboard."
    />
  );
}
