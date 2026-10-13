import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forever Hotel',
  description: 'Welcome to Forever Hotel. Our new website is coming soon.',
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
