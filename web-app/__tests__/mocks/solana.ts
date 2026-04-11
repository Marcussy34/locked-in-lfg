import { vi } from 'vitest';

export const mockConnection = {
  getAccountInfo: vi.fn().mockResolvedValue(null),
  getMultipleAccountsInfo: vi.fn().mockResolvedValue([]),
  getBalance: vi.fn().mockResolvedValue(0),
  getLatestBlockhash: vi.fn().mockResolvedValue({
    blockhash: 'FakeBlockhash11111111111111111111111111111111',
    lastValidBlockHeight: 100,
  }),
  confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
  sendRawTransaction: vi.fn().mockResolvedValue('FakeTxSig111'),
  getTokenAccountBalance: vi.fn().mockResolvedValue({
    value: { amount: '0', decimals: 6, uiAmount: 0, uiAmountString: '0' },
  }),
};

export function setupSolanaMock() {
  vi.mock('@/services/solana/connection', () => ({
    connection: mockConnection,
    CLUSTER: 'devnet',
    RPC_ENDPOINT: 'https://api.devnet.solana.com',
  }));
}

export function resetSolanaMock() {
  Object.values(mockConnection).forEach((mock) => {
    if (typeof mock.mockClear === 'function') mock.mockClear();
  });
}
