import type { Metadata } from 'next';
import './globals.css';
import Nav from './components/Nav';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { getSession } from '@/src/auth/session';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'East Meadows HOA',
  description: 'East Meadows Homeowners Association',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Nav user={session} />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
