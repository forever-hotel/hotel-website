'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { publicLinks } from './navigation';

export function MainNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation">
      {publicLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
