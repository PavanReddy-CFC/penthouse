import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicConfig } from '@/config/public-config';
import './globals.css';

export const metadata: Metadata = {
  title: publicConfig.appName,
  description: `${publicConfig.appName} web application`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
