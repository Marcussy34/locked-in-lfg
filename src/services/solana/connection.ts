// src/services/solana/connection.ts
import '@/polyfills/buffer';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const envRpcEndpoint = (process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? '').trim();

// Switch to 'mainnet-beta' for production, or set EXPO_PUBLIC_SOLANA_RPC_URL.
export const CLUSTER = 'devnet';
export const RPC_ENDPOINT = envRpcEndpoint || clusterApiUrl(CLUSTER);

// Shared connection instance — reused across the app
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');
