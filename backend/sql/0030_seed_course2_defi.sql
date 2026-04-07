create extension if not exists pgcrypto;

do $seed$
declare
  v_release_id uuid;

  v_df1_version_id uuid;
  v_df2_version_id uuid;
  v_df3_version_id uuid;
  v_df4_version_id uuid;
  v_df5_version_id uuid;
  v_df6_version_id uuid;
  v_df7_version_id uuid;
  v_df8_version_id uuid;

  v_df1_payload jsonb;
  v_df2_payload jsonb;
  v_df3_payload jsonb;
  v_df4_payload jsonb;
  v_df5_payload jsonb;
  v_df6_payload jsonb;
  v_df7_payload jsonb;
  v_df8_payload jsonb;
begin
  if exists (
    select 1
    from lesson.publish_releases
    where release_name = 'course2-defi-v1'
  ) then
    raise notice 'Seed skipped: course2-defi-v1 already exists.';
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
    'defi-how-money-earns',
    'defi-how-your-money-earns-money',
    'DeFi — How Your Money Earns Money',
    'Pull back the curtain on DeFi — understand how your locked USDC earns yield through lending protocols, what the risks are, and how the entire ecosystem works.',
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
    'defi-module-core',
    'defi-core',
    'DeFi Core',
    'Core module for Course 2: DeFi — How Your Money Earns Money.',
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
    ('defi-how-money-earns', 'defi-module-core', 1, true)
  on conflict (course_id, module_id) do update set
    module_order = excluded.module_order,
    is_required = excluded.is_required;

  ---------------------------------------------------------------------------
  -- 3. Lessons
  ---------------------------------------------------------------------------
  insert into lesson.lessons (id, slug, title) values
    ('df-1', 'your-money-hasnt-been-sitting-still',           'Your Money Hasn''t Been Sitting Still'),
    ('df-2', 'lending-and-borrowing-the-engine-of-defi',      'Lending & Borrowing — The Engine of DeFi'),
    ('df-3', 'yield-where-the-money-actually-comes-from',     'Yield — Where the Money Actually Comes From'),
    ('df-4', 'the-defi-protocols-your-money-uses',            'The DeFi Protocols Your Money Uses'),
    ('df-5', 'risk-the-honest-conversation',                  'Risk — The Honest Conversation'),
    ('df-6', 'the-defi-ecosystem-what-else-is-out-there',     'The DeFi Ecosystem — What Else Is Out There'),
    ('df-7', 'defi-vs-tradfi-the-bigger-picture',             'DeFi vs. TradFi — The Bigger Picture'),
    ('df-8', 'your-defi-roadmap-what-you-can-do-next',        'Your DeFi Roadmap — What You Can Do Next')
  on conflict (id) do update set
    title = excluded.title,
    updated_at = now();

  insert into lesson.module_lessons (module_id, lesson_id, lesson_order, is_required) values
    ('defi-module-core', 'df-1', 1, true),
    ('defi-module-core', 'df-2', 2, true),
    ('defi-module-core', 'df-3', 3, true),
    ('defi-module-core', 'df-4', 4, true),
    ('defi-module-core', 'df-5', 5, true),
    ('defi-module-core', 'df-6', 6, true),
    ('defi-module-core', 'df-7', 7, true),
    ('defi-module-core', 'df-8', 8, true)
  on conflict (module_id, lesson_id) do update set
    lesson_order = excluded.lesson_order,
    is_required = excluded.is_required;

  ---------------------------------------------------------------------------
  -- 4. Publish release
  ---------------------------------------------------------------------------
  insert into lesson.publish_releases (release_name, notes, created_by)
  values (
    'course2-defi-v1',
    'Course 2: DeFi — How Your Money Earns Money — 8 beginner lessons covering DeFi fundamentals, lending, yield, protocols, risks, ecosystem, TradFi comparison, and roadmap.',
    'seed-script'
  )
  returning id into v_release_id;

  ---------------------------------------------------------------------------
  -- 5. Lesson versions
  ---------------------------------------------------------------------------
  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-1', 1, 'published', v_release_id, 'Initial lesson: Your Money Hasn''t Been Sitting Still.', md5('df-1-v1'), 'seed-script', now())
  returning id into v_df1_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-2', 1, 'published', v_release_id, 'Initial lesson: Lending & Borrowing — The Engine of DeFi.', md5('df-2-v1'), 'seed-script', now())
  returning id into v_df2_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-3', 1, 'published', v_release_id, 'Initial lesson: Yield — Where the Money Actually Comes From.', md5('df-3-v1'), 'seed-script', now())
  returning id into v_df3_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-4', 1, 'published', v_release_id, 'Initial lesson: The DeFi Protocols Your Money Uses.', md5('df-4-v1'), 'seed-script', now())
  returning id into v_df4_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-5', 1, 'published', v_release_id, 'Initial lesson: Risk — The Honest Conversation.', md5('df-5-v1'), 'seed-script', now())
  returning id into v_df5_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-6', 1, 'published', v_release_id, 'Initial lesson: The DeFi Ecosystem — What Else Is Out There.', md5('df-6-v1'), 'seed-script', now())
  returning id into v_df6_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-7', 1, 'published', v_release_id, 'Initial lesson: DeFi vs. TradFi — The Bigger Picture.', md5('df-7-v1'), 'seed-script', now())
  returning id into v_df7_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('df-8', 1, 'published', v_release_id, 'Initial lesson: Your DeFi Roadmap — What You Can Do Next.', md5('df-8-v1'), 'seed-script', now())
  returning id into v_df8_version_id;

  ---------------------------------------------------------------------------
  -- 6. Lesson blocks
  ---------------------------------------------------------------------------

  -- ── df-1: Your Money Hasn't Been Sitting Still ────────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df1_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-1-block-1','type','paragraph','order',1,'text',$$A Question

You locked your USDC a while ago. You've been completing lessons, earning Fuel, maybe brewing some Ichor. But have you wondered — where does the Ichor's value come from?

It's not from LockedIn's pocket. We're not paying you out of some company treasury. The value behind your Ichor comes from something your locked USDC has been doing this whole time — something you didn't know about.

Your money has been working while you've been learning.$$)
  ),
  (
    v_df1_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-1-block-2','type','paragraph','order',2,'text',$$The Reveal

When you locked your USDC into the LockedIn smart contract, it didn't just sit there in a digital vault collecting dust. The smart contract took your USDC and deposited it into DeFi protocols — automated financial tools on the Solana blockchain that put your money to work and generate yield (interest).

That yield is what funds the Ichor you've been earning.

Your locked USDC → LockedIn smart contract deposits it into DeFi protocols → DeFi protocols lend it out / provide liquidity → Yield (interest) flows back → Yield funds the Ichor reward pool → You brew Fuel into Ichor, exchangeable for USDC from that pool.

Your money made money while you were studying. And the mechanism behind it is called DeFi.$$)
  ),
  (
    v_df1_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-1-block-3','type','paragraph','order',3,'text',$$What Is DeFi?

DeFi stands for Decentralized Finance. Let's break that down:

Finance = the stuff banks do — lending, borrowing, earning interest, exchanging currencies.
Decentralized = no bank. No company in the middle. Just smart contracts on the blockchain doing the same things automatically.

Analogy: The ATM vs. The Bank Teller — Imagine if every service your bank offers — savings accounts, loans, currency exchange — was available through a machine. No teller. No branch. No "come back during business hours." Just machines that follow their programmed rules, 24/7, for anyone. That's DeFi. Banks' services, rebuilt as smart contracts on the blockchain.

Traditional Finance (TradFi) vs. Decentralized Finance (DeFi):

Who runs it — Banks and institutions vs. Smart contracts (code).
Who can use it — Whoever the bank approves vs. Anyone with a wallet.
Business hours — Mon-Fri, 9-5ish vs. 24/7/365.
Middleman — Banks, brokers, clearinghouses vs. None — code does it all.
Transparency — "Trust us" vs. Verify it yourself on-chain.
Requirements — ID, credit check, minimum balance, residency vs. A wallet. That's it.

That last row is a big deal. Billions of people worldwide are unbanked — they can't access traditional financial services because of where they live, how much they earn, or what documents they have. DeFi doesn't care about any of that. If you have a wallet, you're in.$$)
  ),
  (
    v_df1_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-1-block-4','type','paragraph','order',4,'text',$$Why Should You Care?

Three reasons:

1. Your money is already in DeFi. Your locked USDC is currently deposited in DeFi protocols earning yield. This isn't hypothetical — it's happening right now with YOUR money.

2. Understanding DeFi = understanding your rewards. The Ichor you earn isn't magic. It's backed by real yield generated by real DeFi protocols. Knowing how it works means knowing what your rewards are actually worth.

3. It's the future of finance. Whether or not you go deeper into crypto after LockedIn, DeFi concepts — automated lending, transparent protocols, programmable money — are reshaping how the world thinks about finance.$$)
  ),
  (
    v_df1_version_id, 5, 'callout',
    jsonb_build_object('id','df-1-block-5','type','callout','order',5,'text',$$Quick Recap: Your locked USDC isn't sitting idle — it's been deposited into DeFi protocols earning yield. DeFi = traditional finance services (lending, borrowing, interest) rebuilt as smart contracts. No banks, no middlemen, no business hours, no gatekeeping — just code. The yield your USDC earns is what backs your Ichor rewards.$$,'calloutTone','info')
  );

  -- ── df-2: Lending & Borrowing — The Engine of DeFi ────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df2_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-2-block-1','type','paragraph','order',1,'text',$$The Oldest Financial Service in the World

