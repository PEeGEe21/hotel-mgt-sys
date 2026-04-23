'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '@/components/errors/AppErrorFallback';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <AppErrorFallback
          error={error}
          reset={reset}
          fullScreen
          title="We could not start cleanly"
          description="The shell of the application crashed. Try reloading it, or return to the dashboard if your session is still active."
        />
      </body>
    </html>
  );
}
