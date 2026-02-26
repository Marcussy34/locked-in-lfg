import type { Course, Lesson } from '@/types';

export const MOCK_COURSES: Course[] = [
  {
    id: 'solana-fundamentals',
    title: 'Solana Fundamentals',
    description:
      'Learn the core concepts of the Solana blockchain — accounts, transactions, programs, and the runtime that makes it all tick.',
    totalLessons: 5,
    completedLessons: 0,
    difficulty: 'beginner',
    category: 'solana',
    imageUrl: null,
  },
];

export const MOCK_LESSONS: Record<string, Lesson[]> = {
  'solana-fundamentals': [
    {
      id: 'sf-1',
      courseId: 'solana-fundamentals',
      title: 'What is Solana?',
      order: 1,
      content:
        'Solana is a high-performance blockchain designed for decentralized applications and crypto-currencies. It can process thousands of transactions per second with sub-second finality, making it one of the fastest blockchains in existence.\n\nUnlike Ethereum which uses a global state machine, Solana uses a unique combination of Proof of History (PoH) and Proof of Stake (PoS) to achieve consensus. Proof of History creates a historical record that proves events occurred at a specific moment in time, acting as a cryptographic clock for the network.\n\nSolana was founded by Anatoly Yakovenko in 2017 and launched its mainnet beta in March 2020. The native token is SOL, which is used for transaction fees and staking.',
      questions: [
        {
          id: 'sf-1-q1',
          type: 'mcq',
          prompt: 'What consensus mechanisms does Solana combine?',
          options: [
            'Proof of Work and Proof of Stake',
            'Proof of History and Proof of Stake',
            'Delegated Proof of Stake and Proof of Authority',
            'Proof of History and Proof of Work',
          ],
          correctAnswer: 'Proof of History and Proof of Stake',
        },
        {
          id: 'sf-1-q2',
          type: 'short_text',
          prompt: 'What is the name of Solana\'s native token?',
          correctAnswer: 'SOL',
        },
      ],
    },
    {
      id: 'sf-2',
      courseId: 'solana-fundamentals',
      title: 'Accounts & the Account Model',
      order: 2,
      content:
        'Everything on Solana is an account. Accounts are the fundamental data storage primitive — they hold both data and SOL balances. Each account has an address (a 32-byte public key), a lamport balance, an owner program, and a data field.\n\nThere are three main types of accounts: data accounts that store arbitrary data, program accounts that contain executable code, and native accounts used by built-in system programs. Data accounts are further split into system-owned accounts and Program Derived Addresses (PDAs).\n\nUnlike Ethereum where smart contracts have their own storage, Solana programs are stateless. All state is stored in separate accounts that are passed to the program during execution. This separation of code and state is a key architectural difference.',
      questions: [
        {
          id: 'sf-2-q1',
          type: 'mcq',
          prompt: 'How large is a Solana account address?',
          options: ['16 bytes', '20 bytes', '32 bytes', '64 bytes'],
          correctAnswer: '32 bytes',
        },
        {
          id: 'sf-2-q2',
          type: 'mcq',
          prompt: 'What is a key difference between Solana programs and Ethereum smart contracts?',
          options: [
            'Solana programs are written in JavaScript',
            'Solana programs are stateless — state lives in separate accounts',
            'Solana programs cannot interact with other programs',
            'Solana programs run on a virtual machine',
          ],
          correctAnswer:
            'Solana programs are stateless — state lives in separate accounts',
        },
        {
          id: 'sf-2-q3',
          type: 'short_text',
          prompt: 'What are accounts that derive their address from a program called? (abbreviation)',
          correctAnswer: 'PDA',
        },
      ],
    },
    {
      id: 'sf-3',
      courseId: 'solana-fundamentals',
      title: 'Transactions & Instructions',
      order: 3,
      content:
        'Transactions are the way users interact with the Solana network. A transaction is a bundle of one or more instructions, each targeting a specific on-chain program. Transactions are atomic — either all instructions succeed or none of them do.\n\nEach instruction specifies: the program to call, the accounts it needs to read or write, and an instruction data payload. A transaction also includes a recent blockhash (to prevent replay attacks) and one or more signatures from the accounts that authorize the transaction.\n\nSolana transactions have a size limit of 1232 bytes. Transaction fees on Solana are deterministic and based on the number of signatures required, not on computational complexity like Ethereum gas fees. The base fee is 5000 lamports per signature (0.000005 SOL).',
      questions: [
        {
          id: 'sf-3-q1',
          type: 'mcq',
          prompt: 'What happens if one instruction in a Solana transaction fails?',
          options: [
            'Only that instruction is reverted',
            'The entire transaction fails — all instructions are reverted',
            'The remaining instructions still execute',
            'The transaction is retried automatically',
          ],
          correctAnswer:
            'The entire transaction fails — all instructions are reverted',
        },
        {
          id: 'sf-3-q2',
          type: 'short_text',
          prompt: 'What is the maximum size of a Solana transaction in bytes?',
          correctAnswer: '1232',
        },
        {
          id: 'sf-3-q3',
          type: 'mcq',
          prompt: 'Why does a Solana transaction include a recent blockhash?',
          options: [
            'To calculate the transaction fee',
            'To prevent replay attacks',
            'To determine which validator processes it',
            'To encrypt the transaction data',
          ],
          correctAnswer: 'To prevent replay attacks',
        },
      ],
    },
    {
      id: 'sf-4',
      courseId: 'solana-fundamentals',
      title: 'Programs & the Runtime',
      order: 4,
      content:
        'Programs on Solana are the equivalent of smart contracts on other blockchains. They are compiled to BPF (Berkeley Packet Filter) bytecode and deployed to the network. Programs are stateless and process instructions by reading from and writing to accounts passed in by the caller.\n\nSolana has several built-in native programs: the System Program (creates accounts and transfers SOL), the Token Program (manages SPL tokens), and the Associated Token Account Program (creates deterministic token accounts). Most DeFi and NFT applications build on top of these native programs.\n\nThe Solana runtime enforces strict rules: programs can only modify accounts they own, accounts must have enough lamports to be rent-exempt, and cross-program invocations (CPIs) allow programs to call other programs while maintaining security guarantees.',
      questions: [
        {
          id: 'sf-4-q1',
          type: 'mcq',
          prompt: 'What bytecode format do Solana programs compile to?',
          options: ['EVM bytecode', 'WebAssembly', 'BPF bytecode', 'JVM bytecode'],
          correctAnswer: 'BPF bytecode',
        },
        {
          id: 'sf-4-q2',
          type: 'short_text',
          prompt: 'What is the name of the mechanism that allows Solana programs to call other programs? (abbreviation)',
          correctAnswer: 'CPI',
        },
      ],
    },
    {
      id: 'sf-5',
      courseId: 'solana-fundamentals',
      title: 'Wallets & Keypairs',
      order: 5,
      content:
        'A Solana wallet is fundamentally a keypair — a public key (your address) and a private key (your secret). The public key is a 32-byte Ed25519 key that serves as your on-chain identity. The private key is used to sign transactions and should never be shared.\n\nWallets can be generated from a seed phrase (also called a mnemonic), which is typically 12 or 24 words following the BIP-39 standard. This seed phrase can deterministically generate multiple keypairs using derivation paths, allowing one backup phrase to control many accounts.\n\nPopular Solana wallets include Phantom, Solflare, and Backpack. For developers, the Solana CLI provides a file-system wallet, and the @solana/web3.js library offers programmatic keypair generation and transaction signing.',
      questions: [
        {
          id: 'sf-5-q1',
          type: 'mcq',
          prompt: 'What cryptographic curve does Solana use for keypairs?',
          options: ['secp256k1', 'Ed25519', 'P-256', 'Curve25519'],
          correctAnswer: 'Ed25519',
        },
        {
          id: 'sf-5-q2',
          type: 'short_text',
          prompt: 'How many words is a standard Solana seed phrase? (pick either common length)',
          correctAnswer: '12',
        },
        {
          id: 'sf-5-q3',
          type: 'mcq',
          prompt: 'Which of these is NOT a popular Solana wallet?',
          options: ['Phantom', 'MetaMask', 'Solflare', 'Backpack'],
          correctAnswer: 'MetaMask',
        },
      ],
    },
  ],
};