People have been lending money since ancient civilization. The concept is dead simple:

1. You have money you're not using right now
2. Someone else needs money right now
3. You lend it to them
4. They pay you back later, with a little extra (interest)

Banks have been the middleman in this process for centuries. You deposit money → the bank lends it out → the bank earns interest → the bank gives you a tiny slice of that interest (your "savings rate").

DeFi does the same thing — but cuts out the bank.$$)
  ),
  (
    v_df2_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-2-block-2','type','paragraph','order',2,'text',$$How DeFi Lending Works — The Lending Pool

Imagine a community swimming pool, but for money:

Lenders deposit funds: Alice deposits 1,000 USDC. Bob deposits 500 USDC. You (via LockedIn) deposit your USDC. All goes into the lending pool — managed by a smart contract.

Borrowers draw from the pool: Charlie borrows 200 USDC (pays 5% interest). Diana borrows 300 USDC (pays 5% interest).

The interest borrowers pay flows back into the pool. Lenders earn a share based on how much they deposited. No bank taking a cut. No loan officer. No paperwork. The smart contract handles everything.

What Makes It Different from a Bank:

Who decides loan terms — Bank managers and credit committees vs. the smart contract (algorithm).
Who gets to lend — Only the bank vs. anyone with tokens.
Who gets to borrow — People the bank approves (credit score, income proof) vs. anyone who provides collateral.
Interest rate — Set by the bank (usually low for savers) vs. set by supply and demand (often higher).
Speed — Days to weeks for loan approval vs. instant — deposit collateral, borrow immediately.
Transparency — Bank's internal records vs. everything on-chain — you can verify rates, total deposits, total borrows.$$)
  ),
  (
    v_df2_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-2-block-3','type','paragraph','order',3,'text',$$"Wait — Who Would Borrow From a Smart Contract?"

Good question. In traditional banking, people borrow for all kinds of reasons — buying a house, starting a business, covering an emergency. DeFi borrowing is a bit different.

Since DeFi loans require collateral (you have to deposit more than you borrow), most DeFi borrowers are:

1. Traders who want leverage (borrow USDC to buy more SOL, betting SOL will go up)
2. Users who need cash but don't want to sell (own $10,000 of SOL, need $5,000 USDC now — borrow against it instead of selling)
3. Protocols and projects that need liquidity for their operations

You don't need to understand all the reasons. The key takeaway: there's demand to borrow USDC, and that demand creates yield for lenders — including you, through LockedIn.$$)
  ),
  (
    v_df2_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-2-block-4','type','paragraph','order',4,'text',$$Collateral: The Safety Net

Here's how DeFi lending avoids the risk of people borrowing and not paying back:

In traditional finance: The bank runs a credit check. If you have good credit, they trust you to pay back. If you don't pay back, they send debt collectors, ruin your credit score, maybe take legal action. It's messy.

In DeFi: No credit check. No trust needed. Instead, borrowers put up collateral — they deposit assets worth MORE than what they borrow.

Analogy: The Pawn Shop — Want to borrow $50? Leave your $80 watch as collateral. If you pay back the $50 + interest, you get your watch back. If you don't? The pawn shop keeps the watch. No debt collectors needed.

DeFi works the same way:
- Charlie wants to borrow 1,000 USDC
- He deposits 1,500 USDC worth of SOL as collateral
- If he pays back → he gets his SOL back
- If SOL's price drops too much → the smart contract automatically sells his collateral to protect the lenders (this is called liquidation)

Lenders are protected by math, not by trust.$$)
  ),
  (
    v_df2_version_id, 5, 'paragraph',
    jsonb_build_object('id','df-2-block-5','type','paragraph','order',5,'text',$$How This Connects to Your USDC

Your locked USDC is deposited into lending protocols like Kamino and Marginfi on Solana. Here's the chain:

You lock USDC in LockedIn → LockedIn's smart contract deposits your USDC into Kamino/Marginfi → Borrowers borrow your USDC and pay interest → Interest flows back as yield (typically 3-8% annually) → That yield funds the Ichor reward pool → You brew Fuel into Ichor, exchangeable for USDC from that pool.

You're a lender. You've been a lender this whole time. You just didn't know it.$$)
  ),
  (
    v_df2_version_id, 6, 'callout',
    jsonb_build_object('id','df-2-block-6','type','callout','order',6,'text',$$Quick Recap: DeFi lending = lenders deposit funds into a pool, borrowers pay interest to use them. No bank in the middle — smart contracts manage everything automatically. Borrowers must provide collateral (deposit more than they borrow) so lenders are protected. Your locked USDC is deposited into lending protocols (Kamino/Marginfi) earning yield. That yield is what backs your Ichor rewards — you've been a lender this whole time.$$,'calloutTone','info')
  );

  -- ── df-3: Yield — Where the Money Actually Comes From ─────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df3_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-3-block-1','type','paragraph','order',1,'text',$$"So... Where Does the Interest Come From?"

This is the question everyone should ask — and most people don't. Whenever someone promises you yield, interest, or returns, the first question should always be: who's paying for this, and why?

If you can't answer that question, you don't understand the product. And if you don't understand the product, you could be the product.

Yield in Traditional Finance:

When your bank offers you 1-4% interest on a savings account, here's what's actually happening: You deposit $1,000 → Bank lends your money to homebuyers (mortgages at 6-8%), businesses (loans at 5-15%), credit card holders (debt at 15-25%) → Bank earns interest from borrowers → Bank keeps most of it (they have employees, buildings, shareholders) → Bank gives you a tiny slice: 1-4%.

The bank is the middleman. They earn 6-25% from borrowers and give you 1-4%. The spread is how banks make billions.$$)
  ),
  (
    v_df3_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-3-block-2','type','paragraph','order',2,'text',$$Yield in DeFi

DeFi removes the middleman. The smart contract directly connects lenders and borrowers:

You deposit 1,000 USDC into a lending protocol → Protocol lends to borrowers at 5-10% → Smart contract takes a small protocol fee (0.1-1%) → The rest goes directly to lenders: 3-8%.

No bank skimming the majority. No shareholders. No marble lobbies. The protocol fee is tiny because smart contracts don't need corner offices.

That's why DeFi yields are typically higher than bank savings rates. You're cutting out the middleman and keeping more of the interest.$$)
  ),
  (
    v_df3_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-3-block-3','type','paragraph','order',3,'text',$$The Different Types of Yield

Not all DeFi yield comes from the same place. Here are the main sources:

1. Lending Yield (What Your USDC Is Doing) — You lend tokens, borrowers pay interest, you earn yield. Source: borrowers paying interest. Risk level: Low-moderate (borrowers must overcollateralize). Typical USDC yield: 3-8% APY.

2. Liquidity Provision — You deposit tokens into a trading pool, traders swap through your pool, you earn trading fees. Source: traders paying fees on every swap. Risk level: Moderate (something called "impermanent loss" — covered later). Typical yield: 5-20% APY (varies wildly).

3. Staking — You lock SOL to help secure the Solana network, the network rewards you. Source: network inflation (new SOL is created as rewards). Risk level: Low. Typical SOL staking yield: 6-8% APY.

4. Incentive / Emission Rewards — A new protocol gives out its own token as a reward for using the platform. Source: the protocol's token treasury (they're essentially paying for users). Risk level: High (the reward token can lose value quickly). This is often how new DeFi protocols attract users — they subsidize yield with their own token.$$)
  ),
  (
    v_df3_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-3-block-4','type','paragraph','order',4,'text',$$The Critical Question: Is It Sustainable?

Here's where most people get burned. Not all yield is real. Some yields are temporarily inflated by token emissions (type 4 above), and when the emissions stop, the yield crashes.

The Yield Reality Check:
- Lending interest: Sustainable — borrowers pay real interest for real loans.
- Trading fees: Sustainable — traders pay real fees for real swaps.
- Staking rewards: Mostly sustainable — network inflation is built into the protocol.
- Token emissions: Usually not sustainable — protocol can't print tokens forever, when rewards dry up, yields crash.

LockedIn uses type 1 (lending yield). Your USDC is lent out through Kamino/Marginfi, and borrowers pay real interest. This is sustainable yield — it exists because there's real demand to borrow USDC.

Is it guaranteed? No — interest rates fluctuate based on supply and demand. If lots of people are lending and few are borrowing, rates drop. If many are borrowing and few are lending, rates rise. But the fundamental source (borrower interest) is real.$$)
  ),
  (
    v_df3_version_id, 5, 'paragraph',
    jsonb_build_object('id','df-3-block-5','type','paragraph','order',5,'text',$$APY vs. APR (The Compound Effect)

You'll see these two terms everywhere in DeFi:

APR (Annual Percentage Rate) = simple interest. 5% APR on $1,000 = $50/year.
APY (Annual Percentage Yield) = compound interest. Your earned interest earns interest too. 5% APY on $1,000 = slightly more than $50/year.

Most DeFi protocols quote APY because it accounts for compounding — your yield gets reinvested automatically by the smart contract.

Example: $1,000 USDC at 5% APR for 1 year = $1,050. $1,000 USDC at 5% APY for 1 year = ~$1,051.27 (interest on interest).

The difference is small on modest amounts, but it adds up on larger deposits and longer timeframes.

How LockedIn's Yield Works:

All users' locked USDC → combined pool → Pool deposited into DeFi lending (Kamino/Marginfi) → Earns 3-8% APY from borrowers → Yield flows into the Ichor reward pool → LockedIn takes a 10-20% fee from yield (LockedIn's revenue) → Remaining yield is available to users via Ichor → Users who stay consistent brew Fuel into Ichor and exchange for USDC. Users who slack have yield redistributed (penalties).

The yield is real. It comes from borrowers. LockedIn takes a fee. The rest goes to consistent learners. And slackers' forfeited yield goes into the community pot — rewarding people who show up.$$)
  ),
  (
    v_df3_version_id, 6, 'callout',
    jsonb_build_object('id','df-3-block-6','type','callout','order',6,'text',$$Quick Recap: Always ask "where does the yield come from?" If you can't answer, be cautious. DeFi yields are higher than banks because there's no middleman taking a big cut. Main yield sources: lending interest, trading fees, staking rewards, token emissions. LockedIn uses lending yield (borrowers pay real interest) — this is sustainable. APY = compound interest rate. Rates fluctuate based on supply and demand. LockedIn takes 10-20% of yield as revenue. The rest funds your Ichor rewards.$$,'calloutTone','info')
  );

  -- ── df-4: The DeFi Protocols Your Money Uses ──────────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df4_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-4-block-1','type','paragraph','order',1,'text',$$Meet Kamino and Marginfi

