'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { DungeonProvider } from '@/components/DungeonProvider';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? `https://api.${SOLANA_CLUSTER}.solana.com`;
const WS_URL = process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? `wss://api.${SOLANA_CLUSTER}.solana.com`;

const solanaRpc = createSolanaRpc(RPC_URL);
const solanaRpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        solana: {
          rpcs: {
            [`solana:${SOLANA_CLUSTER}`]: {
              rpc: solanaRpc,
              rpcSubscriptions: solanaRpcSubscriptions,
            },
          },
        },
        appearance: {
          theme: 'dark',
          walletChainType: 'solana-only',
        },
        loginMethods: ['google', 'wallet'],
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <DungeonProvider>{children}</DungeonProvider>
    </PrivyProvider>
  );
}
