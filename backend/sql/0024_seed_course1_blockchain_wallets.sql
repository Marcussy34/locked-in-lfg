create extension if not exists pgcrypto;

do $seed$
declare
  v_release_id uuid;

  v_bw1_version_id uuid;
  v_bw2_version_id uuid;
  v_bw3_version_id uuid;
  v_bw4_version_id uuid;
  v_bw5_version_id uuid;
  v_bw6_version_id uuid;
  v_bw7_version_id uuid;
  v_bw8_version_id uuid;

  v_bw1_payload jsonb;
  v_bw2_payload jsonb;
  v_bw3_payload jsonb;
  v_bw4_payload jsonb;
  v_bw5_payload jsonb;
  v_bw6_payload jsonb;
  v_bw7_payload jsonb;
  v_bw8_payload jsonb;
begin
  if exists (
    select 1
    from lesson.publish_releases
    where release_name = 'course1-blockchain-wallets-v1'
  ) then
    raise notice 'Seed skipped: course1-blockchain-wallets-v1 already exists.';
    return;
  end if;

  ---------------------------------------------------------------------------
  -- 1. Course
  ---------------------------------------------------------------------------
  insert into lesson.courses (
    id,
    slug,
    title,
    description,
    category,
    difficulty,
    estimated_minutes,
    min_principal_amount_usdc,
    max_principal_amount_usdc,
    demo_principal_amount_usdc,
    min_lock_duration_days,
    max_lock_duration_days
  ) values (
    'blockchain-wallets',
    'blockchain-and-wallets',
    'Blockchain & Wallets',
    'How Your Money Actually Works — From trust and middlemen to self-custody, understand the technology behind your locked USDC.',
    'solana',
    'beginner',
    60,
    10,
    100,
    1,
    10,
    30
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    difficulty = excluded.difficulty,
    estimated_minutes = excluded.estimated_minutes,
    min_principal_amount_usdc = excluded.min_principal_amount_usdc,
    max_principal_amount_usdc = excluded.max_principal_amount_usdc,
    demo_principal_amount_usdc = excluded.demo_principal_amount_usdc,
    min_lock_duration_days = excluded.min_lock_duration_days,
    max_lock_duration_days = excluded.max_lock_duration_days,
    updated_at = now();

  ---------------------------------------------------------------------------
  -- 2. Module
  ---------------------------------------------------------------------------
  insert into lesson.modules (
    id,
    slug,
    title,
    description,
    difficulty,
    estimated_minutes
  ) values (
    'blockchain-wallets-module-core',
    'blockchain-wallets-core',
    'Blockchain & Wallets Core',
    'Core module for Course 1: Blockchain & Wallets — How Your Money Actually Works.',
    'beginner',
    60
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    difficulty = excluded.difficulty,
    estimated_minutes = excluded.estimated_minutes,
    updated_at = now();

  insert into lesson.course_modules (course_id, module_id, module_order, is_required) values
    ('blockchain-wallets', 'blockchain-wallets-module-core', 1, true)
  on conflict (course_id, module_id) do update set
    module_order = excluded.module_order,
    is_required = excluded.is_required;

  ---------------------------------------------------------------------------
  -- 3. Lessons
  ---------------------------------------------------------------------------
  insert into lesson.lessons (id, slug, title) values
    ('bw-1', 'the-problem-that-started-everything',  'The Problem That Started Everything'),
    ('bw-2', 'solana-the-blockchain-your-money-lives-on', 'Solana — The Blockchain Your Money Lives On'),
    ('bw-3', 'wallets-the-key-you-didnt-know-you-had', 'Wallets — The Key You Didn''t Know You Had'),
    ('bw-4', 'transactions-what-happens-when-you-tap', 'Transactions — What Happens When You Tap a Button'),
    ('bw-5', 'smart-contracts-the-code-that-guards-your-money', 'Smart Contracts — The Code That Guards Your Money'),
    ('bw-6', 'tokens-not-all-digital-money-is-the-same', 'Tokens — Not All Digital Money Is the Same'),
    ('bw-7', 'security-the-lesson-that-could-save-you-thousands', 'Security — The Lesson That Could Save You Thousands'),
    ('bw-8', 'taking-the-keys-self-custody-and-what-comes-next', 'Taking the Keys — Self-Custody and What Comes Next')
  on conflict (id) do update set
    title = excluded.title,
    updated_at = now();

  insert into lesson.module_lessons (module_id, lesson_id, lesson_order, is_required) values
    ('blockchain-wallets-module-core', 'bw-1', 1, true),
    ('blockchain-wallets-module-core', 'bw-2', 2, true),
    ('blockchain-wallets-module-core', 'bw-3', 3, true),
    ('blockchain-wallets-module-core', 'bw-4', 4, true),
    ('blockchain-wallets-module-core', 'bw-5', 5, true),
    ('blockchain-wallets-module-core', 'bw-6', 6, true),
    ('blockchain-wallets-module-core', 'bw-7', 7, true),
    ('blockchain-wallets-module-core', 'bw-8', 8, true)
  on conflict (module_id, lesson_id) do update set
    lesson_order = excluded.lesson_order,
    is_required = excluded.is_required;

  ---------------------------------------------------------------------------
  -- 4. Publish release
  ---------------------------------------------------------------------------
  insert into lesson.publish_releases (release_name, notes, created_by)
  values (
    'course1-blockchain-wallets-v1',
    'Course 1: Blockchain & Wallets — 8 beginner lessons covering trust, Solana, wallets, transactions, smart contracts, tokens, security, and self-custody.',
    'seed-script'
  )
  returning id into v_release_id;

  ---------------------------------------------------------------------------
  -- 5. Lesson versions
  ---------------------------------------------------------------------------
  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-1', 1, 'published', v_release_id, 'Initial lesson: The Problem That Started Everything.', md5('bw-1-v1'), 'seed-script', now())
  returning id into v_bw1_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-2', 1, 'published', v_release_id, 'Initial lesson: Solana — The Blockchain Your Money Lives On.', md5('bw-2-v1'), 'seed-script', now())
  returning id into v_bw2_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-3', 1, 'published', v_release_id, 'Initial lesson: Wallets — The Key You Didn''t Know You Had.', md5('bw-3-v1'), 'seed-script', now())
  returning id into v_bw3_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-4', 1, 'published', v_release_id, 'Initial lesson: Transactions — What Happens When You Tap a Button.', md5('bw-4-v1'), 'seed-script', now())
  returning id into v_bw4_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-5', 1, 'published', v_release_id, 'Initial lesson: Smart Contracts — The Code That Guards Your Money.', md5('bw-5-v1'), 'seed-script', now())
  returning id into v_bw5_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-6', 1, 'published', v_release_id, 'Initial lesson: Tokens — Not All Digital Money Is the Same.', md5('bw-6-v1'), 'seed-script', now())
  returning id into v_bw6_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-7', 1, 'published', v_release_id, 'Initial lesson: Security — The Lesson That Could Save You Thousands.', md5('bw-7-v1'), 'seed-script', now())
  returning id into v_bw7_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('bw-8', 1, 'published', v_release_id, 'Initial lesson: Taking the Keys — Self-Custody and What Comes Next.', md5('bw-8-v1'), 'seed-script', now())
  returning id into v_bw8_version_id;

  ---------------------------------------------------------------------------
  -- 6. Lesson blocks
  ---------------------------------------------------------------------------

  -- ── bw-1: The Problem That Started Everything ──────────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw1_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-1-block-1','type','paragraph','order',1,'text',$$Before We Talk Tech, Let's Talk Trust

Every time you swipe your card, send money through an app, or check your bank balance, you're trusting someone. You trust your bank to hold your money honestly. You trust Visa to move it correctly. You trust PayPal not to freeze your account for no reason.

Most of the time, this works fine. But "most of the time" isn't the same as "always." And when it doesn't work, you're at someone else's mercy.$$)
  ),
  (
    v_bw1_version_id, 2, 'paragraph',
    jsonb_build_object('id','bw-1-block-2','type','paragraph','order',2,'text',$$The Problem with Middlemen

Every financial transaction you've ever made has gone through a middleman — a bank, a payment processor, a clearinghouse. These middlemen have enormous power over your money:

They can say no. Banks can freeze accounts, reject transactions, or close your account entirely — sometimes with no explanation.

They make mistakes. Money gets lost in transfers. Transactions fail. Disputes take weeks.

They can fail. When banks collapse, your savings can vanish. In 2008, millions of people watched their "safe" money disappear.

They charge fees. Every swipe, every transfer, every conversion — someone takes a cut. Those cuts add up to hundreds of billions of dollars a year.

They know everything. Every purchase, every transfer, every balance — your entire financial life is visible to your bank and the companies it shares data with.$$)
  ),
  (
    v_bw1_version_id, 3, 'callout',
    jsonb_build_object('id','bw-1-block-3','type','callout','order',3,'text',$$The Question: In 2008, as the global financial system teetered on the edge of collapse, someone asked a radical question — what if we didn't need middlemen at all? What if there was a system where people could send value directly to each other, verified by math instead of trust?$$,'calloutTone','info')
  ),
  (
    v_bw1_version_id, 4, 'paragraph',
    jsonb_build_object('id','bw-1-block-4','type','paragraph','order',4,'text',$$What Is a Blockchain? (The Simple Version)

Imagine a small village where everyone trades goods. Instead of trusting one person to keep the record book, every villager keeps an identical copy.

A shared record book — Instead of one bank's database, thousands of computers each hold a copy of every transaction ever made. No single entity controls it.

Each page is a block — Transactions are grouped together into blocks. Each block gets a timestamp and a unique code (called a hash).

The chain — Each block references the previous block's hash, creating an unbreakable chain. Change one old record, and every block after it becomes invalid. Everyone would notice instantly.

The villagers are validators — Thousands of computers around the world maintain these copies and verify every new transaction. They agree on what's true through a process called consensus.

This is a blockchain: a shared, transparent, tamper-proof record of every transaction — owned by nobody and verified by everyone.$$)
  ),
  (
    v_bw1_version_id, 5, 'callout',
    jsonb_build_object('id','bw-1-block-5','type','callout','order',5,'text',$$Why Should You Care? This isn't abstract. The USDC you lock in LockedIn lives on a blockchain right now. Nobody can freeze it, nobody can take it, and nobody can change the rules after you've locked it. Understanding how that works is the foundation of everything else in this course.$$,'calloutTone','info')
  );

  -- ── bw-2: Solana — The Blockchain Your Money Lives On ──────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw2_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-2-block-1','type','paragraph','order',1,'text',$$Not All Blockchains Are the Same

Now that you know what a blockchain is, you should know there are many of them — and they're very different. Think of them like different transportation systems:

Bitcoin — The freight train. First, most well-known, extremely secure. But slow (10-minute blocks) and expensive ($1-20 per transaction). Great for storing value, not great for everyday use.

Ethereum — The busy highway. Flexible and powerful (smart contracts were popularized here). But congested and expensive ($5-50 per transaction during peak times). It's where most of DeFi was born, but it struggles under heavy traffic.

Solana — The bullet train. Fast (transactions settle in about 0.4 seconds), incredibly cheap ($0.00025 per transaction), and built for high throughput. This is where LockedIn lives, and where your USDC is locked.$$)
  ),
  (
    v_bw2_version_id, 2, 'code',
    jsonb_build_object('id','bw-2-block-2','type','code','order',2,'text',$$Blockchain Comparison:
┌──────────────┬─────────────┬──────────────────┬──────────────────┐
│  Blockchain  │    Speed    │   Cost / Tx      │   Analogy        │
├──────────────┼─────────────┼──────────────────┼──────────────────┤
│  Bitcoin     │  ~10 min    │  $1 – $20        │  Freight train   │
│  Ethereum    │  ~12 sec    │  $5 – $50        │  Busy highway    │
│  Solana      │  ~0.4 sec   │  ~$0.00025       │  Bullet train    │
└──────────────┴─────────────┴──────────────────┴──────────────────┘$$)
  ),
  (
    v_bw2_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-2-block-3','type','paragraph','order',3,'text',$$Who Runs Solana?

Nobody — and everybody. Solana is maintained by thousands of validators around the world. No company, government, or individual controls it. Think of it like Wikipedia: lots of people contribute, there are rules for how content is verified, but no single person owns it.

Validators are computers that process transactions, maintain copies of the blockchain, and vote on which transactions are valid. They earn SOL tokens for their work — that's their incentive to keep the network running honestly.$$)
  ),
  (
    v_bw2_version_id, 4, 'paragraph',
    jsonb_build_object('id','bw-2-block-4','type','paragraph','order',4,'text',$$What Lives on Solana?

Everything on Solana is organized into accounts. Think of the blockchain as a giant filing cabinet:

Accounts — Every wallet, every token balance, every program has an account. Accounts store data and are identified by unique addresses.

Tokens — Digital assets like USDC and SOL. Each token follows a standard (SPL) so every wallet and app can handle them.

Programs — The equivalent of apps. Programs are code deployed to the blockchain that can process transactions and manage accounts. LockedIn's smart contract is a Solana program.

Transactions — Instructions sent to programs. Every action you take — locking USDC, completing a lesson, earning Fuel — is a transaction recorded permanently.$$)
  ),
  (
    v_bw2_version_id, 5, 'callout',
    jsonb_build_object('id','bw-2-block-5','type','callout','order',5,'text',$$SOL Is the Fuel: Just like a car needs petrol, Solana needs SOL. Every transaction costs a tiny amount of SOL (fractions of a cent). This fee goes to validators who process your transaction. You'll need a tiny bit of SOL in your wallet to interact with the network — LockedIn handles this for you initially.$$,'calloutTone','info')
  );

  -- ── bw-3: Wallets — The Key You Didn't Know You Had ────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw3_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-3-block-1','type','paragraph','order',1,'text',$$You Already Have a Crypto Wallet

When you signed up for LockedIn, a crypto wallet was created for you behind the scenes (powered by Privy). You might not have noticed — that's by design. But understanding what this wallet actually is will change how you think about your money.$$)
  ),
  (
    v_bw3_version_id, 2, 'paragraph',
    jsonb_build_object('id','bw-3-block-2','type','paragraph','order',2,'text',$$Forget the Wrong Picture

When most people hear "wallet," they picture something that holds money — like a vault or a bank account. That's the wrong mental model for crypto.

A crypto wallet is more like a key to a locker. Imagine a wall of transparent lockers at a train station. Everyone can see what's inside every locker (the blockchain is public), but only the person with the right key can open theirs.

Your money doesn't live inside the wallet. It lives on the blockchain. The wallet just proves it's yours.$$)
  ),
  (
    v_bw3_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-3-block-3','type','paragraph','order',3,'text',$$Two Keys: Public and Private

Every wallet has two keys, and understanding the difference is critical:

Public key (your address) — This is like your email address. It's safe to share. People use it to send you money. On Solana, it looks like a string of letters and numbers: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU.

Private key (your secret) — This is like the password that controls your account. Anyone who has your private key can access your funds. Never, ever share it.

These two keys work together through cryptography. When you send a transaction, your private key creates a digital signature — mathematical proof that you authorized the action — without ever revealing the private key itself.$$)
  ),
  (
    v_bw3_version_id, 4, 'callout',
    jsonb_build_object('id','bw-3-block-4','type','callout','order',4,'text',$$Important: Your wallet is NOT the app. Phantom, Solflare, LockedIn — these are just interfaces to interact with the blockchain. If LockedIn disappeared tomorrow, your wallet still exists on the blockchain. You could access it through any compatible app using your private key. Your money is never trapped in an app.$$,'calloutTone','info')
  );

  -- ── bw-4: Transactions — What Happens When You Tap a Button ────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw4_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-4-block-1','type','paragraph','order',1,'text',$$Every Tap Writes History

