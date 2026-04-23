'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '@/components/errors/AppErrorFallback';

export default function DashboardError({
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
      title="This workspace view crashed"
      description="The dashboard shell is still available. Try this page again, or go back to the main dashboard."
    />
  );
}
