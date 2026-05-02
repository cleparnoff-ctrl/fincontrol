import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import { DataProvider } from '@/lib/store';
import AccessControl from '@/components/AccessControl';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FinControl | Inteligência Executiva',
  description: 'Dashboard de análises financeiras de alto nível e gestão de portfólio.',
};

import { AuthProvider } from '@/components/AuthProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${manrope.variable} dark`}>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <AccessControl/>
        <AuthProvider>
          <DataProvider>
            <Suspense fallback={null}>
              <TopNav />
            </Suspense>
            <Sidebar />
            <main className="lg:ml-64 pt-24 pb-12 px-4 md:px-8 min-h-screen">
              {children}
            </main>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