Every time you do something on LockedIn — lock your USDC, complete a lesson, earn Fuel — a transaction is recorded on the Solana blockchain. Permanently. That's not a figure of speech. In 100 years, someone could look up the exact moment you locked your first dollar.

Let's break down what's inside a transaction.$$)
  ),
  (
    v_bw4_version_id, 2, 'code',
    jsonb_build_object('id','bw-4-block-2','type','code','order',2,'text',$$Anatomy of a Transaction:
┌──────────────────────────────────────────────────┐
│  From        Your wallet address                 │
│  To          The smart contract (program)        │
│  Instruction "Lock 50 USDC for 30 days"          │
│  Signature   Proof you authorized this           │
│  Fee         ~0.000005 SOL                       │
│  Timestamp   Exact time of confirmation          │
│  Hash        Unique ID for this transaction      │
└──────────────────────────────────────────────────┘$$)
  ),
  (
    v_bw4_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-4-block-3','type','paragraph','order',3,'text',$$Tracing Your Actions on LockedIn

Let's trace what happens when you use LockedIn:

Locking USDC — You tell the smart contract: "Take 50 USDC from my wallet and lock it for 30 days." A transaction moves your USDC from your token account to the contract's vault. The contract records the lock terms.

Earning Fuel — When you complete a lesson and your answers are verified, the smart contract increments your Fuel counter. Fuel is not a token you can send — it's a number tracked inside the contract.

Brewing Ichor — When you use Fuel at the alchemy table, the contract burns your Fuel counter and increments your Ichor counter. Ichor can later be redeemed for USDC from the yield your locked funds generated.

Each of these actions is a separate transaction with its own hash, permanently recorded on Solana.$$)
  ),
  (
    v_bw4_version_id, 4, 'paragraph',
    jsonb_build_object('id','bw-4-block-4','type','paragraph','order',4,'text',$$Gas Fees — Digital Postage Stamps

Every transaction costs a tiny fee paid in SOL. Think of it like a postage stamp — you pay a small amount to have your transaction delivered and processed by validators.

On Solana, this fee is roughly $0.00025 per transaction. For comparison, a Visa transaction costs merchants 1.5-3.5% of the transaction amount. A $50 Visa purchase costs the merchant about $1.25 in fees. The same transaction on Solana would cost a fraction of a cent.$$)
  ),
  (
    v_bw4_version_id, 5, 'callout',
    jsonb_build_object('id','bw-4-block-5','type','callout','order',5,'text',$$Why Irreversibility Matters: Unlike a credit card charge, blockchain transactions can't be reversed. This might sound scary, but it's actually a feature. It means nobody can freeze your account, claw back your money, or alter your transaction history. Once it's confirmed, it's done. This is what makes your locked USDC truly secure.$$,'calloutTone','info')
  );

  -- ── bw-5: Smart Contracts — The Code That Guards Your Money ─────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw5_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-5-block-1','type','paragraph','order',1,'text',$$The Vending Machine Analogy

Imagine a vending machine that's completely transparent — you can see all the gears and mechanisms inside. You put in money, press a button, and the machine delivers your item. No cashier needed. No trust required. The rules are visible, automatic, and the same for everyone.

