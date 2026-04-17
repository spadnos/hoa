'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/acc', label: 'ACC' },
  { href: '/members', label: 'Members' },
  { href: '/chat', label: 'Assistant' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{ backgroundColor: 'var(--hoa-green)' }} className="text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-8">
        <span className="font-bold text-lg tracking-tight">East Meadows HOA</span>
        <div className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-opacity hover:opacity-100 ${
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + '/'))
                  ? 'opacity-100 underline underline-offset-4'
                  : 'opacity-75'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
