'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { T } from './theme';

/* Themed SVG icons — hand-crafted to match the dark fantasy aesthetic */
function IconCourses({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h5" />
    </svg>
  );
}
function IconFlame({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.38-2.35 1-3.5.5.88 1.13 1.62 1.5 3z" />
    </svg>
  );
}
function IconAlchemy({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v5l4 9a2 2 0 0 1-1.8 2.8H6.8A2 2 0 0 1 5 17l4-9V3z" />
      <path d="M9 3h6" />
      <path d="M7 15h10" />
    </svg>
  );
}
function IconRewards({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.1 8.6 2 9.3l5.3 4.6L5.8 21 12 17.3 18.2 21l-1.5-7.1L22 9.3l-7.1-.7z" />
    </svg>
  );
}
function IconLeaderboard({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H2v12h4V9zM14 4h-4v17h4V4zM22 13h-4v8h4v-8z" />
    </svg>
  );
}
function IconCommunity({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconProfile({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
      <path d="M19.5 22a7.5 7.5 0 0 0-15 0" />
    </svg>
  );
}

const NAV_ITEMS: { href: string; label: string; icon: (props: { color: string }) => ReactNode }[] = [
  { href: '/courses', label: 'Courses', icon: IconCourses },
  { href: '/dashboard', label: 'Dashboard', icon: IconFlame },
  { href: '/alchemy', label: 'Alchemy', icon: IconAlchemy },
  { href: '/shop', label: 'Rewards', icon: IconRewards },
  { href: '/leaderboard', label: 'Leaderboard', icon: IconLeaderboard },
  { href: '/community-pot', label: 'Community', icon: IconCommunity },
  { href: '/profile', label: 'Profile', icon: IconProfile },
];

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
