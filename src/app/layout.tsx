
import type { Metadata } from 'next';
import { Lato } from 'next/font/google'; // Changed from Geist
import './globals.css';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import AppProviders from '@/components/AppProviders';
import FloatingAddButton from '@/components/FloatingAddButton';

// Configure Lato font
const lato = Lato({
  variable: '--font-lato',
  subsets: ['latin'],
  weight: ['400', '700'], // Include desired weights
  display: 'swap',
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
        className={`${lato.variable} antialiased font-sans`} // Use Lato variable and font-sans
      >
        <AppProviders>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <FloatingAddButton />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
