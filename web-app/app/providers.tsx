'use client';

import type { SolanaClientConfig } from '@solana/client';
import { SolanaProvider } from '@solana/react-hooks';
import { DungeonProvider } from '@/components/DungeonProvider';

// Solana client configuration — devnet by default
const config: SolanaClientConfig = {
  cluster: 'devnet',
  rpc: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  websocket:
    process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? 'wss://api.devnet.solana.com',
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider config={config}>
      <DungeonProvider>{children}</DungeonProvider>
    </SolanaProvider>
  );
}
