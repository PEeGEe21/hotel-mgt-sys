import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HotelOS',
    short_name: 'HotelOS',
    id: '/',
    description: 'Complete hotel operations platform',
    scope: '/',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f1117',
    theme_color: '#0f1117',
    orientation: 'portrait',
    icons: [
      {
        src: '/pwa-icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/pwa-icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