Your locked USDC is currently deposited in real DeFi protocols on Solana. These aren't abstractions — they're live smart contracts managing billions of dollars. Let's meet them.

Kamino

What It Is: Kamino is a lending and liquidity platform on Solana. It started as a liquidity management tool and expanded into one of Solana's largest lending protocols.

What It Does (In Simple Terms): Think of Kamino as an automated bank branch on the blockchain — it accepts deposits (USDC, SOL, and other tokens), lends those deposits to borrowers, manages collateral and liquidations automatically, and distributes interest to depositors.

How Your USDC Interacts with It: LockedIn's smart contract deposits your USDC into Kamino → Kamino adds it to its USDC lending pool → Borrowers on Kamino borrow USDC (with overcollateralized loans) → Borrowers pay interest, which flows back to the pool → Your share of interest = yield.

Why Kamino? It's one of the largest lending protocols on Solana (hundreds of millions in deposits), battle-tested handling real money at scale, transparent with all pools, rates, and positions visible on-chain, and has undergone multiple audits by security firms.$$)
  ),
  (
    v_df4_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-4-block-2','type','paragraph','order',2,'text',$$Marginfi

What It Is: Marginfi is another lending and borrowing protocol on Solana. It was one of the first major lending platforms in the Solana ecosystem.

What It Does: Same core function as Kamino — accepts deposits, lends to borrowers, distributes interest. Think of it as a second automated bank branch.

Why Use Two Protocols? Diversification. Same reason you wouldn't put all your savings in one bank. By splitting deposits across Kamino and Marginfi, LockedIn:
- Reduces risk (if one protocol has an issue, not everything is affected)
- Can optimize for the best rates (shift deposits toward whichever protocol offers higher APY)
- Avoids concentration (putting too much into one pool can lower rates)

Analogy: Two Baskets — "Don't put all your eggs in one basket." Your USDC is spread across multiple protocols so that no single point of failure can affect everything.$$)
  ),
  (
    v_df4_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-4-block-3','type','paragraph','order',3,'text',$$Jupiter (The Swap Layer)

You might also see Jupiter mentioned in the LockedIn ecosystem. Jupiter isn't a lending protocol — it's a decentralized exchange aggregator.

What It Does: When you want to swap one token for another (say, SOL for USDC), Jupiter finds the best rate across all Solana trading pools and executes the swap for you.

Analogy: A Price Comparison Website — Imagine wanting to buy a phone. Instead of checking every store yourself, you use a site that instantly compares all prices and buys from the cheapest one. Jupiter does this for token swaps.

How LockedIn Uses It:
- When yield needs to be converted between token types
- When Ichor is exchanged for USDC from the yield pool
- Basically: whenever tokens need to be swapped efficiently

Jupiter isn't where your money sits — it's the highway your money uses when it needs to move between tokens.$$)
  ),
  (
    v_df4_version_id, 4, 'code',
    jsonb_build_object('id','df-4-block-4','type','code','order',4,'text',$$How It All Fits Together:

                    YOUR LOCKED USDC
                          │
                LockedIn Smart Contract
                     │         │
                ┌────┘         └────┐
                ▼                   ▼
           ┌─────────┐       ┌───────────┐
           │  KAMINO  │       │ MARGINFI  │
           │ Lending  │       │ Lending   │
           │  Pool    │       │  Pool     │
           └────┬─────┘       └────┬──────┘
                │                   │
                └──────┐   ┌───────┘
                       ▼   ▼
                 Yield flows back
                       │
                LockedIn Smart Contract
                │              │
          LockedIn fee    Ichor Reward Pool
          (10-20%)             │
                          Your Ichor
                               │
                       Jupiter (swap layer)
                               │
                          USDC payout$$)
  ),
  (
    v_df4_version_id, 5, 'callout',
    jsonb_build_object('id','df-4-block-5','type','callout','order',5,'text',$$Quick Recap: Kamino and Marginfi are lending protocols on Solana — your USDC is deposited there to earn yield. Using two protocols = diversification (don't put all eggs in one basket). Jupiter is a swap aggregator — finds the best rates when tokens need to be exchanged. All of these are smart contracts — automated, transparent, verifiable on-chain. LockedIn's smart contract orchestrates the flow between all of them. Every box in the diagram is a smart contract. Every arrow is a transaction on the Solana blockchain.$$,'calloutTone','info')
  );

  -- ── df-5: Risk — The Honest Conversation ──────────────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df5_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-5-block-1','type','paragraph','order',1,'text',$$Nothing Is Risk-Free

We've spent the last few lessons explaining how DeFi works and how your money earns yield. Now it's time for the honest conversation.

DeFi is not a savings account. It doesn't have government deposit insurance. It doesn't have a customer support number. And while the risk is manageable — especially with how LockedIn structures things — pretending it's zero would be dishonest.

Today we cover what can go wrong, how likely it is, and what protections exist.

The Five Risks

1. Smart Contract Risk — A bug in the smart contract code that allows an attacker to steal funds or causes funds to get stuck. This is the most significant risk in DeFi. Smart contract exploits have happened — even to major protocols. However, well-established protocols (Kamino, Marginfi) have undergone multiple security audits. They've been running for years with hundreds of millions of dollars — battle-tested. LockedIn mitigates this by using only established, audited protocols and diversifying across multiple protocols. Analogy: It's like flying. Plane crashes happen, but modern aviation has so many safety checks that it's statistically the safest way to travel.

2. Interest Rate Risk — Yield rates go up and down based on supply and demand. The 5% APY you see today might be 2% next month or 8% next month. This is very real, but it's not a "loss" risk. Your USDC doesn't disappear — you just earn less (or more) than expected. LockedIn diversifies across protocols to capture the best available rates.$$)
  ),
  (
    v_df5_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-5-block-2','type','paragraph','order',2,'text',$$3. Stablecoin Risk — USDC loses its $1 peg. Very unlikely, but not impossible. USDC briefly dipped to $0.87 in March 2023 when Silicon Valley Bank collapsed. It recovered within days. USDC is issued by Circle, a regulated US company, with reserves held in US Treasury bonds and bank deposits — audited monthly. Your 50 USDC is almost certainly worth $50. Not guaranteed by a government, but backed by real, audited reserves.

4. Solana Network Risk — Solana has had outages in the past, though reliability has improved significantly. During an outage, you can't make transactions (no locking, unlocking, or claiming), BUT your funds are safe — they're in the smart contracts, which resume when the network comes back. It's like a power outage — your stuff in the vault is fine, you just can't access the building temporarily. Network downtime does NOT put your funds at risk. It's an inconvenience, not a loss.

5. Regulatory Risk — Governments create regulations that affect DeFi or stablecoins. Regulations are evolving worldwide. Some possibilities: countries restricting access to DeFi protocols, new rules around stablecoins that affect USDC, tax requirements for DeFi yields. This is a long-term industry risk, not something that would cause sudden fund loss.$$)
  ),
  (
    v_df5_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-5-block-3','type','paragraph','order',3,'text',$$Putting Risk in Perspective

Smart contract exploit — Likelihood: Low (audited protocols). Impact: High (potential fund loss). Your exposure: Mitigated by diversification.
Interest rate fluctuation — Likelihood: High (happens constantly). Impact: Low (you earn less, not lose money). Your exposure: Just means variable Ichor rewards.
USDC depeg — Likelihood: Very low. Impact: Moderate (temporary value dip). Your exposure: USDC has strong track record.
Solana downtime — Likelihood: Low-moderate. Impact: Low (temporary access issue, funds safe). Your exposure: Inconvenience only.
Regulatory changes — Likelihood: Uncertain. Impact: Variable. Your exposure: Long-term, not sudden.

The honest summary: The most meaningful risk is smart contract risk. Everything else is either unlikely, temporary, or doesn't affect your principal. LockedIn mitigates smart contract risk by using established, audited protocols and diversifying across them.$$)
  ),
  (
    v_df5_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-5-block-4','type','paragraph','order',4,'text',$$How This Compares to Traditional Finance

Traditional finance has risks too — people just don't think about them:

Institution failure — Banks can fail (Silicon Valley Bank, 2023) vs. smart contracts can have bugs.
Government protection — Deposit insurance (up to a limit) vs. no government insurance, but also no government able to freeze your funds.
Theft — Identity theft, card fraud, bank reverses it vs. wallet compromise is irreversible (but YOU control the key).
Inflation — Your 1% savings rate doesn't keep up with 3-5% inflation vs. DeFi yields often beat inflation.
Access — Bank can freeze your account vs. smart contract can't freeze anything.

Neither system is risk-free. They have different risk profiles. Understanding both lets you make informed decisions about where to keep your money.

The Golden Rule of DeFi: Never put in more than you can afford to lose. This applies to LockedIn too. Lock an amount that motivates you — enough to care about, but not so much that losing it would cause financial hardship. The yield your USDC earns is a bonus. The real value is the learning and the discipline.$$)
  ),
  (
    v_df5_version_id, 5, 'callout',
    jsonb_build_object('id','df-5-block-5','type','callout','order',5,'text',$$Quick Recap: DeFi is NOT risk-free. The most significant risk is smart contract exploits. LockedIn mitigates risks by using audited protocols and diversifying across them. Interest rates fluctuate — that's normal, not dangerous. USDC is very likely to stay at $1, but not guaranteed. Solana outages are temporary inconveniences, not fund risks. Never invest more than you can afford to lose.$$,'calloutTone','info')
  );

  -- ── df-6: The DeFi Ecosystem — What Else Is Out There ─────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df6_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-6-block-1','type','paragraph','order',1,'text',$$Beyond Lending

Your USDC is in lending protocols. But DeFi is much bigger than lending. Today, let's zoom out and look at the broader landscape — not because you need to use all of it right now, but because understanding the ecosystem helps you make sense of the crypto world.

The Main Categories

1. Lending & Borrowing (What You Know) — Deposit tokens, earn interest. Borrow tokens, pay interest. Solana examples: Kamino, Marginfi, Solend. Your connection: This is where your locked USDC is right now.

2. Decentralized Exchanges (DEXs) — Swap one token for another without a middleman. Instead of a traditional exchange (like a stock market with an order book), DEXs use liquidity pools — pots of tokens that traders swap through. You want to swap 10 SOL for USDC → DEX finds a pool containing both SOL and USDC → You put in 10 SOL, the pool gives you the equivalent USDC → The pool charges a tiny fee (~0.1-0.3%) → That fee goes to liquidity providers (people who deposited tokens into the pool). Solana examples: Jupiter (aggregator), Raydium, Orca. Your connection: Jupiter is used in the LockedIn ecosystem for token swaps.$$)
  ),
  (
    v_df6_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-6-block-2','type','paragraph','order',2,'text',$$3. Liquid Staking — Normally, when you stake SOL (lock it to help secure the Solana network), it's locked up and you can't use it. Liquid staking gives you a receipt token that represents your staked SOL — you can use this receipt in other DeFi protocols while your SOL is still staked. Analogy: You put your car in a long-term parking garage. Normally you can't use the car while it's parked. Liquid staking is like getting a rental car to drive while your real car is parked — and you're still earning the parking rewards. Solana examples: Marinade (mSOL), Jito (JitoSOL). Your connection: Not directly used by LockedIn, but important to understand.

4. Yield Aggregators / Vaults — Smart contracts that automatically move your money between different DeFi protocols to find the best yield. Think of it as a financial robot that's always shopping for the best savings rate. Solana examples: Kamino vaults, various yield optimizers. Your connection: LockedIn's smart contract does something similar — it optimizes which protocols to deposit your USDC in.

5. Stablecoins & Payments — Using stablecoins (USDC, USDT, etc.) for actual payments and transfers. Sending money globally for fractions of a cent in under a second. Your connection: USDC is the stablecoin you locked. You already understand this from Course 1.$$)
  ),
  (
    v_df6_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-6-block-3','type','paragraph','order',3,'text',$$How These Pieces Connect

DeFi isn't isolated apps — it's an ecosystem where everything plugs into everything else. This is called composability — like LEGO blocks that snap together.

Example of composability in action: Stake SOL → get a liquid staking token → Deposit that staking token into a lending pool → Borrow USDC against it → Provide USDC to a liquidity pool → Earn trading fees + lending yield + staking rewards... all at the same time. Each step = a smart contract. All plugged together like LEGO.

This composability is what makes DeFi powerful — and what makes it complex. You don't need to stack LEGO blocks six layers high to benefit. Even just one block (lending) is valuable. But knowing the full picture helps you understand what's possible.

DeFi on Solana today handles billions in total value locked (TVL), millions of transactions per day, hundreds of thousands of active wallets, and 20+ well-established protocols. This isn't a toy. It's a parallel financial system handling real money at real scale.$$)
  ),
  (
    v_df6_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-6-block-4','type','paragraph','order',4,'text',$$Do You Need to Use All of This?

No. Most people in DeFi use one or two protocols. You're already using lending through LockedIn without managing it yourself.

But if you graduated to a self-custody wallet (Lesson 8 from Course 1), you could:
- Swap tokens on Jupiter
- Deposit extra USDC into Kamino yourself and earn yield directly
- Stake SOL and earn staking rewards
- Explore new protocols as they launch

The door is open whenever you're ready. For now, just knowing the landscape is enough.$$)
  ),
  (
    v_df6_version_id, 5, 'callout',
    jsonb_build_object('id','df-6-block-5','type','callout','order',5,'text',$$Quick Recap: DeFi has many categories: lending, DEXs, liquid staking, yield aggregators, payments. Composability = DeFi protocols plug into each other like LEGO blocks. You're already using lending (through LockedIn). You don't need to use everything. The ecosystem is real and handles billions of dollars. If/when you want to explore, a self-custody wallet opens the door to all of it.$$,'calloutTone','info')
  );

  -- ── df-7: DeFi vs. TradFi — The Bigger Picture ────────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df7_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-7-block-1','type','paragraph','order',1,'text',$$Two Financial Systems

