'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS } from './NavIcons';
import { T } from './theme';

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, walletAddress } = useAuth();

  if (!isAuthenticated) return null;

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : '';

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 w-56 border-r hidden md:flex flex-col z-20"
      style={{
        backgroundColor: T.bg,
        borderColor: T.borderDormant,
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: T.borderDormant }}>
        <Link
          href="/dungeon"
          className="text-lg font-bold tracking-wide"
          style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
        >
          Locked-In
        </Link>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all duration-150 hover:bg-[rgba(212,160,74,0.08)]"
              style={{
                backgroundColor: isActive ? `${T.amber}15` : 'transparent',
                color: isActive ? T.amber : T.textSecondary,
              }}
            >
              <item.icon color={isActive ? T.amber : 'rgba(255,255,255,0.35)'} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Wallet address footer */}
      <div
        className="px-4 py-3 border-t text-xs font-mono"
        style={{ borderColor: T.borderDormant, color: T.textMuted }}
      >
        {shortAddress}
      </div>
    </nav>
  );
}
