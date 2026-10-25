import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forever City Hotel',
  description:
    'Discover Forever City Hotel: refined hospitality, elegant rooms, wellness, dining, and current offers in Colombo.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
