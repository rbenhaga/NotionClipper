import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NotionClipper Analytics',
  description: 'Analytics dashboard for NotionClipper - Apple × Notion design',
  robots: 'noindex, nofollow', // Private dashboard
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
