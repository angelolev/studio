
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import AppProviders from '@/components/AppProviders';
import FloatingAddButton from '@/components/FloatingAddButton'; // Import the new button

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LocalEats - Encuentra Tu Próxima Comida',
  description: 'Descubre y reseña restaurantes locales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <AppProviders>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <FloatingAddButton /> {/* Add the button here */}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
