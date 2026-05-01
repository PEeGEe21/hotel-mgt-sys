import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HotelOS',
    short_name: 'HotelOS',
    description: 'Complete hotel operations platform',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f1117',
    theme_color: '#0f1117',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
      },
    ],
  };
}
