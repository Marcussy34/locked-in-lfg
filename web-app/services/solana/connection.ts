import { Connection, clusterApiUrl } from '@solana/web3.js';

const envRpcEndpoint = (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? '').trim();

export const CLUSTER = 'devnet';
export const RPC_ENDPOINT = envRpcEndpoint || clusterApiUrl(CLUSTER);

export const connection = new Connection(RPC_ENDPOINT, 'confirmed');
