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
    'Geointeligencia, CRM omnicanal, brigadas, IA y movilización política en una sola plataforma.',
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
