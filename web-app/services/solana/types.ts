// Types shared across Solana services
export interface LockAccountSnapshot {
  lockAccountAddress: string;
  principalAmountUi: string;
  skrLockedAmountUi: string;
  lockStartDate: string;
  lockEndDate: string;
  gauntletComplete: boolean;
  gauntletDay: number;
  fuelCounter: number;
  fuelCap: number;
  saverRecoveryMode: boolean;
  currentYieldRedirectBps: number;
  extensionDays: number;
  ichorCounter: number;
  ichorLifetimeTotal: number;
  conversionBps: number;
  conversionRateLabel: string;
  unlockEligible: boolean;
  status: number;
}

export type LockDurationDays = 14 | 30 | 45 | 60 | 90 | 180 | 365;
