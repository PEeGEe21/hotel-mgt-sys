'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true once the component has mounted on the client.
 * Use this to prevent Zustand hydration flashes — on the server
 * and first render, stores are empty. After mount they hydrate
 * from sessionStorage/localStorage.
 *
 * Usage:
 *   const hydrated = useHydration();
 *   if (!hydrated) return <Skeleton />;
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}