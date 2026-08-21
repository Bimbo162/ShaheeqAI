import './globals.css';
import { Providers } from '@/components/Providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shaheeq AI',
  description: 'المساعد الطبي الذكي',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}