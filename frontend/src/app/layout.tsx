import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const bodyFont = localFont({
  src: './fonts/Manrope.woff2',
  variable: '--font-manrope',
  display: 'swap',
  weight: '400 700',
});
const headingFont = localFont({
  src: './fonts/CormorantGaramond.woff2',
  variable: '--font-cormorant',
  display: 'swap',
  weight: '400 700',
});

export const metadata: Metadata = {
  title: 'Forever City Hotel',
  description:
    'Discover Forever City Hotel: refined hospitality, elegant rooms, wellness, dining, and current offers in Colombo.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
