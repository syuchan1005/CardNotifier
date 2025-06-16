import type { WebAppManifest } from '@remix-pwa/dev';

export const loader = () => {
  return Response.json(
    {
      short_name: 'Card Notifier',
      name: 'Card Notifier',
      start_url: '/',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#424242',
      icons: [
        {
          src: "pwa-64x64.png",
          sizes: "64x64",
          type: "image/png"
        },
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png"
        },
        {
          src: "maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
    } as WebAppManifest,
    {
      headers: {
        'Cache-Control': 'public, max-age=600',
        'Content-Type': 'application/manifest+json',
      },
    }
  );
};
