import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const alacrity = localFont({
  src: [
    {
      path: '../../public/fonts/AlacritySans-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/AlacritySans-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/AlacritySans-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/AlacritySans-Black.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-alacrity',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ESTRATO - Cuartel Digital para Campañas Políticas',
  description:
    'Mapa territorial, histórico electoral, CRM, app de brigada y control de campaña en una sola plataforma para México.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  metadataBase: new URL('https://estrato.lat'),
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://estrato.lat',
    siteName: 'ESTRATO',
    title: 'ESTRATO - Cuartel Digital para Campañas Políticas',
    description:
      'Mapa territorial, histórico electoral, CRM, app de brigada y control de campaña en una sola plataforma para México.',
    images: [
      {
        url: 'https://estrato.lat/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ESTRATO - Cuartel Digital para Campañas Políticas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ESTRATO - Cuartel Digital para Campañas Políticas',
    description:
      'Mapa territorial, histórico electoral, CRM, app de brigada y control de campaña en una sola plataforma para México.',
    images: ['https://estrato.lat/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={alacrity.variable}>{children}</body>
    </html>
  );
}
