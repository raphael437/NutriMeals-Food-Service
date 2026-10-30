import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/sections/Footer';
import Providers from '../components/providers/Providers';

export const metadata: Metadata = {
  title: 'NutriMeals',
  description: 'Experience the language of taste.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="flex min-h-screen flex-col bg-[#3A0F0F] text-[#F9F6F0] font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}