That's a smart contract: code that lives on the blockchain and automatically executes rules when conditions are met. No human intervention. No exceptions. No "we'll get back to you."$$)
  ),
  (
    v_bw5_version_id, 2, 'paragraph',
    jsonb_build_object('id','bw-5-block-2','type','paragraph','order',2,'text',$$LockedIn's Smart Contract Rules

The LockedIn smart contract enforces every rule you've encountered:

The Lock — When you deposit USDC, the contract holds it in a vault. It records how much you locked, for how long, and when you started. Nobody can change these terms after the fact.

The Fuel Counter — When you complete lessons and your answers are verified on-chain, the contract increments your Fuel counter. It enforces the daily cap (1 Fuel/day) and the wallet cap (7-14 Fuel maximum).

The Brewer — When you brew Ichor from Fuel, the contract checks your Fuel balance, burns it, and credits Ichor. The exchange rate is fixed in code.

The Streak — The contract tracks your daily completions. If you miss a day, it knows. Saver penalties are calculated automatically.

The Unlock — When your lock period ends, the contract releases your USDC plus any accrued yield. No approval needed. No waiting period beyond what you agreed to.$$)
  ),
  (
    v_bw5_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-5-block-3','type','paragraph','order',3,'text',$$Why This Matters

You don't need to trust the LockedIn team. The rules are in the code, visible on the blockchain for anyone to verify. There's no back office that can make exceptions for some users and not others. The rules apply equally to everyone.

Even if LockedIn's website went offline, the smart contract would still be running on Solana. Your funds would still be safe and accessible — you'd just need to interact with the contract through a different interface.$$)
  ),
  (
    v_bw5_version_id, 4, 'paragraph',
    jsonb_build_object('id','bw-5-block-4','type','paragraph','order',4,'text',$$Smart Contracts Beyond LockedIn

Smart contracts power the entire DeFi ecosystem:

Decentralized exchanges (DEXs) — Platforms like Jupiter let you swap tokens without a broker. The smart contract matches trades and moves funds automatically.

Lending protocols — Platforms like Kamino let you lend your assets and earn interest. The smart contract manages deposits, interest rates, and liquidations.

NFT marketplaces — Platforms like Magic Eden use smart contracts to handle listings, bids, and transfers of digital collectibles.

Yield — This is where your money works while you learn. Your locked USDC can be deposited into lending protocols through the smart contract, generating yield that funds Ichor rewards. The contract manages this automatically.$$)
  ),
  (
    v_bw5_version_id, 5, 'callout',
    jsonb_build_object('id','bw-5-block-5','type','callout','order',5,'text',$$Key Insight: Smart contracts replace trust with verification. Instead of "trust us, we'll handle your money responsibly," it's "here's the code — verify it yourself." This is the fundamental shift that makes decentralized finance possible.$$,'calloutTone','info')
  );

  -- ── bw-6: Tokens — Not All Digital Money Is the Same ───────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw6_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-6-block-1','type','paragraph','order',1,'text',$$What Is a Token?

A token is a digital asset that lives on a blockchain. On Solana, tokens follow a standard called SPL (Solana Program Library). This standard means every wallet, exchange, and application on Solana can handle any SPL token the same way — no special integration needed.

But not all tokens are created equal. Let's break down the ones that matter in LockedIn.$$)
  ),
  (
    v_bw6_version_id, 2, 'paragraph',
    jsonb_build_object('id','bw-6-block-2','type','paragraph','order',2,'text',$$SOL — The Network Fuel

SOL is Solana's native token. It's used to pay transaction fees and secure the network through staking. The price of SOL fluctuates with the market — it might be worth $20 today and $25 tomorrow. You need a tiny bit of SOL to do anything on Solana (pay gas fees), but it's not what you lock in LockedIn.

USDC — The Stable Dollar

USDC is a stablecoin issued by Circle. Each USDC is backed by real US dollars held in reserve. 1 USDC always equals $1. This is what you lock in LockedIn — because stability matters when you're committing funds to a learning goal. You don't want the value of your lock to swing 20% overnight.$$)
  ),
  (
    v_bw6_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-6-block-3','type','paragraph','order',3,'text',$$Fuel — Your Learning Energy (Counter)

Fuel is NOT a token. It's a counter tracked inside the LockedIn smart contract. You earn Fuel fragments (0.1-0.4) by completing activities, up to 1 Fuel per day. Fuel has no cash value, cannot be transferred, and cannot be traded. Think of it like XP in a game — it measures your effort, not your wealth.

Ichor — Your Redeemable Reward (Counter)

Ichor is also a counter, not a token. When you brew Ichor from Fuel at the alchemy table, the smart contract burns your Fuel and credits Ichor. The key difference: Ichor can be redeemed for USDC from the yield your locked funds generated. When you redeem Ichor, the contract sends real USDC to your wallet.$$)
  ),
  (
    v_bw6_version_id, 4, 'callout',
    jsonb_build_object('id','bw-6-block-4','type','callout','order',4,'text',$$Why Counters Instead of Tokens? Making Fuel and Ichor tokens would mean they could be traded on markets, which would break the learning incentive. By keeping them as on-chain counters, they can only be earned through learning and redeemed through the contract. No shortcuts. No buying your way through.$$,'calloutTone','info')
  ),
  (
    v_bw6_version_id, 5, 'paragraph',
    jsonb_build_object('id','bw-6-block-5','type','paragraph','order',5,'text',$$Token Accounts — Your Filing Cabinet

On Solana, you don't just have "a wallet" — you have separate token accounts for each type of token you hold. Think of it like a filing cabinet: your wallet address is the cabinet itself, and each drawer holds a different token.

When you receive USDC for the first time, a USDC token account is created for your wallet. This account costs a tiny amount of SOL to maintain — this is called "rent." Don't worry, Solana makes most accounts rent-exempt with a small one-time deposit, and LockedIn handles this for you.$$)
  );

  -- ── bw-7: Security — The Lesson That Could Save You Thousands ──────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw7_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-7-block-1','type','paragraph','order',1,'text',$$Why Scammers Love Crypto

Remember how blockchain transactions are irreversible? That's great for security — but it also means there's no "undo" button if you get tricked. There's no bank to call, no charge to dispute, no customer service to reverse a mistake. Once crypto leaves your wallet, it's gone.

This makes crypto a magnet for scammers. The good news: nearly every scam follows predictable patterns. Learn them once, and you'll spot them forever.$$)
  ),
  (
    v_bw7_version_id, 2, 'paragraph',
    jsonb_build_object('id','bw-7-block-2','type','paragraph','order',2,'text',$$The Five Scams You'll Encounter

1. Seed Phrase Theft — "Enter your seed phrase to verify your wallet." No legitimate service will ever ask for your seed phrase. Ever. Your seed phrase is the master key to everything you own. Sharing it is like handing someone a blank check.

2. Phishing Sites — Fake websites that look identical to real ones (LockedIn, Phantom, Jupiter). They trick you into connecting your wallet or entering credentials. Always check the URL carefully.

3. "Free Money" Scams — "Send 1 SOL and receive 10 SOL back!" This is never real. Nobody is giving away free money. Not Solana Foundation, not LockedIn, not anyone.

4. Mystery Tokens — Random tokens appearing in your wallet. Some are programmed to drain your wallet when you try to interact with them (swap or send). If you didn't buy it or earn it, don't touch it.

5. Fake Approval Requests — Pop-ups asking you to approve transactions you didn't initiate. Always read what you're signing. A malicious approval can give a contract permission to drain your entire token balance.$$)
  ),
  (
    v_bw7_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-7-block-3','type','paragraph','order',3,'text',$$The Golden Rules

Never share your private key or seed phrase. Not with "support," not with "team members," not with anyone. No legitimate service will ever ask for it.

Verify, don't trust. Bookmark the real URLs for sites you use (LockedIn, Phantom, Jupiter). Don't click links from DMs, emails, or social media posts.

Start small. When trying something new, send a tiny amount first. If something goes wrong, you lose a dollar instead of a thousand.

If it sounds too good to be true, it is. No guaranteed returns. No free money. No "double your crypto" schemes.

Read before you sign. Every time your wallet asks you to approve a transaction, read what it's doing. If you don't understand it, don't sign it.$$)
  ),
  (
    v_bw7_version_id, 4, 'callout',
    jsonb_build_object('id','bw-7-block-4','type','callout','order',4,'text',$$Your Google Login and Security: LockedIn uses Privy, which lets you log in with Google. This means your wallet is protected by your Google account security. Enable two-factor authentication (2FA) on your Google account if you haven't already — it's the single best thing you can do to protect your wallet right now.$$,'calloutTone','info')
  );

  -- ── bw-8: Taking the Keys — Self-Custody and What Comes Next ───────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw8_version_id, 1, 'paragraph',
    jsonb_build_object('id','bw-8-block-1','type','paragraph','order',1,'text',$$Training Wheels Off

Right now, LockedIn (through Privy) manages your wallet for you. Your private key is secured by your Google login. This is convenient — you don't need to worry about seed phrases or wallet apps.

But it means you're still trusting someone else with your key. What if you wanted to hold it yourself?

That's called self-custody: you hold your own private key. No company, no app, no third party. Just you and your key.$$)
  ),
  (
    v_bw8_version_id, 2, 'paragraph',
    jsonb_build_object('id','bw-8-block-2','type','paragraph','order',2,'text',$$Should You Switch?

Self-custody isn't for everyone, and there's no pressure to switch right now. Here's when it makes sense:

You want full control — No company can freeze your account or lose access to your key.

You want to explore DeFi — Self-custody wallets like Phantom connect directly to hundreds of Solana apps.

You're comfortable with responsibility — If you lose your seed phrase and your wallet app breaks, nobody can recover your funds. There is no "forgot password."

If you're just getting started, Privy is perfectly fine. You can always switch later.$$)
  ),
  (
    v_bw8_version_id, 3, 'paragraph',
    jsonb_build_object('id','bw-8-block-3','type','paragraph','order',3,'text',$$Your Seed Phrase — The Master Blueprint

When you create a self-custody wallet, you'll receive a seed phrase — 12 or 24 random words in a specific order. This phrase is a human-readable version of your private key.

Think of it as a blueprint: from these words, your entire wallet can be reconstructed on any device, at any time, with any compatible app. Lose the blueprint and the building can never be rebuilt.

Survival Rules for Your Seed Phrase:

Write it on physical paper. Never store it digitally — no screenshots, no notes apps, no cloud storage, no email.

Store it somewhere safe and private. A fireproof safe, a safety deposit box, or another secure physical location.

Never share it. Not with support, not with friends, not with anyone. Anyone with your seed phrase has complete control of your wallet.

Consider making two copies and storing them in different locations. One flood or fire shouldn't be able to destroy your only copy.$$)
  ),
  (
    v_bw8_version_id, 4, 'paragraph',
    jsonb_build_object('id','bw-8-block-4','type','paragraph','order',4,'text',$$How to Graduate to Self-Custody

When you're ready, here's the path:

1. Export from Privy — LockedIn provides an option to export your wallet's private key from your Privy-managed account.

2. Download Phantom — The most popular Solana wallet app. Available on iOS, Android, and as a browser extension.

3. Import your key — Use Phantom's "Import Wallet" feature to bring in your private key. Your wallet address stays the same.

4. Back up your seed phrase — Phantom will show you a seed phrase. Write it down following the survival rules above.

5. Get a tiny bit of SOL — You'll need SOL to pay transaction fees. You can buy it on an exchange or receive it from a friend.

6. Connect to LockedIn — Use Phantom to connect to LockedIn. Your locked USDC and progress are tied to your wallet address, not to the app — everything will still be there.$$)
  ),
  (
    v_bw8_version_id, 5, 'callout',
    jsonb_build_object('id','bw-8-block-5','type','callout','order',5,'text',$$Beyond LockedIn: With a self-custody wallet, the entire Solana ecosystem opens up. Swap tokens on Jupiter (a decentralized exchange), earn yield on Kamino (a lending protocol), explore NFTs on Magic Eden, or participate in governance. Your wallet is your passport to all of it — and you now have the knowledge to navigate it safely.$$,'calloutTone','info')
  );

  ---------------------------------------------------------------------------
  -- 7. Questions
  ---------------------------------------------------------------------------

  -- bw-1 questions
  insert into lesson.questions (id, lesson_version_id, question_order, question_type, prompt, correct_answer, metadata) values
    ('bw-1-q1', v_bw1_version_id, 1, 'mcq', $$What is a blockchain?$$, $$A shared record book maintained by thousands of computers, owned by nobody$$, '{}'::jsonb),
    ('bw-1-q2', v_bw1_version_id, 2, 'mcq', $$What is the main problem with traditional middlemen in finance?$$, $$They can fail, charge fees, and control your money$$, '{}'::jsonb),
    ('bw-1-q3', v_bw1_version_id, 3, 'mcq', $$In the village notebook analogy, what are the villagers?$$, $$Validators — computers that maintain copies and verify transactions$$, '{}'::jsonb),
    ('bw-1-q4', v_bw1_version_id, 4, 'short_text', $$In your own words, explain why a blockchain doesn't need a middleman.$$, $$blockchain shared copies consensus verification trust math$$, '{}'::jsonb),

  -- bw-2 questions
    ('bw-2-q1', v_bw2_version_id, 1, 'mcq', $$Why is LockedIn built on Solana instead of Ethereum?$$, $$Solana transactions cost fractions of a cent and settle in under a second$$, '{}'::jsonb),
    ('bw-2-q2', v_bw2_version_id, 2, 'mcq', $$How much does a typical Solana transaction cost?$$, $$About $0.00025 — a fraction of a cent$$, '{}'::jsonb),
    ('bw-2-q3', v_bw2_version_id, 3, 'mcq', $$What is SOL used for?$$, $$Paying transaction fees to validators on the Solana network$$, '{}'::jsonb),
    ('bw-2-q4', v_bw2_version_id, 4, 'short_text', $$Explain the difference between SOL and USDC in one or two sentences.$$, $$SOL fuel gas transaction fees fluctuates USDC stable dollar always one$$, '{}'::jsonb),

  -- bw-3 questions
    ('bw-3-q1', v_bw3_version_id, 1, 'mcq', $$What does your wallet actually store?$$, $$Your private key that proves you own your account on the blockchain$$, '{}'::jsonb),
    ('bw-3-q2', v_bw3_version_id, 2, 'mcq', $$What is your public key used for?$$, $$Identifying your account on the blockchain — like an email address$$, '{}'::jsonb),
    ('bw-3-q3', v_bw3_version_id, 3, 'mcq', $$If LockedIn disappeared tomorrow, what happens to your wallet?$$, $$It still exists on the blockchain — you can access it through another app$$, '{}'::jsonb),
    ('bw-3-q4', v_bw3_version_id, 4, 'short_text', $$Why is a crypto wallet more like a key than a vault?$$, $$wallet key blockchain holds money proves ownership access$$, '{}'::jsonb),

  -- bw-4 questions
    ('bw-4-q1', v_bw4_version_id, 1, 'mcq', $$What's the difference between Fuel and Ichor?$$, $$Both are counters, but Ichor can be redeemed for USDC while Fuel cannot$$, '{}'::jsonb),
    ('bw-4-q2', v_bw4_version_id, 2, 'mcq', $$What is a transaction hash?$$, $$A unique ID for a specific transaction — like a receipt number$$, '{}'::jsonb),
    ('bw-4-q3', v_bw4_version_id, 3, 'mcq', $$Why are blockchain transactions irreversible?$$, $$So nobody can freeze your account, take back your money, or alter records$$, '{}'::jsonb),
    ('bw-4-q4', v_bw4_version_id, 4, 'short_text', $$Explain what 'gas fees' are and why they exist on Solana.$$, $$gas fee payment validators process confirm transaction SOL$$, '{}'::jsonb),

  -- bw-5 questions
    ('bw-5-q1', v_bw5_version_id, 1, 'mcq', $$If LockedIn's website went offline tomorrow, what happens to your locked USDC?$$, $$It stays in the smart contract on the blockchain — safe and accessible$$, '{}'::jsonb),
    ('bw-5-q2', v_bw5_version_id, 2, 'mcq', $$What is a smart contract most similar to?$$, $$A vending machine — automated rules that execute without human intervention$$, '{}'::jsonb),
    ('bw-5-q3', v_bw5_version_id, 3, 'mcq', $$Can the LockedIn team change the smart contract rules after deployment?$$, $$No — once deployed, the rules are immutable$$, '{}'::jsonb),
    ('bw-5-q4', v_bw5_version_id, 4, 'short_text', $$Explain in your own words why smart contracts don't need trust.$$, $$code automatic rules execute blockchain nobody change immutable$$, '{}'::jsonb),

  -- bw-6 questions
    ('bw-6-q1', v_bw6_version_id, 1, 'mcq', $$What happens when you redeem Ichor?$$, $$The smart contract burns your Ichor counter and sends USDC to your wallet$$, '{}'::jsonb),
    ('bw-6-q2', v_bw6_version_id, 2, 'mcq', $$Why is USDC used for locking instead of SOL?$$, $$Because USDC is stable ($1 always) — SOL's price fluctuates$$, '{}'::jsonb),
    ('bw-6-q3', v_bw6_version_id, 3, 'mcq', $$What is an SPL token?$$, $$A token on Solana that follows a standard format so all wallets and apps can handle it$$, '{}'::jsonb),
    ('bw-6-q4', v_bw6_version_id, 4, 'short_text', $$Explain the difference between a token (like USDC) and a counter (like Fuel).$$, $$token transfer send wallet SPL counter smart contract internal cannot trade$$, '{}'::jsonb),

  -- bw-7 questions
    ('bw-7-q1', v_bw7_version_id, 1, 'mcq', $$A LockedIn team member DMs you asking for your private key. What do you do?$$, $$Ignore and report — no legitimate team member would ever ask for this$$, '{}'::jsonb),
    ('bw-7-q2', v_bw7_version_id, 2, 'mcq', $$What should you do if random tokens appear in your wallet?$$, $$Don't touch them — some are programmed to drain your wallet when you interact$$, '{}'::jsonb),
    ('bw-7-q3', v_bw7_version_id, 3, 'mcq', $$What is phishing in the crypto context?$$, $$Fake websites that look identical to real ones, designed to steal your credentials$$, '{}'::jsonb),
    ('bw-7-q4', v_bw7_version_id, 4, 'short_text', $$Name three things you should NEVER do with your private key or seed phrase.$$, $$never share screenshot save cloud type website anyone$$, '{}'::jsonb),

  -- bw-8 questions
    ('bw-8-q1', v_bw8_version_id, 1, 'mcq', $$What is a seed phrase?$$, $$12 or 24 words that can regenerate your entire wallet$$, '{}'::jsonb),
    ('bw-8-q2', v_bw8_version_id, 2, 'mcq', $$What is the safest way to store a seed phrase?$$, $$Written on physical paper, stored in a safe private location$$, '{}'::jsonb),
    ('bw-8-q3', v_bw8_version_id, 3, 'mcq', $$What changes when you switch from Privy to self-custody?$$, $$You approve transactions yourself and recovery depends on your seed phrase, not Google$$, '{}'::jsonb),
    ('bw-8-q4', v_bw8_version_id, 4, 'short_text', $$Why might someone choose to stay with Privy instead of switching to self-custody?$$, $$convenience simple Google recovery not ready manage seed phrase$$, '{}'::jsonb);

  ---------------------------------------------------------------------------
  -- 8. Question options (MCQ only)
  ---------------------------------------------------------------------------
  insert into lesson.question_options (question_id, option_order, option_text) values
    -- bw-1-q1
    ('bw-1-q1', 1, 'A company that stores your money online'),
    ('bw-1-q1', 2, 'A shared record book maintained by thousands of computers, owned by nobody'),
    ('bw-1-q1', 3, 'A type of bank account with better interest rates'),
    -- bw-1-q2
    ('bw-1-q2', 1, 'They''re too fast at processing transactions'),
    ('bw-1-q2', 2, 'They can fail, charge fees, and control your money'),
    ('bw-1-q2', 3, 'They don''t exist anymore'),
    -- bw-1-q3
    ('bw-1-q3', 1, 'Banks that process payments'),
    ('bw-1-q3', 2, 'Validators — computers that maintain copies and verify transactions'),
    ('bw-1-q3', 3, 'Government officials who regulate trade'),

    -- bw-2-q1
    ('bw-2-q1', 1, 'Solana is more popular than Ethereum'),
    ('bw-2-q1', 2, 'Solana transactions cost fractions of a cent and settle in under a second'),
    ('bw-2-q1', 3, 'Ethereum doesn''t support USDC'),
    -- bw-2-q2
    ('bw-2-q2', 1, '$5 – $20 depending on network traffic'),
    ('bw-2-q2', 2, 'About $0.00025 — a fraction of a cent'),
    ('bw-2-q2', 3, '$1 – $2 per transaction'),
    -- bw-2-q3
    ('bw-2-q3', 1, 'Storing value like USDC'),
    ('bw-2-q3', 2, 'Paying transaction fees to validators on the Solana network'),
    ('bw-2-q3', 3, 'Buying NFTs only'),

    -- bw-3-q1
    ('bw-3-q1', 1, 'Your USDC and other cryptocurrency'),
    ('bw-3-q1', 2, 'Your private key that proves you own your account on the blockchain'),
    ('bw-3-q1', 3, 'Your course progress and lesson history'),
    -- bw-3-q2
    ('bw-3-q2', 1, 'Signing transactions to move your funds'),
    ('bw-3-q2', 2, 'Identifying your account on the blockchain — like an email address'),
    ('bw-3-q2', 3, 'Encrypting your private data'),
    -- bw-3-q3
    ('bw-3-q3', 1, 'It''s deleted along with your account'),
    ('bw-3-q3', 2, 'It still exists on the blockchain — you can access it through another app'),
    ('bw-3-q3', 3, 'The LockedIn team returns your funds manually'),

    -- bw-4-q1
    ('bw-4-q1', 1, 'Fuel is worth more money than Ichor'),
    ('bw-4-q1', 2, 'They''re the same thing with different names'),
    ('bw-4-q1', 3, 'Both are counters, but Ichor can be redeemed for USDC while Fuel cannot'),
    -- bw-4-q2
    ('bw-4-q2', 1, 'Your wallet address'),
    ('bw-4-q2', 2, 'A unique ID for a specific transaction — like a receipt number'),
    ('bw-4-q2', 3, 'A password for your account'),
    -- bw-4-q3
    ('bw-4-q3', 1, 'It''s a bug that hasn''t been fixed yet'),
    ('bw-4-q3', 2, 'So nobody can freeze your account, take back your money, or alter records'),
    ('bw-4-q3', 3, 'To make things more complicated for users'),

    -- bw-5-q1
    ('bw-5-q1', 1, 'It''s lost forever — you''d need to start over'),
    ('bw-5-q1', 2, 'The LockedIn team would return your funds manually'),
    ('bw-5-q1', 3, 'It stays in the smart contract on the blockchain — safe and accessible'),
    -- bw-5-q2
    ('bw-5-q2', 1, 'A bank teller who follows strict rules'),
    ('bw-5-q2', 2, 'A vending machine — automated rules that execute without human intervention'),
    ('bw-5-q2', 3, 'A legal document that outlines terms'),
    -- bw-5-q3
    ('bw-5-q3', 1, 'Yes, anytime they want'),
    ('bw-5-q3', 2, 'Only with user permission via a vote'),
    ('bw-5-q3', 3, 'No — once deployed, the rules are immutable'),

    -- bw-6-q1
    ('bw-6-q1', 1, 'Ichor tokens are sent directly to your wallet'),
    ('bw-6-q1', 2, 'The smart contract burns your Ichor counter and sends USDC to your wallet'),
    ('bw-6-q1', 3, 'Ichor is converted to SOL and then to USDC'),
    -- bw-6-q2
    ('bw-6-q2', 1, 'SOL is too expensive to buy'),
    ('bw-6-q2', 2, 'Because USDC is stable ($1 always) — SOL''s price fluctuates'),
    ('bw-6-q2', 3, 'SOL can''t be locked in smart contracts'),
    -- bw-6-q3
    ('bw-6-q3', 1, 'A special type of private key'),
    ('bw-6-q3', 2, 'A token on Solana that follows a standard format so all wallets and apps can handle it'),
    ('bw-6-q3', 3, 'A type of smart contract for trading'),

    -- bw-7-q1
    ('bw-7-q1', 1, 'Share it — they''re from the official team'),
    ('bw-7-q1', 2, 'Share only part of it for verification'),
    ('bw-7-q1', 3, 'Ignore and report — no legitimate team member would ever ask for this'),
    -- bw-7-q2
    ('bw-7-q2', 1, 'Sell them quickly before the price drops'),
    ('bw-7-q2', 2, 'Don''t touch them — some are programmed to drain your wallet when you interact'),
    ('bw-7-q2', 3, 'Send them to a friend for safekeeping'),
    -- bw-7-q3
    ('bw-7-q3', 1, 'A type of token used for fishing games'),
    ('bw-7-q3', 2, 'Fake websites that look identical to real ones, designed to steal your credentials'),
    ('bw-7-q3', 3, 'A direct attack on the blockchain network'),

    -- bw-8-q1
    ('bw-8-q1', 1, 'A password for your wallet app'),
    ('bw-8-q1', 2, '12 or 24 words that can regenerate your entire wallet'),
    ('bw-8-q1', 3, 'Your wallet''s public key written in word form'),
    -- bw-8-q2
    ('bw-8-q2', 1, 'Screenshot on your phone'),
    ('bw-8-q2', 2, 'Written on physical paper, stored in a safe private location'),
    ('bw-8-q2', 3, 'Saved in your email drafts'),
    -- bw-8-q3
    ('bw-8-q3', 1, 'Your USDC gets moved to a different blockchain'),
    ('bw-8-q3', 2, 'You approve transactions yourself and recovery depends on your seed phrase, not Google'),
    ('bw-8-q3', 3, 'Nothing changes — it''s just a different app');

  ---------------------------------------------------------------------------
  -- 9. Source attributions
  ---------------------------------------------------------------------------
  insert into lesson.source_attributions (lesson_version_id, source_url, source_repo, source_ref, source_license, citation_note) values
    (v_bw1_version_id, 'https://bitcoin.org/bitcoin.pdf', 'bitcoin/bitcoin', 'whitepaper', 'MIT', 'Blockchain fundamentals adapted for beginner Course 1.'),
    (v_bw2_version_id, 'https://solana.com/docs', 'solana-labs/solana', 'docs', 'Apache-2.0', 'Solana overview adapted for beginner Course 1.'),
    (v_bw3_version_id, 'https://solana.com/docs/core/accounts', 'solana-labs/solana', 'docs/core/accounts', 'Apache-2.0', 'Wallet and keypair concepts adapted for beginner Course 1.'),
    (v_bw4_version_id, 'https://solana.com/docs/core/transactions', 'solana-labs/solana', 'docs/core/transactions', 'Apache-2.0', 'Transaction concepts adapted for beginner Course 1.'),
    (v_bw5_version_id, 'https://solana.com/docs/core/programs', 'solana-labs/solana', 'docs/core/programs', 'Apache-2.0', 'Smart contract concepts adapted for beginner Course 1.'),
    (v_bw6_version_id, 'https://spl.solana.com/token', 'solana-labs/solana-program-library', 'token', 'Apache-2.0', 'Token and SPL concepts adapted for beginner Course 1.'),
    (v_bw7_version_id, 'https://solana.com/docs/security', 'solana-labs/solana', 'docs/security', 'Apache-2.0', 'Crypto security best practices adapted for beginner Course 1.'),
    (v_bw8_version_id, 'https://phantom.app/learn', 'phantom', 'learn', 'unknown', 'Self-custody and Phantom wallet guide adapted for beginner Course 1.');

  ---------------------------------------------------------------------------
  -- 10. Published payloads (sanitized — no correctAnswer)
  ---------------------------------------------------------------------------

  -- bw-1 payload
  v_bw1_payload := jsonb_build_object(
    'id','bw-1','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','The Problem That Started Everything','order',1,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-1-block-1','type','paragraph','order',1,'text',$$Before We Talk Tech, Let's Talk Trust

Every time you swipe your card, send money through an app, or check your bank balance, you're trusting someone. You trust your bank to hold your money honestly. You trust Visa to move it correctly. You trust PayPal not to freeze your account for no reason.

Most of the time, this works fine. But "most of the time" isn't the same as "always." And when it doesn't work, you're at someone else's mercy.$$),
      jsonb_build_object('id','bw-1-block-2','type','paragraph','order',2,'text',$$The Problem with Middlemen

Every financial transaction you've ever made has gone through a middleman — a bank, a payment processor, a clearinghouse. These middlemen have enormous power over your money:

They can say no. Banks can freeze accounts, reject transactions, or close your account entirely — sometimes with no explanation.

They make mistakes. Money gets lost in transfers. Transactions fail. Disputes take weeks.

They can fail. When banks collapse, your savings can vanish. In 2008, millions of people watched their "safe" money disappear.

They charge fees. Every swipe, every transfer, every conversion — someone takes a cut. Those cuts add up to hundreds of billions of dollars a year.

They know everything. Every purchase, every transfer, every balance — your entire financial life is visible to your bank and the companies it shares data with.$$),
      jsonb_build_object('id','bw-1-block-3','type','callout','order',3,'text',$$The Question: In 2008, as the global financial system teetered on the edge of collapse, someone asked a radical question — what if we didn't need middlemen at all? What if there was a system where people could send value directly to each other, verified by math instead of trust?$$,'calloutTone','info'),
      jsonb_build_object('id','bw-1-block-4','type','paragraph','order',4,'text',$$What Is a Blockchain? (The Simple Version)

Imagine a small village where everyone trades goods. Instead of trusting one person to keep the record book, every villager keeps an identical copy.

A shared record book — Instead of one bank's database, thousands of computers each hold a copy of every transaction ever made. No single entity controls it.

Each page is a block — Transactions are grouped together into blocks. Each block gets a timestamp and a unique code (called a hash).

The chain — Each block references the previous block's hash, creating an unbreakable chain. Change one old record, and every block after it becomes invalid. Everyone would notice instantly.

The villagers are validators — Thousands of computers around the world maintain these copies and verify every new transaction. They agree on what's true through a process called consensus.

This is a blockchain: a shared, transparent, tamper-proof record of every transaction — owned by nobody and verified by everyone.$$),
      jsonb_build_object('id','bw-1-block-5','type','callout','order',5,'text',$$Why Should You Care? This isn't abstract. The USDC you lock in LockedIn lives on a blockchain right now. Nobody can freeze it, nobody can take it, and nobody can change the rules after you've locked it. Understanding how that works is the foundation of everything else in this course.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-1-q1','type','mcq','prompt',$$What is a blockchain?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-1-q1-opt-1','text','A company that stores your money online'),
        jsonb_build_object('id','bw-1-q1-opt-2','text','A shared record book maintained by thousands of computers, owned by nobody'),
        jsonb_build_object('id','bw-1-q1-opt-3','text','A type of bank account with better interest rates')
      )),
      jsonb_build_object('id','bw-1-q2','type','mcq','prompt',$$What is the main problem with traditional middlemen in finance?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-1-q2-opt-1','text','They''re too fast at processing transactions'),
        jsonb_build_object('id','bw-1-q2-opt-2','text','They can fail, charge fees, and control your money'),
        jsonb_build_object('id','bw-1-q2-opt-3','text','They don''t exist anymore')
      )),
      jsonb_build_object('id','bw-1-q3','type','mcq','prompt',$$In the village notebook analogy, what are the villagers?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-1-q3-opt-1','text','Banks that process payments'),
        jsonb_build_object('id','bw-1-q3-opt-2','text','Validators — computers that maintain copies and verify transactions'),
        jsonb_build_object('id','bw-1-q3-opt-3','text','Government officials who regulate trade')
      )),
      jsonb_build_object('id','bw-1-q4','type','short_text','prompt',$$In your own words, explain why a blockchain doesn't need a middleman.$$)
    )
  );

  -- bw-2 payload
  v_bw2_payload := jsonb_build_object(
    'id','bw-2','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Solana — The Blockchain Your Money Lives On','order',2,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-2-block-1','type','paragraph','order',1,'text',$$Not All Blockchains Are the Same

Now that you know what a blockchain is, you should know there are many of them — and they're very different. Think of them like different transportation systems:

Bitcoin — The freight train. First, most well-known, extremely secure. But slow (10-minute blocks) and expensive ($1-20 per transaction). Great for storing value, not great for everyday use.

Ethereum — The busy highway. Flexible and powerful (smart contracts were popularized here). But congested and expensive ($5-50 per transaction during peak times). It's where most of DeFi was born, but it struggles under heavy traffic.

Solana — The bullet train. Fast (transactions settle in about 0.4 seconds), incredibly cheap ($0.00025 per transaction), and built for high throughput. This is where LockedIn lives, and where your USDC is locked.$$),
      jsonb_build_object('id','bw-2-block-2','type','code','order',2,'text',$$Blockchain Comparison:
┌──────────────┬─────────────┬──────────────────┬──────────────────┐
│  Blockchain  │    Speed    │   Cost / Tx      │   Analogy        │
├──────────────┼─────────────┼──────────────────┼──────────────────┤
│  Bitcoin     │  ~10 min    │  $1 – $20        │  Freight train   │
│  Ethereum    │  ~12 sec    │  $5 – $50        │  Busy highway    │
│  Solana      │  ~0.4 sec   │  ~$0.00025       │  Bullet train    │
└──────────────┴─────────────┴──────────────────┴──────────────────┘$$),
      jsonb_build_object('id','bw-2-block-3','type','paragraph','order',3,'text',$$Who Runs Solana?

Nobody — and everybody. Solana is maintained by thousands of validators around the world. No company, government, or individual controls it. Think of it like Wikipedia: lots of people contribute, there are rules for how content is verified, but no single person owns it.

Validators are computers that process transactions, maintain copies of the blockchain, and vote on which transactions are valid. They earn SOL tokens for their work — that's their incentive to keep the network running honestly.$$),
      jsonb_build_object('id','bw-2-block-4','type','paragraph','order',4,'text',$$What Lives on Solana?

Everything on Solana is organized into accounts. Think of the blockchain as a giant filing cabinet:

Accounts — Every wallet, every token balance, every program has an account. Accounts store data and are identified by unique addresses.

Tokens — Digital assets like USDC and SOL. Each token follows a standard (SPL) so every wallet and app can handle them.

Programs — The equivalent of apps. Programs are code deployed to the blockchain that can process transactions and manage accounts. LockedIn's smart contract is a Solana program.

Transactions — Instructions sent to programs. Every action you take — locking USDC, completing a lesson, earning Fuel — is a transaction recorded permanently.$$),
      jsonb_build_object('id','bw-2-block-5','type','callout','order',5,'text',$$SOL Is the Fuel: Just like a car needs petrol, Solana needs SOL. Every transaction costs a tiny amount of SOL (fractions of a cent). This fee goes to validators who process your transaction. You'll need a tiny bit of SOL in your wallet to interact with the network — LockedIn handles this for you initially.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-2-q1','type','mcq','prompt',$$Why is LockedIn built on Solana instead of Ethereum?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-2-q1-opt-1','text','Solana is more popular than Ethereum'),
        jsonb_build_object('id','bw-2-q1-opt-2','text','Solana transactions cost fractions of a cent and settle in under a second'),
        jsonb_build_object('id','bw-2-q1-opt-3','text','Ethereum doesn''t support USDC')
      )),
      jsonb_build_object('id','bw-2-q2','type','mcq','prompt',$$How much does a typical Solana transaction cost?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-2-q2-opt-1','text','$5 – $20 depending on network traffic'),
        jsonb_build_object('id','bw-2-q2-opt-2','text','About $0.00025 — a fraction of a cent'),
        jsonb_build_object('id','bw-2-q2-opt-3','text','$1 – $2 per transaction')
      )),
      jsonb_build_object('id','bw-2-q3','type','mcq','prompt',$$What is SOL used for?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-2-q3-opt-1','text','Storing value like USDC'),
        jsonb_build_object('id','bw-2-q3-opt-2','text','Paying transaction fees to validators on the Solana network'),
        jsonb_build_object('id','bw-2-q3-opt-3','text','Buying NFTs only')
      )),
      jsonb_build_object('id','bw-2-q4','type','short_text','prompt',$$Explain the difference between SOL and USDC in one or two sentences.$$)
    )
  );

  -- bw-3 payload
  v_bw3_payload := jsonb_build_object(
    'id','bw-3','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Wallets — The Key You Didn''t Know You Had','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-3-block-1','type','paragraph','order',1,'text',$$You Already Have a Crypto Wallet

When you signed up for LockedIn, a crypto wallet was created for you behind the scenes (powered by Privy). You might not have noticed — that's by design. But understanding what this wallet actually is will change how you think about your money.$$),
      jsonb_build_object('id','bw-3-block-2','type','paragraph','order',2,'text',$$Forget the Wrong Picture

When most people hear "wallet," they picture something that holds money — like a vault or a bank account. That's the wrong mental model for crypto.

A crypto wallet is more like a key to a locker. Imagine a wall of transparent lockers at a train station. Everyone can see what's inside every locker (the blockchain is public), but only the person with the right key can open theirs.

Your money doesn't live inside the wallet. It lives on the blockchain. The wallet just proves it's yours.$$),
      jsonb_build_object('id','bw-3-block-3','type','paragraph','order',3,'text',$$Two Keys: Public and Private

Every wallet has two keys, and understanding the difference is critical:

Public key (your address) — This is like your email address. It's safe to share. People use it to send you money. On Solana, it looks like a string of letters and numbers: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU.

Private key (your secret) — This is like the password that controls your account. Anyone who has your private key can access your funds. Never, ever share it.

These two keys work together through cryptography. When you send a transaction, your private key creates a digital signature — mathematical proof that you authorized the action — without ever revealing the private key itself.$$),
      jsonb_build_object('id','bw-3-block-4','type','callout','order',4,'text',$$Important: Your wallet is NOT the app. Phantom, Solflare, LockedIn — these are just interfaces to interact with the blockchain. If LockedIn disappeared tomorrow, your wallet still exists on the blockchain. You could access it through any compatible app using your private key. Your money is never trapped in an app.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-3-q1','type','mcq','prompt',$$What does your wallet actually store?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-3-q1-opt-1','text','Your USDC and other cryptocurrency'),
        jsonb_build_object('id','bw-3-q1-opt-2','text','Your private key that proves you own your account on the blockchain'),
        jsonb_build_object('id','bw-3-q1-opt-3','text','Your course progress and lesson history')
      )),
      jsonb_build_object('id','bw-3-q2','type','mcq','prompt',$$What is your public key used for?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-3-q2-opt-1','text','Signing transactions to move your funds'),
        jsonb_build_object('id','bw-3-q2-opt-2','text','Identifying your account on the blockchain — like an email address'),
        jsonb_build_object('id','bw-3-q2-opt-3','text','Encrypting your private data')
      )),
      jsonb_build_object('id','bw-3-q3','type','mcq','prompt',$$If LockedIn disappeared tomorrow, what happens to your wallet?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-3-q3-opt-1','text','It''s deleted along with your account'),
        jsonb_build_object('id','bw-3-q3-opt-2','text','It still exists on the blockchain — you can access it through another app'),
        jsonb_build_object('id','bw-3-q3-opt-3','text','The LockedIn team returns your funds manually')
      )),
      jsonb_build_object('id','bw-3-q4','type','short_text','prompt',$$Why is a crypto wallet more like a key than a vault?$$)
    )
  );

  -- bw-4 payload
  v_bw4_payload := jsonb_build_object(
    'id','bw-4','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Transactions — What Happens When You Tap a Button','order',4,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-4-block-1','type','paragraph','order',1,'text',$$Every Tap Writes History

Every time you do something on LockedIn — lock your USDC, complete a lesson, earn Fuel — a transaction is recorded on the Solana blockchain. Permanently. That's not a figure of speech. In 100 years, someone could look up the exact moment you locked your first dollar.

Let's break down what's inside a transaction.$$),
      jsonb_build_object('id','bw-4-block-2','type','code','order',2,'text',$$Anatomy of a Transaction:
┌──────────────────────────────────────────────────┐
│  From        Your wallet address                 │
│  To          The smart contract (program)        │
│  Instruction "Lock 50 USDC for 30 days"          │
│  Signature   Proof you authorized this           │
│  Fee         ~0.000005 SOL                       │
│  Timestamp   Exact time of confirmation          │
│  Hash        Unique ID for this transaction      │
└──────────────────────────────────────────────────┘$$),
      jsonb_build_object('id','bw-4-block-3','type','paragraph','order',3,'text',$$Tracing Your Actions on LockedIn

Let's trace what happens when you use LockedIn:

Locking USDC — You tell the smart contract: "Take 50 USDC from my wallet and lock it for 30 days." A transaction moves your USDC from your token account to the contract's vault. The contract records the lock terms.

Earning Fuel — When you complete a lesson and your answers are verified, the smart contract increments your Fuel counter. Fuel is not a token you can send — it's a number tracked inside the contract.

Brewing Ichor — When you use Fuel at the alchemy table, the contract burns your Fuel counter and increments your Ichor counter. Ichor can later be redeemed for USDC from the yield your locked funds generated.

Each of these actions is a separate transaction with its own hash, permanently recorded on Solana.$$),
      jsonb_build_object('id','bw-4-block-4','type','paragraph','order',4,'text',$$Gas Fees — Digital Postage Stamps

Every transaction costs a tiny fee paid in SOL. Think of it like a postage stamp — you pay a small amount to have your transaction delivered and processed by validators.

On Solana, this fee is roughly $0.00025 per transaction. For comparison, a Visa transaction costs merchants 1.5-3.5% of the transaction amount. A $50 Visa purchase costs the merchant about $1.25 in fees. The same transaction on Solana would cost a fraction of a cent.$$),
      jsonb_build_object('id','bw-4-block-5','type','callout','order',5,'text',$$Why Irreversibility Matters: Unlike a credit card charge, blockchain transactions can't be reversed. This might sound scary, but it's actually a feature. It means nobody can freeze your account, claw back your money, or alter your transaction history. Once it's confirmed, it's done. This is what makes your locked USDC truly secure.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-4-q1','type','mcq','prompt',$$What's the difference between Fuel and Ichor?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-4-q1-opt-1','text','Fuel is worth more money than Ichor'),
        jsonb_build_object('id','bw-4-q1-opt-2','text','They''re the same thing with different names'),
        jsonb_build_object('id','bw-4-q1-opt-3','text','Both are counters, but Ichor can be redeemed for USDC while Fuel cannot')
      )),
      jsonb_build_object('id','bw-4-q2','type','mcq','prompt',$$What is a transaction hash?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-4-q2-opt-1','text','Your wallet address'),
        jsonb_build_object('id','bw-4-q2-opt-2','text','A unique ID for a specific transaction — like a receipt number'),
        jsonb_build_object('id','bw-4-q2-opt-3','text','A password for your account')
      )),
      jsonb_build_object('id','bw-4-q3','type','mcq','prompt',$$Why are blockchain transactions irreversible?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-4-q3-opt-1','text','It''s a bug that hasn''t been fixed yet'),
        jsonb_build_object('id','bw-4-q3-opt-2','text','So nobody can freeze your account, take back your money, or alter records'),
        jsonb_build_object('id','bw-4-q3-opt-3','text','To make things more complicated for users')
      )),
      jsonb_build_object('id','bw-4-q4','type','short_text','prompt',$$Explain what 'gas fees' are and why they exist on Solana.$$)
    )
  );

  -- bw-5 payload
  v_bw5_payload := jsonb_build_object(
    'id','bw-5','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Smart Contracts — The Code That Guards Your Money','order',5,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-5-block-1','type','paragraph','order',1,'text',$$The Vending Machine Analogy

Imagine a vending machine that's completely transparent — you can see all the gears and mechanisms inside. You put in money, press a button, and the machine delivers your item. No cashier needed. No trust required. The rules are visible, automatic, and the same for everyone.

That's a smart contract: code that lives on the blockchain and automatically executes rules when conditions are met. No human intervention. No exceptions. No "we'll get back to you."$$),
      jsonb_build_object('id','bw-5-block-2','type','paragraph','order',2,'text',$$LockedIn's Smart Contract Rules

The LockedIn smart contract enforces every rule you've encountered:

The Lock — When you deposit USDC, the contract holds it in a vault. It records how much you locked, for how long, and when you started. Nobody can change these terms after the fact.

The Fuel Counter — When you complete lessons and your answers are verified on-chain, the contract increments your Fuel counter. It enforces the daily cap (1 Fuel/day) and the wallet cap (7-14 Fuel maximum).

The Brewer — When you brew Ichor from Fuel, the contract checks your Fuel balance, burns it, and credits Ichor. The exchange rate is fixed in code.

The Streak — The contract tracks your daily completions. If you miss a day, it knows. Saver penalties are calculated automatically.

The Unlock — When your lock period ends, the contract releases your USDC plus any accrued yield. No approval needed. No waiting period beyond what you agreed to.$$),
      jsonb_build_object('id','bw-5-block-3','type','paragraph','order',3,'text',$$Why This Matters

You don't need to trust the LockedIn team. The rules are in the code, visible on the blockchain for anyone to verify. There's no back office that can make exceptions for some users and not others. The rules apply equally to everyone.

Even if LockedIn's website went offline, the smart contract would still be running on Solana. Your funds would still be safe and accessible — you'd just need to interact with the contract through a different interface.$$),
      jsonb_build_object('id','bw-5-block-4','type','paragraph','order',4,'text',$$Smart Contracts Beyond LockedIn

Smart contracts power the entire DeFi ecosystem:

Decentralized exchanges (DEXs) — Platforms like Jupiter let you swap tokens without a broker. The smart contract matches trades and moves funds automatically.

Lending protocols — Platforms like Kamino let you lend your assets and earn interest. The smart contract manages deposits, interest rates, and liquidations.

NFT marketplaces — Platforms like Magic Eden use smart contracts to handle listings, bids, and transfers of digital collectibles.

Yield — This is where your money works while you learn. Your locked USDC can be deposited into lending protocols through the smart contract, generating yield that funds Ichor rewards. The contract manages this automatically.$$),
      jsonb_build_object('id','bw-5-block-5','type','callout','order',5,'text',$$Key Insight: Smart contracts replace trust with verification. Instead of "trust us, we'll handle your money responsibly," it's "here's the code — verify it yourself." This is the fundamental shift that makes decentralized finance possible.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-5-q1','type','mcq','prompt',$$If LockedIn's website went offline tomorrow, what happens to your locked USDC?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-5-q1-opt-1','text','It''s lost forever — you''d need to start over'),
        jsonb_build_object('id','bw-5-q1-opt-2','text','The LockedIn team would return your funds manually'),
        jsonb_build_object('id','bw-5-q1-opt-3','text','It stays in the smart contract on the blockchain — safe and accessible')
      )),
      jsonb_build_object('id','bw-5-q2','type','mcq','prompt',$$What is a smart contract most similar to?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-5-q2-opt-1','text','A bank teller who follows strict rules'),
        jsonb_build_object('id','bw-5-q2-opt-2','text','A vending machine — automated rules that execute without human intervention'),
        jsonb_build_object('id','bw-5-q2-opt-3','text','A legal document that outlines terms')
      )),
      jsonb_build_object('id','bw-5-q3','type','mcq','prompt',$$Can the LockedIn team change the smart contract rules after deployment?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-5-q3-opt-1','text','Yes, anytime they want'),
        jsonb_build_object('id','bw-5-q3-opt-2','text','Only with user permission via a vote'),
        jsonb_build_object('id','bw-5-q3-opt-3','text','No — once deployed, the rules are immutable')
      )),
      jsonb_build_object('id','bw-5-q4','type','short_text','prompt',$$Explain in your own words why smart contracts don't need trust.$$)
    )
  );

  -- bw-6 payload
  v_bw6_payload := jsonb_build_object(
    'id','bw-6','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Tokens — Not All Digital Money Is the Same','order',6,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-6-block-1','type','paragraph','order',1,'text',$$What Is a Token?

A token is a digital asset that lives on a blockchain. On Solana, tokens follow a standard called SPL (Solana Program Library). This standard means every wallet, exchange, and application on Solana can handle any SPL token the same way — no special integration needed.

But not all tokens are created equal. Let's break down the ones that matter in LockedIn.$$),
      jsonb_build_object('id','bw-6-block-2','type','paragraph','order',2,'text',$$SOL — The Network Fuel

SOL is Solana's native token. It's used to pay transaction fees and secure the network through staking. The price of SOL fluctuates with the market — it might be worth $20 today and $25 tomorrow. You need a tiny bit of SOL to do anything on Solana (pay gas fees), but it's not what you lock in LockedIn.

USDC — The Stable Dollar

USDC is a stablecoin issued by Circle. Each USDC is backed by real US dollars held in reserve. 1 USDC always equals $1. This is what you lock in LockedIn — because stability matters when you're committing funds to a learning goal. You don't want the value of your lock to swing 20% overnight.$$),
      jsonb_build_object('id','bw-6-block-3','type','paragraph','order',3,'text',$$Fuel — Your Learning Energy (Counter)

Fuel is NOT a token. It's a counter tracked inside the LockedIn smart contract. You earn Fuel fragments (0.1-0.4) by completing activities, up to 1 Fuel per day. Fuel has no cash value, cannot be transferred, and cannot be traded. Think of it like XP in a game — it measures your effort, not your wealth.

Ichor — Your Redeemable Reward (Counter)

Ichor is also a counter, not a token. When you brew Ichor from Fuel at the alchemy table, the smart contract burns your Fuel and credits Ichor. The key difference: Ichor can be redeemed for USDC from the yield your locked funds generated. When you redeem Ichor, the contract sends real USDC to your wallet.$$),
      jsonb_build_object('id','bw-6-block-4','type','callout','order',4,'text',$$Why Counters Instead of Tokens? Making Fuel and Ichor tokens would mean they could be traded on markets, which would break the learning incentive. By keeping them as on-chain counters, they can only be earned through learning and redeemed through the contract. No shortcuts. No buying your way through.$$,'calloutTone','info'),
      jsonb_build_object('id','bw-6-block-5','type','paragraph','order',5,'text',$$Token Accounts — Your Filing Cabinet

On Solana, you don't just have "a wallet" — you have separate token accounts for each type of token you hold. Think of it like a filing cabinet: your wallet address is the cabinet itself, and each drawer holds a different token.

When you receive USDC for the first time, a USDC token account is created for your wallet. This account costs a tiny amount of SOL to maintain — this is called "rent." Don't worry, Solana makes most accounts rent-exempt with a small one-time deposit, and LockedIn handles this for you.$$)
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-6-q1','type','mcq','prompt',$$What happens when you redeem Ichor?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-6-q1-opt-1','text','Ichor tokens are sent directly to your wallet'),
        jsonb_build_object('id','bw-6-q1-opt-2','text','The smart contract burns your Ichor counter and sends USDC to your wallet'),
        jsonb_build_object('id','bw-6-q1-opt-3','text','Ichor is converted to SOL and then to USDC')
      )),
      jsonb_build_object('id','bw-6-q2','type','mcq','prompt',$$Why is USDC used for locking instead of SOL?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-6-q2-opt-1','text','SOL is too expensive to buy'),
        jsonb_build_object('id','bw-6-q2-opt-2','text','Because USDC is stable ($1 always) — SOL''s price fluctuates'),
        jsonb_build_object('id','bw-6-q2-opt-3','text','SOL can''t be locked in smart contracts')
      )),
      jsonb_build_object('id','bw-6-q3','type','mcq','prompt',$$What is an SPL token?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-6-q3-opt-1','text','A special type of private key'),
        jsonb_build_object('id','bw-6-q3-opt-2','text','A token on Solana that follows a standard format so all wallets and apps can handle it'),
        jsonb_build_object('id','bw-6-q3-opt-3','text','A type of smart contract for trading')
      )),
      jsonb_build_object('id','bw-6-q4','type','short_text','prompt',$$Explain the difference between a token (like USDC) and a counter (like Fuel).$$)
    )
  );

  -- bw-7 payload
  v_bw7_payload := jsonb_build_object(
    'id','bw-7','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Security — The Lesson That Could Save You Thousands','order',7,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-7-block-1','type','paragraph','order',1,'text',$$Why Scammers Love Crypto

Remember how blockchain transactions are irreversible? That's great for security — but it also means there's no "undo" button if you get tricked. There's no bank to call, no charge to dispute, no customer service to reverse a mistake. Once crypto leaves your wallet, it's gone.

This makes crypto a magnet for scammers. The good news: nearly every scam follows predictable patterns. Learn them once, and you'll spot them forever.$$),
      jsonb_build_object('id','bw-7-block-2','type','paragraph','order',2,'text',$$The Five Scams You'll Encounter

1. Seed Phrase Theft — "Enter your seed phrase to verify your wallet." No legitimate service will ever ask for your seed phrase. Ever. Your seed phrase is the master key to everything you own. Sharing it is like handing someone a blank check.

2. Phishing Sites — Fake websites that look identical to real ones (LockedIn, Phantom, Jupiter). They trick you into connecting your wallet or entering credentials. Always check the URL carefully.

3. "Free Money" Scams — "Send 1 SOL and receive 10 SOL back!" This is never real. Nobody is giving away free money. Not Solana Foundation, not LockedIn, not anyone.

4. Mystery Tokens — Random tokens appearing in your wallet. Some are programmed to drain your wallet when you try to interact with them (swap or send). If you didn't buy it or earn it, don't touch it.

5. Fake Approval Requests — Pop-ups asking you to approve transactions you didn't initiate. Always read what you're signing. A malicious approval can give a contract permission to drain your entire token balance.$$),
      jsonb_build_object('id','bw-7-block-3','type','paragraph','order',3,'text',$$The Golden Rules

Never share your private key or seed phrase. Not with "support," not with "team members," not with anyone. No legitimate service will ever ask for it.

Verify, don't trust. Bookmark the real URLs for sites you use (LockedIn, Phantom, Jupiter). Don't click links from DMs, emails, or social media posts.

Start small. When trying something new, send a tiny amount first. If something goes wrong, you lose a dollar instead of a thousand.

If it sounds too good to be true, it is. No guaranteed returns. No free money. No "double your crypto" schemes.

Read before you sign. Every time your wallet asks you to approve a transaction, read what it's doing. If you don't understand it, don't sign it.$$),
      jsonb_build_object('id','bw-7-block-4','type','callout','order',4,'text',$$Your Google Login and Security: LockedIn uses Privy, which lets you log in with Google. This means your wallet is protected by your Google account security. Enable two-factor authentication (2FA) on your Google account if you haven't already — it's the single best thing you can do to protect your wallet right now.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-7-q1','type','mcq','prompt',$$A LockedIn team member DMs you asking for your private key. What do you do?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-7-q1-opt-1','text','Share it — they''re from the official team'),
        jsonb_build_object('id','bw-7-q1-opt-2','text','Share only part of it for verification'),
        jsonb_build_object('id','bw-7-q1-opt-3','text','Ignore and report — no legitimate team member would ever ask for this')
      )),
      jsonb_build_object('id','bw-7-q2','type','mcq','prompt',$$What should you do if random tokens appear in your wallet?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-7-q2-opt-1','text','Sell them quickly before the price drops'),
        jsonb_build_object('id','bw-7-q2-opt-2','text','Don''t touch them — some are programmed to drain your wallet when you interact'),
        jsonb_build_object('id','bw-7-q2-opt-3','text','Send them to a friend for safekeeping')
      )),
      jsonb_build_object('id','bw-7-q3','type','mcq','prompt',$$What is phishing in the crypto context?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-7-q3-opt-1','text','A type of token used for fishing games'),
        jsonb_build_object('id','bw-7-q3-opt-2','text','Fake websites that look identical to real ones, designed to steal your credentials'),
        jsonb_build_object('id','bw-7-q3-opt-3','text','A direct attack on the blockchain network')
      )),
      jsonb_build_object('id','bw-7-q4','type','short_text','prompt',$$Name three things you should NEVER do with your private key or seed phrase.$$)
    )
  );

  -- bw-8 payload
  v_bw8_payload := jsonb_build_object(
    'id','bw-8','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core','title','Taking the Keys — Self-Custody and What Comes Next','order',8,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','bw-8-block-1','type','paragraph','order',1,'text',$$Training Wheels Off

Right now, LockedIn (through Privy) manages your wallet for you. Your private key is secured by your Google login. This is convenient — you don't need to worry about seed phrases or wallet apps.

But it means you're still trusting someone else with your key. What if you wanted to hold it yourself?

That's called self-custody: you hold your own private key. No company, no app, no third party. Just you and your key.$$),
      jsonb_build_object('id','bw-8-block-2','type','paragraph','order',2,'text',$$Should You Switch?

Self-custody isn't for everyone, and there's no pressure to switch right now. Here's when it makes sense:

You want full control — No company can freeze your account or lose access to your key.

You want to explore DeFi — Self-custody wallets like Phantom connect directly to hundreds of Solana apps.

You're comfortable with responsibility — If you lose your seed phrase and your wallet app breaks, nobody can recover your funds. There is no "forgot password."

If you're just getting started, Privy is perfectly fine. You can always switch later.$$),
      jsonb_build_object('id','bw-8-block-3','type','paragraph','order',3,'text',$$Your Seed Phrase — The Master Blueprint

When you create a self-custody wallet, you'll receive a seed phrase — 12 or 24 random words in a specific order. This phrase is a human-readable version of your private key.

Think of it as a blueprint: from these words, your entire wallet can be reconstructed on any device, at any time, with any compatible app. Lose the blueprint and the building can never be rebuilt.

Survival Rules for Your Seed Phrase:

Write it on physical paper. Never store it digitally — no screenshots, no notes apps, no cloud storage, no email.

Store it somewhere safe and private. A fireproof safe, a safety deposit box, or another secure physical location.

Never share it. Not with support, not with friends, not with anyone. Anyone with your seed phrase has complete control of your wallet.

Consider making two copies and storing them in different locations. One flood or fire shouldn't be able to destroy your only copy.$$),
      jsonb_build_object('id','bw-8-block-4','type','paragraph','order',4,'text',$$How to Graduate to Self-Custody

When you're ready, here's the path:

1. Export from Privy — LockedIn provides an option to export your wallet's private key from your Privy-managed account.

2. Download Phantom — The most popular Solana wallet app. Available on iOS, Android, and as a browser extension.

3. Import your key — Use Phantom's "Import Wallet" feature to bring in your private key. Your wallet address stays the same.

4. Back up your seed phrase — Phantom will show you a seed phrase. Write it down following the survival rules above.

5. Get a tiny bit of SOL — You'll need SOL to pay transaction fees. You can buy it on an exchange or receive it from a friend.

6. Connect to LockedIn — Use Phantom to connect to LockedIn. Your locked USDC and progress are tied to your wallet address, not to the app — everything will still be there.$$),
      jsonb_build_object('id','bw-8-block-5','type','callout','order',5,'text',$$Beyond LockedIn: With a self-custody wallet, the entire Solana ecosystem opens up. Swap tokens on Jupiter (a decentralized exchange), earn yield on Kamino (a lending protocol), explore NFTs on Magic Eden, or participate in governance. Your wallet is your passport to all of it — and you now have the knowledge to navigate it safely.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','bw-8-q1','type','mcq','prompt',$$What is a seed phrase?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-8-q1-opt-1','text','A password for your wallet app'),
        jsonb_build_object('id','bw-8-q1-opt-2','text','12 or 24 words that can regenerate your entire wallet'),
        jsonb_build_object('id','bw-8-q1-opt-3','text','Your wallet''s public key written in word form')
      )),
      jsonb_build_object('id','bw-8-q2','type','mcq','prompt',$$What is the safest way to store a seed phrase?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-8-q2-opt-1','text','Screenshot on your phone'),
        jsonb_build_object('id','bw-8-q2-opt-2','text','Written on physical paper, stored in a safe private location'),
        jsonb_build_object('id','bw-8-q2-opt-3','text','Saved in your email drafts')
      )),
      jsonb_build_object('id','bw-8-q3','type','mcq','prompt',$$What changes when you switch from Privy to self-custody?$$,'options',jsonb_build_array(
        jsonb_build_object('id','bw-8-q3-opt-1','text','Your USDC gets moved to a different blockchain'),
        jsonb_build_object('id','bw-8-q3-opt-2','text','You approve transactions yourself and recovery depends on your seed phrase, not Google'),
        jsonb_build_object('id','bw-8-q3-opt-3','text','Nothing changes — it''s just a different app')
      )),
      jsonb_build_object('id','bw-8-q4','type','short_text','prompt',$$Why might someone choose to stay with Privy instead of switching to self-custody?$$)
    )
  );

  ---------------------------------------------------------------------------
  -- 11. Published module
  ---------------------------------------------------------------------------
  insert into lesson.published_modules (release_id, course_id, module_id, module_order, payload) values
  (
    v_release_id,
    'blockchain-wallets',
    'blockchain-wallets-module-core',
    1,
    jsonb_build_object(
      'id', 'blockchain-wallets-module-core',
      'courseId', 'blockchain-wallets',
      'slug', 'blockchain-wallets-core',
      'title', 'Blockchain & Wallets Core',
      'description', 'Core module for Course 1: Blockchain & Wallets — How Your Money Actually Works.',
      'order', 1,
      'difficulty', 'beginner',
      'totalLessons', 8,
      'estimatedMinutes', 60
    )
  );

  ---------------------------------------------------------------------------
  -- 12. Published lessons
  ---------------------------------------------------------------------------
  insert into lesson.published_lessons (release_id, lesson_id, module_id, lesson_version_id, lesson_order, payload) values
    (v_release_id, 'bw-1', 'blockchain-wallets-module-core', v_bw1_version_id, 1, v_bw1_payload),
    (v_release_id, 'bw-2', 'blockchain-wallets-module-core', v_bw2_version_id, 2, v_bw2_payload),
    (v_release_id, 'bw-3', 'blockchain-wallets-module-core', v_bw3_version_id, 3, v_bw3_payload),
    (v_release_id, 'bw-4', 'blockchain-wallets-module-core', v_bw4_version_id, 4, v_bw4_payload),
    (v_release_id, 'bw-5', 'blockchain-wallets-module-core', v_bw5_version_id, 5, v_bw5_payload),
    (v_release_id, 'bw-6', 'blockchain-wallets-module-core', v_bw6_version_id, 6, v_bw6_payload),
    (v_release_id, 'bw-7', 'blockchain-wallets-module-core', v_bw7_version_id, 7, v_bw7_payload),
    (v_release_id, 'bw-8', 'blockchain-wallets-module-core', v_bw8_version_id, 8, v_bw8_payload);

  ---------------------------------------------------------------------------
  -- 13. Published lesson payloads (with content_hash)
  ---------------------------------------------------------------------------
  insert into lesson.published_lesson_payloads (release_id, lesson_id, payload, content_hash) values
    (v_release_id, 'bw-1', v_bw1_payload, md5(v_bw1_payload::text)),
    (v_release_id, 'bw-2', v_bw2_payload, md5(v_bw2_payload::text)),
    (v_release_id, 'bw-3', v_bw3_payload, md5(v_bw3_payload::text)),
    (v_release_id, 'bw-4', v_bw4_payload, md5(v_bw4_payload::text)),
    (v_release_id, 'bw-5', v_bw5_payload, md5(v_bw5_payload::text)),
    (v_release_id, 'bw-6', v_bw6_payload, md5(v_bw6_payload::text)),
    (v_release_id, 'bw-7', v_bw7_payload, md5(v_bw7_payload::text)),
    (v_release_id, 'bw-8', v_bw8_payload, md5(v_bw8_payload::text));

  raise notice 'Course 1 Blockchain & Wallets release complete. Release ID: %', v_release_id;
end;
$seed$;