Right now, two financial systems exist side by side:

TradFi (Traditional Finance) — the banks, brokers, stock exchanges, and financial institutions that have run the world's money for centuries.

DeFi (Decentralized Finance) — the smart contracts, protocols, and blockchain-based tools we've been learning about.

Neither is perfect. Neither is going to "win" and eliminate the other. Let's honestly compare them so you can form your own opinion.

Head-to-Head

Access — TradFi: You need a bank account, government ID, proof of address, minimum deposit. About 1.4 billion adults worldwide are unbanked. DeFi: You need a wallet. That's it. No ID, no minimum, no permission. Verdict: DeFi wins on access, but TradFi has consumer protections DeFi doesn't.

Speed — TradFi: Domestic transfers instant to a few days. International: 1-5 business days. Stock trade settlement: 1-2 business days. DeFi on Solana: Everything settles in under a second. 24/7. Verdict: DeFi wins. Not close.

Cost — TradFi: Wire transfer $15-50, international $25-50 + FX markup, overdraft fee $35, ATM fee $2-5. DeFi on Solana: Any transaction ~$0.00025. Verdict: DeFi wins dramatically.$$)
  ),
  (
    v_df7_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-7-block-2','type','paragraph','order',2,'text',$$Safety — TradFi: Government-insured deposits. Fraud protection. Chargebacks. Customer support. "Forgot password." DeFi: No insurance (usually). No chargebacks. No customer support. If you lose your key, you lose your money. Verdict: TradFi wins on safety nets. DeFi gives you more control but more responsibility.

Transparency — TradFi: "Trust us." You can't see the bank's books or risk exposure. DeFi: Everything is on-chain. You can verify total deposits, loans, rates, protocol revenue — all public. Verdict: DeFi wins. Total transparency vs. opaque institutions.

Yield — TradFi: Savings accounts 1-5% APY (most of the world gets closer to 1%). The bank keeps the spread. DeFi: Lending yields 3-8%+ APY for stablecoins. You keep most of the interest. Verdict: DeFi typically offers better yields. But not guaranteed or insured.

Regulation & Protection — TradFi: Heavily regulated. Deposit insurance. Consumer protection laws. DeFi: Mostly unregulated (evolving). No deposit insurance. "Code is law" — for better and worse. Verdict: TradFi wins for protection. DeFi is still the Wild West in many ways, though it's maturing.$$)
  ),
  (
    v_df7_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-7-block-3','type','paragraph','order',3,'text',$$The Honest Take

DeFi isn't better than TradFi at everything. TradFi isn't better than DeFi at everything. Here's a balanced view:

Use TradFi for: Your emergency fund (insured, instantly accessible). Paying rent, bills, everyday spending. Situations where fraud protection matters (online shopping). Anything where you need human customer support.

Use DeFi for: Earning yield on savings you can afford to lock up. Sending money internationally (fast, cheap). Accessing financial tools without gatekeepers. Situations where transparency and self-custody matter. Learning about the future of finance (that's why you're here).

LockedIn sits at the intersection. You're using DeFi (smart contracts, on-chain lending) with a TradFi-like experience (sign in with Google, no seed phrase needed). As you gain knowledge, you can move deeper into either world — or stay right where you are.$$)
  ),
  (
    v_df7_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-7-block-4','type','paragraph','order',4,'text',$$The Future (Probably)

The most likely future isn't "DeFi replaces banks" or "banks kill DeFi." It's convergence — the good parts of both systems merging:

- Banks adopting blockchain rails for faster, cheaper transfers
- DeFi protocols adding compliance features and consumer protections
- Stablecoins becoming a bridge between the two worlds
- Users choosing the best tool for each situation

You're already living in this converged world — using a Google login (TradFi convenience) to access DeFi yield. That's the future.$$)
  ),
  (
    v_df7_version_id, 5, 'callout',
    jsonb_build_object('id','df-7-block-5','type','callout','order',5,'text',$$Quick Recap: DeFi wins on access, speed, cost, transparency, and yields. TradFi wins on safety nets, regulation, and consumer protection. Neither is going away — the future is convergence. Use the right tool for the right job. LockedIn bridges both worlds — DeFi infrastructure, TradFi-like experience.$$,'calloutTone','info')
  );

  -- ── df-8: Your DeFi Roadmap — What You Can Do Next ────────────────────
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_df8_version_id, 1, 'paragraph',
    jsonb_build_object('id','df-8-block-1','type','paragraph','order',1,'text',$$What You Now Know

Let's take stock. Over two courses, you've learned:

Course 1 (Blockchain & Wallets): What a blockchain is and why it matters. Why Solana is fast and cheap. How wallets, keys, and transactions work. Smart contracts and how they protect your money. Tokens (SOL, USDC) and counters (Fuel, Ichor). Security and scam patterns. Self-custody (optional).

Course 2 (DeFi): What DeFi is and why it exists. How lending and borrowing work. Where yield comes from and whether it's sustainable. The protocols your USDC is in (Kamino, Marginfi, Jupiter). The real risks — honestly. The broader DeFi ecosystem. DeFi vs. TradFi — strengths and weaknesses.

You now understand more about decentralized finance than most people who use it daily. That's not an exaggeration. Most DeFi users can't explain where yield comes from. You can.$$)
  ),
  (
    v_df8_version_id, 2, 'paragraph',
    jsonb_build_object('id','df-8-block-2','type','paragraph','order',2,'text',$$Three Paths Forward

Path 1: Stay the Course — Keep using LockedIn as-is. Complete courses. Earn Fuel. Brew Ichor. Let your USDC earn yield through the managed protocols. Don't touch DeFi directly. Best for people who want the benefits of DeFi without the complexity. Nothing wrong with this — it's the whole point of LockedIn's design.

Path 2: Explore with Training Wheels — Graduate to a self-custody wallet (Course 1, Lesson 8). Start exploring Solana DeFi yourself with small amounts. Try swapping tokens on Jupiter, depositing a small amount of USDC directly into Kamino or Marginfi, staking a small amount of SOL, or browsing Solscan. Best for curious learners who want hands-on experience with small stakes.

Path 3: Go Deep — Dive into DeFi seriously. Learn about liquidity provision, yield farming, liquid staking, governance tokens. Start managing a real portfolio across multiple protocols. Best for people who want to make DeFi a significant part of their financial life. This path requires more learning, more time, and higher risk tolerance.

Wherever you are, you have the foundation. You can always move between paths. The knowledge doesn't expire.$$)
  ),
  (
    v_df8_version_id, 3, 'paragraph',
    jsonb_build_object('id','df-8-block-3','type','paragraph','order',3,'text',$$Principles to Live By in DeFi

No matter which path you take, these principles will keep you safe:

1. Always Ask "Where Does the Yield Come From?" — If a protocol offers 50% APY and you can't explain the source, stay away. Sustainable yield comes from real economic activity (lending interest, trading fees). Unsustainable yield comes from token emissions that will eventually stop.

2. Start Small, Scale Slow — First time using a new protocol? Put in $10. Watch it for a week. Understand how it works. Then consider adding more. The fastest way to lose money in DeFi is to rush.

3. Diversify — Don't put everything in one protocol, one token, or one chain. Spread risk across multiple platforms.

4. Stay Updated — DeFi moves fast. Protocols upgrade. New risks emerge. Follow trusted sources. Stay informed. The landscape you learned about today will evolve.

5. Only Risk What You Can Afford to Lose — This is always true. DeFi is not a savings account. It's not insured. It has real risks. Keep your emergency fund in TradFi. Use DeFi for money you can afford to lock up and potentially lose.$$)
  ),
  (
    v_df8_version_id, 4, 'paragraph',
    jsonb_build_object('id','df-8-block-4','type','paragraph','order',4,'text',$$A Note on Taxes

This isn't tax advice — consult a tax professional in your country. But be aware: in many jurisdictions, DeFi yield is taxable income. Earning Ichor and exchanging it for USDC may create a tax event. Keep records of your transactions (the blockchain keeps them permanently, but it helps to track them yourself too).

Course Complete

You started Course 1 wondering what a blockchain is. You end Course 2 understanding how an entire parallel financial system works — and your money is in it right now, earning yield, governed by smart contracts, verified by validators.

That's not a small thing. That's financial literacy for the next era.

Your USDC is locked. Your yield is flowing. Your Ichor is brewing. And now you know exactly what every piece of that sentence means.$$)
  ),
  (
    v_df8_version_id, 5, 'callout',
    jsonb_build_object('id','df-8-block-5','type','callout','order',5,'text',$$DeFi Fundamentals — Completed. You've earned real financial knowledge: how DeFi works, where yield comes from, what the risks are, and how the entire ecosystem fits together. Your USDC has been working while you've been learning. Now you know exactly how.$$,'calloutTone','info')
  );

  ---------------------------------------------------------------------------
  -- 7. Questions
  ---------------------------------------------------------------------------

  -- df-1 questions
  insert into lesson.questions (id, lesson_version_id, question_order, question_type, prompt, correct_answer, metadata) values
    ('df-1-q1', v_df1_version_id, 1, 'mcq', $$Where does the value behind your Ichor rewards come from?$$, $$Yield generated by your locked USDC in DeFi protocols$$, '{}'::jsonb),

  -- df-2 questions
    ('df-2-q1', v_df2_version_id, 1, 'mcq', $$How does DeFi lending protect lenders from borrowers who don't pay back?$$, $$Borrowers must deposit collateral worth more than they borrow$$, '{}'::jsonb),

  -- df-3 questions
    ('df-3-q1', v_df3_version_id, 1, 'mcq', $$Why are DeFi lending yields typically higher than bank savings rates?$$, $$There's no bank in the middle taking most of the interest$$, '{}'::jsonb),

  -- df-4 questions
    ('df-4-q1', v_df4_version_id, 1, 'mcq', $$Why does LockedIn split your USDC across multiple DeFi protocols instead of using just one?$$, $$To diversify risk and optimize for the best rates$$, '{}'::jsonb),

  -- df-5 questions
    ('df-5-q1', v_df5_version_id, 1, 'mcq', $$What is the most significant risk in DeFi?$$, $$A bug in a smart contract that could be exploited$$, '{}'::jsonb),

  -- df-6 questions
    ('df-6-q1', v_df6_version_id, 1, 'mcq', $$What does "composability" mean in DeFi?$$, $$DeFi protocols can plug into each other like LEGO blocks$$, '{}'::jsonb),

  -- df-7 questions
    ('df-7-q1', v_df7_version_id, 1, 'mcq', $$What is DeFi's biggest advantage over traditional finance?$$, $$It removes middlemen, giving users more access, transparency, and better rates$$, '{}'::jsonb);

  ---------------------------------------------------------------------------
  -- 8. Question options (MCQ only)
  ---------------------------------------------------------------------------
  insert into lesson.question_options (question_id, option_order, option_text) values
    -- df-1-q1
    ('df-1-q1', 1, 'LockedIn pays it out of company funds'),
    ('df-1-q1', 2, 'Yield generated by your locked USDC in DeFi protocols'),
    ('df-1-q1', 3, 'Other users'' locked USDC'),

    -- df-2-q1
    ('df-2-q1', 1, 'Credit checks and debt collectors'),
    ('df-2-q1', 2, 'Borrowers must deposit collateral worth more than they borrow'),
    ('df-2-q1', 3, 'A central authority guarantees all loans'),

    -- df-3-q1
    ('df-3-q1', 1, 'DeFi is riskier, so it pays more to compensate'),
    ('df-3-q1', 2, 'There''s no bank in the middle taking most of the interest'),
    ('df-3-q1', 3, 'DeFi uses fake money so it can offer more'),

    -- df-4-q1
    ('df-4-q1', 1, 'It''s cheaper'),
    ('df-4-q1', 2, 'To diversify risk and optimize for the best rates'),
    ('df-4-q1', 3, 'Because each protocol holds a different type of USDC'),

    -- df-5-q1
    ('df-5-q1', 1, 'Solana going offline'),
    ('df-5-q1', 2, 'A bug in a smart contract that could be exploited'),
    ('df-5-q1', 3, 'Interest rates changing'),

    -- df-6-q1
    ('df-6-q1', 1, 'Smart contracts can be broken down into smaller pieces'),
    ('df-6-q1', 2, 'DeFi protocols can plug into each other like LEGO blocks'),
    ('df-6-q1', 3, 'You need to use all protocols together for them to work'),

    -- df-7-q1
    ('df-7-q1', 1, 'It''s completely risk-free'),
    ('df-7-q1', 2, 'It removes middlemen, giving users more access, transparency, and better rates'),
    ('df-7-q1', 3, 'It''s regulated by governments');

  ---------------------------------------------------------------------------
  -- 9. Source attributions
  ---------------------------------------------------------------------------
  insert into lesson.source_attributions (lesson_version_id, source_url, source_repo, source_ref, source_license, citation_note) values
    (v_df1_version_id, 'https://ethereum.org/en/defi/',        'ethereum',          'defi',            'CC-BY-4.0',   'DeFi overview concepts adapted for beginner Course 2.'),
    (v_df2_version_id, 'https://docs.kamino.finance/',         'kamino-finance',    'docs',            'unknown',     'Lending and borrowing concepts adapted for beginner Course 2.'),
    (v_df3_version_id, 'https://docs.kamino.finance/',         'kamino-finance',    'docs/yield',      'unknown',     'Yield and APY concepts adapted for beginner Course 2.'),
    (v_df4_version_id, 'https://docs.kamino.finance/',         'kamino-finance',    'docs/protocols',  'unknown',     'Kamino, Marginfi, and Jupiter protocol descriptions adapted for beginner Course 2.'),
    (v_df5_version_id, 'https://rekt.news/',                   'rekt-news',         'leaderboard',     'unknown',     'DeFi risk analysis and smart contract exploit history referenced for beginner Course 2.'),
    (v_df6_version_id, 'https://defillama.com/chain/Solana',   'defillama',         'chain/solana',    'unknown',     'Solana DeFi ecosystem overview adapted for beginner Course 2.'),
    (v_df7_version_id, 'https://ethereum.org/en/defi/',        'ethereum',          'defi/tradfi',     'CC-BY-4.0',   'DeFi vs TradFi comparison concepts adapted for beginner Course 2.'),
    (v_df8_version_id, 'https://solana.com/ecosystem',         'solana-labs/solana', 'ecosystem',       'Apache-2.0',  'Solana DeFi roadmap and ecosystem resources adapted for beginner Course 2.');

  ---------------------------------------------------------------------------
  -- 10. Published payloads (sanitized — no correctAnswer)
  ---------------------------------------------------------------------------

  -- df-1 payload
  v_df1_payload := jsonb_build_object(
    'id','df-1','courseId','defi-how-money-earns','moduleId','defi-module-core','title','Your Money Hasn''t Been Sitting Still','order',1,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-1-block-1','type','paragraph','order',1,'text',$$A Question

You locked your USDC a while ago. You've been completing lessons, earning Fuel, maybe brewing some Ichor. But have you wondered — where does the Ichor's value come from?

It's not from LockedIn's pocket. We're not paying you out of some company treasury. The value behind your Ichor comes from something your locked USDC has been doing this whole time — something you didn't know about.

Your money has been working while you've been learning.$$),
      jsonb_build_object('id','df-1-block-2','type','paragraph','order',2,'text',$$The Reveal

When you locked your USDC into the LockedIn smart contract, it didn't just sit there in a digital vault collecting dust. The smart contract took your USDC and deposited it into DeFi protocols — automated financial tools on the Solana blockchain that put your money to work and generate yield (interest).

That yield is what funds the Ichor you've been earning.

Your locked USDC → LockedIn smart contract deposits it into DeFi protocols → DeFi protocols lend it out / provide liquidity → Yield (interest) flows back → Yield funds the Ichor reward pool → You brew Fuel into Ichor, exchangeable for USDC from that pool.

Your money made money while you were studying. And the mechanism behind it is called DeFi.$$),
      jsonb_build_object('id','df-1-block-3','type','paragraph','order',3,'text',$$What Is DeFi?

DeFi stands for Decentralized Finance. Let's break that down:

Finance = the stuff banks do — lending, borrowing, earning interest, exchanging currencies.
Decentralized = no bank. No company in the middle. Just smart contracts on the blockchain doing the same things automatically.

Analogy: The ATM vs. The Bank Teller — Imagine if every service your bank offers — savings accounts, loans, currency exchange — was available through a machine. No teller. No branch. No "come back during business hours." Just machines that follow their programmed rules, 24/7, for anyone. That's DeFi. Banks' services, rebuilt as smart contracts on the blockchain.

Traditional Finance (TradFi) vs. Decentralized Finance (DeFi):

Who runs it — Banks and institutions vs. Smart contracts (code).
Who can use it — Whoever the bank approves vs. Anyone with a wallet.
Business hours — Mon-Fri, 9-5ish vs. 24/7/365.
Middleman — Banks, brokers, clearinghouses vs. None — code does it all.
Transparency — "Trust us" vs. Verify it yourself on-chain.
Requirements — ID, credit check, minimum balance, residency vs. A wallet. That's it.

That last row is a big deal. Billions of people worldwide are unbanked — they can't access traditional financial services because of where they live, how much they earn, or what documents they have. DeFi doesn't care about any of that. If you have a wallet, you're in.$$),
      jsonb_build_object('id','df-1-block-4','type','paragraph','order',4,'text',$$Why Should You Care?

Three reasons:

1. Your money is already in DeFi. Your locked USDC is currently deposited in DeFi protocols earning yield. This isn't hypothetical — it's happening right now with YOUR money.

2. Understanding DeFi = understanding your rewards. The Ichor you earn isn't magic. It's backed by real yield generated by real DeFi protocols. Knowing how it works means knowing what your rewards are actually worth.

3. It's the future of finance. Whether or not you go deeper into crypto after LockedIn, DeFi concepts — automated lending, transparent protocols, programmable money — are reshaping how the world thinks about finance.$$),
      jsonb_build_object('id','df-1-block-5','type','callout','order',5,'text',$$Quick Recap: Your locked USDC isn't sitting idle — it's been deposited into DeFi protocols earning yield. DeFi = traditional finance services (lending, borrowing, interest) rebuilt as smart contracts. No banks, no middlemen, no business hours, no gatekeeping — just code. The yield your USDC earns is what backs your Ichor rewards.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-1-q1','type','mcq','prompt',$$Where does the value behind your Ichor rewards come from?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-1-q1-opt-1','text','LockedIn pays it out of company funds'),
        jsonb_build_object('id','df-1-q1-opt-2','text','Yield generated by your locked USDC in DeFi protocols'),
        jsonb_build_object('id','df-1-q1-opt-3','text','Other users'' locked USDC')
      ))
    )
  );

  -- df-2 payload
  v_df2_payload := jsonb_build_object(
    'id','df-2','courseId','defi-how-money-earns','moduleId','defi-module-core','title','Lending & Borrowing — The Engine of DeFi','order',2,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-2-block-1','type','paragraph','order',1,'text',$$The Oldest Financial Service in the World

People have been lending money since ancient civilization. The concept is dead simple:

1. You have money you're not using right now
2. Someone else needs money right now
3. You lend it to them
4. They pay you back later, with a little extra (interest)

Banks have been the middleman in this process for centuries. You deposit money → the bank lends it out → the bank earns interest → the bank gives you a tiny slice of that interest (your "savings rate").

DeFi does the same thing — but cuts out the bank.$$),
      jsonb_build_object('id','df-2-block-2','type','paragraph','order',2,'text',$$How DeFi Lending Works — The Lending Pool

Imagine a community swimming pool, but for money:

Lenders deposit funds: Alice deposits 1,000 USDC. Bob deposits 500 USDC. You (via LockedIn) deposit your USDC. All goes into the lending pool — managed by a smart contract.

Borrowers draw from the pool: Charlie borrows 200 USDC (pays 5% interest). Diana borrows 300 USDC (pays 5% interest).

The interest borrowers pay flows back into the pool. Lenders earn a share based on how much they deposited. No bank taking a cut. No loan officer. No paperwork. The smart contract handles everything.$$),
      jsonb_build_object('id','df-2-block-3','type','paragraph','order',3,'text',$$"Wait — Who Would Borrow From a Smart Contract?"

Good question. Since DeFi loans require collateral (you have to deposit more than you borrow), most DeFi borrowers are:

1. Traders who want leverage (borrow USDC to buy more SOL, betting SOL will go up)
2. Users who need cash but don't want to sell (own $10,000 of SOL, need $5,000 USDC now — borrow against it instead of selling)
3. Protocols and projects that need liquidity for their operations

The key takeaway: there's demand to borrow USDC, and that demand creates yield for lenders — including you, through LockedIn.$$),
      jsonb_build_object('id','df-2-block-4','type','paragraph','order',4,'text',$$Collateral: The Safety Net

In DeFi, borrowers put up collateral — they deposit assets worth MORE than what they borrow. Analogy: The Pawn Shop — Want to borrow $50? Leave your $80 watch as collateral. If you pay back the $50 + interest, you get your watch back. If you don't? The pawn shop keeps the watch.

DeFi works the same way: Charlie deposits 1,500 USDC worth of SOL to borrow 1,000 USDC. If SOL's price drops too much, the smart contract automatically sells his collateral to protect the lenders (liquidation). Lenders are protected by math, not by trust.$$),
      jsonb_build_object('id','df-2-block-5','type','paragraph','order',5,'text',$$How This Connects to Your USDC

Your locked USDC is deposited into lending protocols like Kamino and Marginfi on Solana. You lock USDC in LockedIn → LockedIn deposits into Kamino/Marginfi → Borrowers pay interest → Yield flows back (typically 3-8% annually) → That yield funds the Ichor reward pool → You brew Fuel into Ichor.

You're a lender. You've been a lender this whole time. You just didn't know it.$$),
      jsonb_build_object('id','df-2-block-6','type','callout','order',6,'text',$$Quick Recap: DeFi lending = lenders deposit funds into a pool, borrowers pay interest to use them. No bank in the middle — smart contracts manage everything automatically. Borrowers must provide collateral (deposit more than they borrow) so lenders are protected. Your locked USDC is deposited into lending protocols (Kamino/Marginfi) earning yield. That yield is what backs your Ichor rewards — you've been a lender this whole time.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-2-q1','type','mcq','prompt',$$How does DeFi lending protect lenders from borrowers who don't pay back?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-2-q1-opt-1','text','Credit checks and debt collectors'),
        jsonb_build_object('id','df-2-q1-opt-2','text','Borrowers must deposit collateral worth more than they borrow'),
        jsonb_build_object('id','df-2-q1-opt-3','text','A central authority guarantees all loans')
      ))
    )
  );

  -- df-3 payload
  v_df3_payload := jsonb_build_object(
    'id','df-3','courseId','defi-how-money-earns','moduleId','defi-module-core','title','Yield — Where the Money Actually Comes From','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-3-block-1','type','paragraph','order',1,'text',$$"So... Where Does the Interest Come From?"

This is the question everyone should ask — and most people don't. Whenever someone promises you yield, interest, or returns, the first question should always be: who's paying for this, and why?

If you can't answer that question, you don't understand the product. And if you don't understand the product, you could be the product.$$),
      jsonb_build_object('id','df-3-block-2','type','paragraph','order',2,'text',$$Yield in DeFi

DeFi removes the middleman. You deposit 1,000 USDC into a lending protocol → Protocol lends to borrowers at 5-10% → Smart contract takes a small protocol fee (0.1-1%) → The rest goes directly to lenders: 3-8%.

That's why DeFi yields are typically higher than bank savings rates. You're cutting out the middleman and keeping more of the interest.$$),
      jsonb_build_object('id','df-3-block-3','type','paragraph','order',3,'text',$$The Different Types of Yield

1. Lending Yield (What Your USDC Is Doing) — source: borrowers paying interest. Risk: Low-moderate. Typical: 3-8% APY.
2. Liquidity Provision — source: traders paying fees. Risk: Moderate. Typical: 5-20% APY.
3. Staking — source: network inflation. Risk: Low. Typical: 6-8% APY.
4. Incentive / Emission Rewards — source: protocol's token treasury. Risk: High. Often unsustainable.

LockedIn uses type 1 (lending yield) — sustainable because borrowers pay real interest.$$),
      jsonb_build_object('id','df-3-block-4','type','paragraph','order',4,'text',$$APY vs. APR: APR = simple interest (5% on $1,000 = $50/year). APY = compound interest (5% on $1,000 = ~$51.27/year, interest on interest). Most DeFi protocols quote APY.

How LockedIn's Yield Works: All users' locked USDC → combined pool → DeFi lending → 3-8% APY → Ichor reward pool → LockedIn takes 10-20% fee → Rest available to users via Ichor.$$),
      jsonb_build_object('id','df-3-block-5','type','callout','order',5,'text',$$Quick Recap: Always ask "where does the yield come from?" DeFi yields are higher because there's no middleman. LockedIn uses lending yield — sustainable and real. APY = compound interest rate. LockedIn takes 10-20% of yield as revenue. The rest funds your Ichor rewards.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-3-q1','type','mcq','prompt',$$Why are DeFi lending yields typically higher than bank savings rates?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-3-q1-opt-1','text','DeFi is riskier, so it pays more to compensate'),
        jsonb_build_object('id','df-3-q1-opt-2','text','There''s no bank in the middle taking most of the interest'),
        jsonb_build_object('id','df-3-q1-opt-3','text','DeFi uses fake money so it can offer more')
      ))
    )
  );

  -- df-4 payload
  v_df4_payload := jsonb_build_object(
    'id','df-4','courseId','defi-how-money-earns','moduleId','defi-module-core','title','The DeFi Protocols Your Money Uses','order',4,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-4-block-1','type','paragraph','order',1,'text',$$Meet Kamino and Marginfi

Your locked USDC is currently deposited in real DeFi protocols on Solana. Kamino is a lending and liquidity platform — one of Solana's largest lending protocols. Battle-tested, audited, transparent.$$),
      jsonb_build_object('id','df-4-block-2','type','paragraph','order',2,'text',$$Marginfi is another lending protocol on Solana. Why two? Diversification — don't put all your eggs in one basket. LockedIn reduces risk, optimizes rates, and avoids concentration.$$),
      jsonb_build_object('id','df-4-block-3','type','paragraph','order',3,'text',$$Jupiter is a decentralized exchange aggregator — finds the best swap rates across all Solana trading pools. It's the highway your money uses when tokens need to move.$$),
      jsonb_build_object('id','df-4-block-4','type','code','order',4,'text',$$How It All Fits Together:

                    YOUR LOCKED USDC
                          │
                LockedIn Smart Contract
                     │         │
                ┌────┘         └────┐
                ▼                   ▼
           ┌─────────┐       ┌───────────┐
           │  KAMINO  │       │ MARGINFI  │
           │ Lending  │       │ Lending   │
           │  Pool    │       │  Pool     │
           └────┬─────┘       └────┬──────┘
                │                   │
                └──────┐   ┌───────┘
                       ▼   ▼
                 Yield flows back
                       │
                LockedIn Smart Contract
                │              │
          LockedIn fee    Ichor Reward Pool
          (10-20%)             │
                          Your Ichor
                               │
                       Jupiter (swap layer)
                               │
                          USDC payout$$),
      jsonb_build_object('id','df-4-block-5','type','callout','order',5,'text',$$Quick Recap: Kamino and Marginfi are lending protocols — your USDC earns yield there. Two protocols = diversification. Jupiter handles swaps. All smart contracts — automated, transparent, verifiable on-chain.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-4-q1','type','mcq','prompt',$$Why does LockedIn split your USDC across multiple DeFi protocols instead of using just one?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-4-q1-opt-1','text','It''s cheaper'),
        jsonb_build_object('id','df-4-q1-opt-2','text','To diversify risk and optimize for the best rates'),
        jsonb_build_object('id','df-4-q1-opt-3','text','Because each protocol holds a different type of USDC')
      ))
    )
  );

  -- df-5 payload
  v_df5_payload := jsonb_build_object(
    'id','df-5','courseId','defi-how-money-earns','moduleId','defi-module-core','title','Risk — The Honest Conversation','order',5,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-5-block-1','type','paragraph','order',1,'text',$$Nothing Is Risk-Free

DeFi is not a savings account. The five risks: 1) Smart contract risk (bugs/exploits — most significant, mitigated by audits and diversification). 2) Interest rate risk (rates fluctuate — normal, not dangerous).$$),
      jsonb_build_object('id','df-5-block-2','type','paragraph','order',2,'text',$$3) Stablecoin risk (USDC depeg — very unlikely, backed by audited reserves). 4) Solana network risk (temporary outages — inconvenience, not fund loss). 5) Regulatory risk (evolving regulations — long-term, not sudden).$$),
      jsonb_build_object('id','df-5-block-3','type','paragraph','order',3,'text',$$The honest summary: The most meaningful risk is smart contract risk. Everything else is either unlikely, temporary, or doesn't affect your principal. LockedIn mitigates this by using established, audited protocols and diversifying.$$),
      jsonb_build_object('id','df-5-block-4','type','paragraph','order',4,'text',$$Neither TradFi nor DeFi is risk-free — they have different risk profiles. The Golden Rule: Never put in more than you can afford to lose.$$),
      jsonb_build_object('id','df-5-block-5','type','callout','order',5,'text',$$Quick Recap: DeFi is NOT risk-free. Most significant risk: smart contract exploits. LockedIn mitigates with audited protocols and diversification. Interest rates fluctuate normally. USDC very likely stays at $1. Never invest more than you can afford to lose.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-5-q1','type','mcq','prompt',$$What is the most significant risk in DeFi?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-5-q1-opt-1','text','Solana going offline'),
        jsonb_build_object('id','df-5-q1-opt-2','text','A bug in a smart contract that could be exploited'),
        jsonb_build_object('id','df-5-q1-opt-3','text','Interest rates changing')
      ))
    )
  );

  -- df-6 payload
  v_df6_payload := jsonb_build_object(
    'id','df-6','courseId','defi-how-money-earns','moduleId','defi-module-core','title','The DeFi Ecosystem — What Else Is Out There','order',6,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-6-block-1','type','paragraph','order',1,'text',$$Beyond Lending — DeFi categories: 1) Lending & Borrowing (what you know). 2) DEXs — swap tokens via liquidity pools (Jupiter, Raydium, Orca).$$),
      jsonb_build_object('id','df-6-block-2','type','paragraph','order',2,'text',$$3) Liquid Staking — stake SOL, get a receipt token to use elsewhere (Marinade, Jito). 4) Yield Aggregators — auto-optimize across protocols. 5) Stablecoins & Payments.$$),
      jsonb_build_object('id','df-6-block-3','type','paragraph','order',3,'text',$$Composability = DeFi protocols plug into each other like LEGO blocks. Stake SOL → deposit into lending → borrow USDC → provide liquidity → earn multiple yields simultaneously.$$),
      jsonb_build_object('id','df-6-block-4','type','paragraph','order',4,'text',$$DeFi on Solana handles billions in TVL, millions of daily transactions. You don't need to use everything — just knowing the landscape is enough.$$),
      jsonb_build_object('id','df-6-block-5','type','callout','order',5,'text',$$Quick Recap: DeFi has many categories beyond lending. Composability = LEGO blocks. You're already using lending through LockedIn. The ecosystem handles billions. A self-custody wallet opens the door to all of it.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-6-q1','type','mcq','prompt',$$What does "composability" mean in DeFi?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-6-q1-opt-1','text','Smart contracts can be broken down into smaller pieces'),
        jsonb_build_object('id','df-6-q1-opt-2','text','DeFi protocols can plug into each other like LEGO blocks'),
        jsonb_build_object('id','df-6-q1-opt-3','text','You need to use all protocols together for them to work')
      ))
    )
  );

  -- df-7 payload
  v_df7_payload := jsonb_build_object(
    'id','df-7','courseId','defi-how-money-earns','moduleId','defi-module-core','title','DeFi vs. TradFi — The Bigger Picture','order',7,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-7-block-1','type','paragraph','order',1,'text',$$Two financial systems side by side. DeFi wins on access, speed, cost, transparency, and yields.$$),
      jsonb_build_object('id','df-7-block-2','type','paragraph','order',2,'text',$$TradFi wins on safety nets, regulation, and consumer protection. Neither is perfect.$$),
      jsonb_build_object('id','df-7-block-3','type','paragraph','order',3,'text',$$Use TradFi for emergency funds and everyday spending. Use DeFi for yield on lockable savings and international transfers. LockedIn bridges both worlds.$$),
      jsonb_build_object('id','df-7-block-4','type','paragraph','order',4,'text',$$The future is convergence — banks adopting blockchain rails, DeFi adding compliance. You're already living in this converged world.$$),
      jsonb_build_object('id','df-7-block-5','type','callout','order',5,'text',$$Quick Recap: DeFi wins on access, speed, cost, transparency, yields. TradFi wins on safety, regulation, protection. The future is convergence. LockedIn bridges both worlds — DeFi infrastructure, TradFi-like experience.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id','df-7-q1','type','mcq','prompt',$$What is DeFi's biggest advantage over traditional finance?$$,'options',jsonb_build_array(
        jsonb_build_object('id','df-7-q1-opt-1','text','It''s completely risk-free'),
        jsonb_build_object('id','df-7-q1-opt-2','text','It removes middlemen, giving users more access, transparency, and better rates'),
        jsonb_build_object('id','df-7-q1-opt-3','text','It''s regulated by governments')
      ))
    )
  );

  -- df-8 payload
  v_df8_payload := jsonb_build_object(
    'id','df-8','courseId','defi-how-money-earns','moduleId','defi-module-core','title','Your DeFi Roadmap — What You Can Do Next','order',8,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object('id','df-8-block-1','type','paragraph','order',1,'text',$$What You Now Know — Over two courses you've learned blockchain, wallets, transactions, smart contracts, tokens, security, self-custody, DeFi, lending, yield, protocols, risks, and the ecosystem. You understand more about DeFi than most daily users.$$),
      jsonb_build_object('id','df-8-block-2','type','paragraph','order',2,'text',$$Three Paths: 1) Stay the Course — keep using LockedIn as-is. 2) Explore with Training Wheels — self-custody wallet, small DeFi experiments. 3) Go Deep — serious DeFi portfolio management.$$),
      jsonb_build_object('id','df-8-block-3','type','paragraph','order',3,'text',$$Principles: Always ask where yield comes from. Start small. Diversify. Stay updated. Only risk what you can afford to lose.$$),
      jsonb_build_object('id','df-8-block-4','type','paragraph','order',4,'text',$$Your USDC is locked. Your yield is flowing. Your Ichor is brewing. And now you know exactly what every piece of that sentence means.$$),
      jsonb_build_object('id','df-8-block-5','type','callout','order',5,'text',$$DeFi Fundamentals — Completed. You've earned real financial knowledge: how DeFi works, where yield comes from, what the risks are, and how the entire ecosystem fits together. That's financial literacy for the next era.$$,'calloutTone','info')
    ),
    'questions', jsonb_build_array()
  );

  ---------------------------------------------------------------------------
  -- 11. Published module
  ---------------------------------------------------------------------------
  insert into lesson.published_modules (release_id, course_id, module_id, module_order, payload) values
  (
    v_release_id,
    'defi-how-money-earns',
    'defi-module-core',
    1,
    jsonb_build_object(
      'id', 'defi-module-core',
      'courseId', 'defi-how-money-earns',
      'slug', 'defi-core',
      'title', 'DeFi Core',
      'description', 'Core module for Course 2: DeFi — How Your Money Earns Money.',
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
    (v_release_id, 'df-1', 'defi-module-core', v_df1_version_id, 1, v_df1_payload),
    (v_release_id, 'df-2', 'defi-module-core', v_df2_version_id, 2, v_df2_payload),
    (v_release_id, 'df-3', 'defi-module-core', v_df3_version_id, 3, v_df3_payload),
    (v_release_id, 'df-4', 'defi-module-core', v_df4_version_id, 4, v_df4_payload),
    (v_release_id, 'df-5', 'defi-module-core', v_df5_version_id, 5, v_df5_payload),
    (v_release_id, 'df-6', 'defi-module-core', v_df6_version_id, 6, v_df6_payload),
    (v_release_id, 'df-7', 'defi-module-core', v_df7_version_id, 7, v_df7_payload),
    (v_release_id, 'df-8', 'defi-module-core', v_df8_version_id, 8, v_df8_payload);

  ---------------------------------------------------------------------------
  -- 13. Published lesson payloads (with content_hash)
  ---------------------------------------------------------------------------
  insert into lesson.published_lesson_payloads (release_id, lesson_id, payload, content_hash) values
    (v_release_id, 'df-1', v_df1_payload, md5(v_df1_payload::text)),
    (v_release_id, 'df-2', v_df2_payload, md5(v_df2_payload::text)),
    (v_release_id, 'df-3', v_df3_payload, md5(v_df3_payload::text)),
    (v_release_id, 'df-4', v_df4_payload, md5(v_df4_payload::text)),
    (v_release_id, 'df-5', v_df5_payload, md5(v_df5_payload::text)),
    (v_release_id, 'df-6', v_df6_payload, md5(v_df6_payload::text)),
    (v_release_id, 'df-7', v_df7_payload, md5(v_df7_payload::text)),
    (v_release_id, 'df-8', v_df8_payload, md5(v_df8_payload::text));

  raise notice 'Course 2 DeFi — How Your Money Earns Money release complete. Release ID: %', v_release_id;
end;
$seed$;
