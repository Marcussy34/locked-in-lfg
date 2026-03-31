/*  0025_reseed_course1_rich_blocks.sql
    ────────────────────────────────────
    Re-seeds Course 1 (Blockchain & Wallets) lesson_blocks with rich
    variant-enriched JSONB payloads, then rebuilds published_lessons
    and published_lesson_payloads.

    Questions, lesson_versions, and source_attributions are NOT touched.
*/

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
  ---------------------------------------------------------------------------
  -- Idempotency guard: skip if rich blocks already seeded
  ---------------------------------------------------------------------------
  if exists (
    select 1
    from lesson.lesson_blocks lb
    join lesson.lesson_versions lv on lv.id = lb.lesson_version_id
    where lv.lesson_id = 'bw-1'
      and lb.payload ? 'variant'
  ) then
    raise notice 'Rich blocks already seeded — skipping 0025.';
    return;
  end if;

  ---------------------------------------------------------------------------
  -- Look up the existing release
  ---------------------------------------------------------------------------
  select id into v_release_id
  from lesson.publish_releases
  where release_name = 'course1-blockchain-wallets-v1';

  if v_release_id is null then
    raise exception 'Release course1-blockchain-wallets-v1 not found — run 0024 first.';
  end if;

  ---------------------------------------------------------------------------
  -- Look up existing lesson_version IDs
  ---------------------------------------------------------------------------
  select id into v_bw1_version_id from lesson.lesson_versions where lesson_id = 'bw-1' and release_id = v_release_id;
  select id into v_bw2_version_id from lesson.lesson_versions where lesson_id = 'bw-2' and release_id = v_release_id;
  select id into v_bw3_version_id from lesson.lesson_versions where lesson_id = 'bw-3' and release_id = v_release_id;
  select id into v_bw4_version_id from lesson.lesson_versions where lesson_id = 'bw-4' and release_id = v_release_id;
  select id into v_bw5_version_id from lesson.lesson_versions where lesson_id = 'bw-5' and release_id = v_release_id;
  select id into v_bw6_version_id from lesson.lesson_versions where lesson_id = 'bw-6' and release_id = v_release_id;
  select id into v_bw7_version_id from lesson.lesson_versions where lesson_id = 'bw-7' and release_id = v_release_id;
  select id into v_bw8_version_id from lesson.lesson_versions where lesson_id = 'bw-8' and release_id = v_release_id;

  ---------------------------------------------------------------------------
  -- Delete old blocks for all bw-* lesson versions
  ---------------------------------------------------------------------------
  delete from lesson.lesson_blocks where lesson_version_id in (
    v_bw1_version_id, v_bw2_version_id, v_bw3_version_id, v_bw4_version_id,
    v_bw5_version_id, v_bw6_version_id, v_bw7_version_id, v_bw8_version_id
  );

  ---------------------------------------------------------------------------
  -- Delete old published_lesson_payloads and published_lessons
  ---------------------------------------------------------------------------
  delete from lesson.published_lesson_payloads
  where release_id = v_release_id
    and lesson_id in ('bw-1','bw-2','bw-3','bw-4','bw-5','bw-6','bw-7','bw-8');

  delete from lesson.published_lessons
  where release_id = v_release_id
    and lesson_id in ('bw-1','bw-2','bw-3','bw-4','bw-5','bw-6','bw-7','bw-8');

  ---------------------------------------------------------------------------
  -- INSERT NEW RICH BLOCKS
  ---------------------------------------------------------------------------

  -- ========================================================================
  -- bw-1: The Problem That Started Everything
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw1_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-1-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', $$Before We Talk Tech, Let's Talk Trust

Every time you swipe your card, send money through an app, or check your bank balance, you're trusting someone. You trust your bank to hold your money honestly. You trust Visa to move it correctly. You trust PayPal not to freeze your account for no reason.

Most of the time, this works fine. But "most of the time" isn't the same as "always."

Middlemen can say no. Banks can freeze accounts, reject transactions, or close your account entirely — sometimes with no explanation.

They make mistakes. Money gets lost in transfers. Transactions fail. Disputes take weeks.

They can fail. When banks collapse, your savings can vanish. In 2008, millions of people watched their "safe" money disappear.

They charge fees. Every swipe, every transfer, every conversion — someone takes a cut. Those cuts add up to hundreds of billions of dollars a year.

They know everything. Every purchase, every transfer, every balance — your entire financial life is visible to your bank and the companies it shares data with.

In 2008, someone asked: what if we didn't need middlemen?$$
    )
  ),
  (
    v_bw1_version_id, 2, 'callout',
    jsonb_build_object(
      'id', 'bw-1-block-2',
      'type', 'callout',
      'order', 2,
      'variant', 'analogy',
      'title', 'The Village Notebook',
      'text', $$Imagine a small village where everyone trades goods. Instead of trusting one person to keep the record book, every villager keeps an identical copy. When someone makes a payment, everyone writes it down at the same time. If one person tries to cheat, everyone else's copy still has the original record.$$,
      'calloutTone', 'info'
    )
  ),
  (
    v_bw1_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'bw-1-block-3',
      'type', 'paragraph',
      'order', 3,
      'variant', 'concepts',
      'text', $$That's a blockchain. Here's how the analogy maps:$$,
      'items', jsonb_build_array(
        jsonb_build_object('icon', E'\U0001F4D6', 'name', 'The notebook = the blockchain', 'desc', 'A record of every transaction ever made'),
        jsonb_build_object('icon', E'\U0001F4C4', 'name', 'Each page = a block', 'desc', 'Transactions grouped together into batches'),
        jsonb_build_object('icon', E'\U0001F517', 'name', 'The chain = linked pages', 'desc', 'Each new page references the previous one, creating an unbreakable sequence'),
        jsonb_build_object('icon', E'\U0001F5A5', 'name', 'The villagers = validators', 'desc', 'Computers that maintain copies and verify transactions')
      )
    )
  ),
  (
    v_bw1_version_id, 4, 'callout',
    jsonb_build_object(
      'id', 'bw-1-block-4',
      'type', 'callout',
      'order', 4,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$Your locked USDC is on a blockchain right now. It went onto the Solana blockchain — into a smart contract that thousands of computers around the world are verifying. Nobody at LockedIn can touch your money. That's not a marketing promise — that's how the technology works.$$
    )
  );

  -- ========================================================================
  -- bw-2: Solana — The Blockchain Your Money Lives On
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw2_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-2-block-1',
      'type', 'paragraph',
      'order', 1,
      'variant', 'chain-cards',
      'text', '',
      'chains', jsonb_build_array(
        jsonb_build_object('name', 'Bitcoin', 'tagline', 'The Freight Train', 'desc', 'First, most well-known, extremely secure. But slow and expensive. Great for storing value, not great for everyday use.', 'stats', jsonb_build_array('~10 min', '$1–$20/tx'), 'theme', 'btc'),
        jsonb_build_object('name', 'Ethereum', 'tagline', 'The Busy Highway', 'desc', 'Flexible and powerful — smart contracts were popularized here. But congested and expensive during peak times. Where most of DeFi was born.', 'stats', jsonb_build_array('~12 sec', '$5–$50/tx'), 'theme', 'eth'),
        jsonb_build_object('name', 'Solana', 'tagline', 'The Bullet Train', 'desc', 'Fast, incredibly cheap, and built for high throughput. **This is where LockedIn lives, and where your USDC is locked.**', 'stats', jsonb_build_array('~0.4 sec', '~$0.00025/tx'), 'theme', 'sol')
      )
    )
  ),
  (
    v_bw2_version_id, 2, 'callout',
    jsonb_build_object(
      'id', 'bw-2-block-2',
      'type', 'callout',
      'order', 2,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$Every action you take on LockedIn — locking USDC, completing lessons, earning Fuel — is a transaction. On Ethereum, that might cost $5-20 each. On Solana, it costs less than a tenth of a cent. **You don't even notice.**$$
    )
  ),
  (
    v_bw2_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'bw-2-block-3',
      'type', 'paragraph',
      'order', 3,
      'text', $$Who Runs Solana?

Nobody — and everybody. Solana is maintained by thousands of validators around the world. No company, government, or individual controls it. Think of it like Wikipedia: lots of people contribute, there are rules for how content is verified, but no single person owns it.

Validators are computers that process transactions, maintain copies of the blockchain, and vote on which transactions are valid. They earn SOL tokens for their work — that's their incentive to keep the network running honestly.$$
    )
  ),
  (
    v_bw2_version_id, 4, 'paragraph',
    jsonb_build_object(
      'id', 'bw-2-block-4',
      'type', 'paragraph',
      'order', 4,
      'variant', 'concepts',
      'text', $$Everything on Solana is organized into accounts. Think of the blockchain as a giant filing cabinet:$$,
      'items', jsonb_build_array(
        jsonb_build_object('icon', E'\U0001F4C1', 'name', 'Accounts', 'desc', 'Every wallet, every token balance, every program has an account. Accounts store data and are identified by unique addresses.'),
        jsonb_build_object('icon', E'\U0001FA99', 'name', 'Tokens', 'desc', 'Digital assets like **USDC** and **SOL**. Each follows a standard (SPL) so every wallet and app can handle them.'),
        jsonb_build_object('icon', E'\u2699', 'name', 'Programs', 'desc', 'Code deployed to the blockchain that processes transactions. **LockedIn''s smart contract is a Solana program.**'),
        jsonb_build_object('icon', E'\U0001F4DD', 'name', 'Transactions', 'desc', 'Instructions sent to programs. Every action — locking USDC, completing a lesson, earning Fuel — is recorded **permanently**.')
      )
    )
  ),
  (
    v_bw2_version_id, 5, 'paragraph',
    jsonb_build_object(
      'id', 'bw-2-block-5',
      'type', 'paragraph',
      'order', 5,
      'variant', 'kv-grid',
      'items', jsonb_build_array(
        jsonb_build_object('label', 'SOL', 'value', 'Network Fuel', 'desc', 'Pays transaction fees. Price fluctuates.', 'color', 'amber'),
        jsonb_build_object('label', 'USDC', 'value', 'Digital Dollar', 'desc', 'Always $1. Your locked commitment.', 'color', 'green')
      )
    )
  );

  -- ========================================================================
  -- bw-3: Wallets — The Key You Didn't Know You Had
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw3_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-3-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', $$The Big Reveal

You've been using LockedIn for a few days now. Locked USDC. Earned some Fuel. Here's something you might not have thought about: **you have a crypto wallet.**

When you signed in with Google, a Solana wallet was created for you automatically. It's been working behind the scenes — holding your USDC, signing transactions, interacting with the blockchain.

But here's the important thing: a crypto wallet is **not** like the leather wallet in your pocket. It doesn't hold your money. Your money lives on the blockchain. Your wallet is just the **key** that proves you own it.$$
    )
  ),
  (
    v_bw3_version_id, 2, 'callout',
    jsonb_build_object(
      'id', 'bw-3-block-2',
      'type', 'callout',
      'order', 2,
      'variant', 'analogy',
      'title', 'The Locker Analogy',
      'text', $$Imagine a warehouse with millions of see-through lockers. Everyone can walk through and see what's in each locker. But only the person with the right key can open theirs.

The warehouse = the Solana blockchain. Your locker = your account. What's inside = your USDC, SOL, Fuel records. Your key = your wallet.$$,
      'calloutTone', 'info'
    )
  ),
  (
    v_bw3_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'bw-3-block-3',
      'type', 'paragraph',
      'order', 3,
      'variant', 'kv-grid',
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Public Key (Address)', 'value', '7xKX...q3Fp', 'desc', 'Safe to share — like an email address', 'color', 'default'),
        jsonb_build_object('label', 'Private Key', 'value', E'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', 'desc', 'NEVER share — proves you own your wallet', 'color', 'red')
      )
    )
  ),
  (
    v_bw3_version_id, 4, 'paragraph',
    jsonb_build_object(
      'id', 'bw-3-block-4',
      'type', 'paragraph',
      'order', 4,
      'variant', 'flow',
      'text', $$When you lock USDC, here's what happens:$$,
      'steps', jsonb_build_array(
        jsonb_build_object('title', 'LockedIn builds the instruction', 'desc', '"Move 50 USDC from your address to the smart contract"'),
        jsonb_build_object('title', 'Your private key signs it', 'desc', 'Proves it''s really you — like signing a cheque'),
        jsonb_build_object('title', 'Solana network validates', 'desc', 'Valid signature? ✓ Has 50 USDC? ✓'),
        jsonb_build_object('title', 'Done in ~0.4 seconds', 'desc', 'Transaction processed. Permanently recorded.', 'icon', E'\u2713', 'color', 'green')
      )
    )
  );

  -- ========================================================================
  -- bw-4: Transactions — What Happens When You Tap a Button
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw4_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-4-block-1',
      'type', 'paragraph',
      'order', 1,
      'variant', 'flow',
      'text', $$Every tap writes history. Here's what happened when you locked your USDC:$$,
      'steps', jsonb_build_array(
        jsonb_build_object('title', 'You tapped ''Lock''', 'desc', 'LockedIn built the instruction: lock X USDC for 30 days'),
        jsonb_build_object('title', 'Transaction signed', 'desc', 'Your private key authorized the transfer'),
        jsonb_build_object('title', 'Validators confirmed', 'desc', '1,000+ computers verified and recorded the transaction'),
        jsonb_build_object('title', 'Lock account created', 'desc', 'Your USDC is now in the smart contract until the unlock date', 'icon', E'\U0001F512')
      )
    )
  ),
  (
    v_bw4_version_id, 2, 'code',
    jsonb_build_object(
      'id', 'bw-4-block-2',
      'type', 'code',
      'order', 2,
      'variant', 'comparison',
      'headers', jsonb_build_array('', 'Fuel', 'Ichor'),
      'rows', jsonb_build_array(
        jsonb_build_array('What is it?', 'Activity counter', 'Reward counter'),
        jsonb_build_array('Earned by', 'Completing lessons', 'Brewing Fuel'),
        jsonb_build_array('Worth money?', 'No — like XP points', 'Yes — redeemable for USDC'),
        jsonb_build_array('Analogy', 'XP in a game', 'Loyalty points you can cash out')
      )
    )
  ),
  (
    v_bw4_version_id, 3, 'callout',
    jsonb_build_object(
      'id', 'bw-4-block-3',
      'type', 'callout',
      'order', 3,
      'variant', 'analogy',
      'title', 'Gas Fees = Postage Stamps',
      'text', $$Sending a letter costs a stamp — the stamp pays the postal system to deliver your mail. Gas works the same way. Every transaction needs a tiny fee (in SOL) to pay the validators who process it.

On Solana, gas is absurdly cheap: ~$0.00025 per transaction. Your entire month of activity probably costs less than $0.01. And right now, **LockedIn is paying your gas** so you can focus on learning.$$,
      'calloutTone', 'info'
    )
  ),
  (
    v_bw4_version_id, 4, 'callout',
    jsonb_build_object(
      'id', 'bw-4-block-4',
      'type', 'callout',
      'order', 4,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$Transactions are irreversible. That sounds scary, but it's actually a feature: once your USDC is locked, **nobody can unlock it early** — not us, not anyone. Once you earn Ichor, **nobody can take it away**. Every record is permanent and verifiable forever.$$
    )
  );

  -- ========================================================================
  -- bw-5: Smart Contracts — The Code That Guards Your Money
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw5_version_id, 1, 'callout',
    jsonb_build_object(
      'id', 'bw-5-block-1',
      'type', 'callout',
      'order', 1,
      'variant', 'analogy',
      'title', 'Think: Vending Machine',
      'text', $$A vending machine is simple: you put in money, press a button, the machine checks if you paid enough, and dispenses the item. No negotiation. No human involved.

**A smart contract works exactly the same way** — but it lives on the blockchain. Rules written in code, executed automatically, no human can override it.$$,
      'calloutTone', 'info'
    )
  ),
  (
    v_bw5_version_id, 2, 'paragraph',
    jsonb_build_object(
      'id', 'bw-5-block-2',
      'type', 'paragraph',
      'order', 2,
      'text', $$The LockedIn Smart Contract

Here's what the rules look like (simplified):

- **Lock:** Accept USDC, record who locked it, for how long. Cannot be withdrawn early.
- **Fuel:** When a user completes a lesson, add Fuel to their counter.
- **Brewer:** User can burn Fuel to produce Ichor (both counters in the contract).
- **Streak:** Track daily completion. If streak breaks: drain yield, extend lock.
- **Unlock:** When end date reached — return USDC to user's wallet.

These rules are **immutable** — once deployed, nobody can change them.$$
    )
  ),
  (
    v_bw5_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'bw-5-block-3',
      'type', 'paragraph',
      'order', 3,
      'variant', 'concepts',
      'text', $$Smart contracts power almost everything in crypto:$$,
      'items', jsonb_build_array(
        jsonb_build_object('icon', E'\U0001F504', 'name', 'Decentralized Exchange (Jupiter)', 'desc', 'Automatically swaps one token for another at market price'),
        jsonb_build_object('icon', E'\U0001F3E6', 'name', 'Lending (Kamino, Marginfi)', 'desc', 'Lends your tokens, earns interest, manages collateral automatically'),
        jsonb_build_object('icon', E'\U0001F3A8', 'name', 'NFT Marketplace (Magic Eden)', 'desc', 'Holds NFTs in escrow, executes sales when buyer pays'),
        jsonb_build_object('icon', E'\U0001F512', 'name', 'LockedIn', 'desc', 'Locks USDC, manages Fuel/Ichor, enforces streaks and penalties')
      )
    )
  ),
  (
    v_bw5_version_id, 4, 'callout',
    jsonb_build_object(
      'id', 'bw-5-block-4',
      'type', 'callout',
      'order', 4,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$If LockedIn as a company disappeared tomorrow, the smart contract **keeps running**. Your USDC is still locked. Your Fuel is still recorded. When the unlock date arrives, you can claim your funds through another app. The smart contract doesn't need us.$$
    )
  );

  -- ========================================================================
  -- bw-6: Tokens — Not All Digital Money Is the Same
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw6_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-6-block-1',
      'type', 'paragraph',
      'order', 1,
      'variant', 'concepts',
      'text', $$You've encountered several "things" in LockedIn. Some are tokens, some aren't. Let's sort them out:$$,
      'items', jsonb_build_array(
        jsonb_build_object('icon', E'\u26A1', 'name', 'SOL — Network Fuel', 'desc', 'Solana''s native currency. Pays transaction fees. Price fluctuates like a stock. LockedIn covers your SOL costs.'),
        jsonb_build_object('icon', E'\U0001F4B5', 'name', 'USDC — Digital Dollar', 'desc', 'A stablecoin pegged to $1. Backed by real USD reserves held by Circle. This is what you locked.'),
        jsonb_build_object('icon', E'\U0001F525', 'name', 'Fuel — Effort Score', 'desc', 'A counter in the smart contract. Earned by completing lessons. Burns into Ichor. **No cash value** — like XP points.'),
        jsonb_build_object('icon', E'\u2697', 'name', 'Ichor — Redeemable Reward', 'desc', 'A counter in the smart contract. Brewed from Fuel. **Redeemable for USDC** from the yield pool.')
      )
    )
  ),
  (
    v_bw6_version_id, 2, 'code',
    jsonb_build_object(
      'id', 'bw-6-block-2',
      'type', 'code',
      'order', 2,
      'variant', 'comparison',
      'headers', jsonb_build_array('', 'SOL', 'USDC', 'Fuel', 'Ichor'),
      'rows', jsonb_build_array(
        jsonb_build_array('Type', 'SPL Token', 'SPL Token', 'Counter', 'Counter'),
        jsonb_build_array('In your wallet?', 'Yes', 'Yes', 'No — in contract', 'No — in contract'),
        jsonb_build_array('Transferable?', 'Yes', 'Yes', 'No', 'No'),
        jsonb_build_array('Worth money?', 'Yes (fluctuates)', 'Yes ($1 always)', 'No', 'Yes (redeemable)')
      )
    )
  ),
  (
    v_bw6_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'bw-6-block-3',
      'type', 'paragraph',
      'order', 3,
      'variant', 'flow',
      'text', $$Your effort becomes points becomes rewards becomes real money:$$,
      'steps', jsonb_build_array(
        jsonb_build_object('title', 'Complete lessons', 'desc', 'Your daily effort', 'icon', E'\U0001F4DA'),
        jsonb_build_object('title', 'Earn Fuel', 'desc', 'Activity counter — tracked in the smart contract', 'icon', E'\u26A1', 'color', 'amber'),
        jsonb_build_object('title', 'Brew into Ichor', 'desc', 'The Brewer converts Fuel into redeemable rewards', 'icon', E'\u2697', 'color', '#9945FF'),
        jsonb_build_object('title', 'Redeem for USDC', 'desc', 'Smart contract burns Ichor and sends USDC to your wallet', 'icon', E'\U0001F4B0', 'color', 'green')
      )
    )
  ),
  (
    v_bw6_version_id, 4, 'callout',
    jsonb_build_object(
      'id', 'bw-6-block-4',
      'type', 'callout',
      'order', 4,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$The entire pipeline — from lessons to dollars — is automated by the smart contract. No human in the loop. **Show up, learn, earn.**$$
    )
  );

  -- ========================================================================
  -- bw-7: Security — The Lesson That Could Save You Thousands
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw7_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-7-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', $$Why Scammers Love Crypto

In traditional finance, if someone steals your credit card, you call the bank. They reverse the charge. In crypto, **transactions can't be reversed.** If you send money to a scammer or sign a malicious transaction, nobody can undo it.

That sounds scary. But almost every crypto scam follows the same playbook. Learn the playbook, and you're safe.$$
    )
  ),
  (
    v_bw7_version_id, 2, 'callout',
    jsonb_build_object(
      'id', 'bw-7-block-2',
      'type', 'callout',
      'order', 2,
      'variant', 'scam',
      'number', 1,
      'title', 'Give Me Your Seed Phrase',
      'example', 'Hi, I''m from LockedIn support. We need your seed phrase to fix an issue with your account. Please enter it at lockedin-verify.com',
      'exampleSender', 'LockedIn_Support_Official',
      'rule', 'No legitimate person, company, or app will **ever** ask for your seed phrase or private key. Not LockedIn. Not Phantom. Not anyone. Ever.',
      'calloutTone', 'warning'
    )
  ),
  (
    v_bw7_version_id, 3, 'callout',
    jsonb_build_object(
      'id', 'bw-7-block-3',
      'type', 'callout',
      'order', 3,
      'variant', 'scam',
      'number', 2,
      'title', 'Phishing & Fake Websites',
      'example', 'You search for "Phantom wallet" and click the first result — phantomm.app (two m''s). The site looks identical. You enter your seed phrase. They now own your wallet.',
      'exampleSender', 'Google Ad',
      'rule', 'Bookmark trusted sites. Check URLs character by character. When in doubt, type the URL manually.',
      'calloutTone', 'warning'
    )
  ),
  (
    v_bw7_version_id, 4, 'paragraph',
    jsonb_build_object(
      'id', 'bw-7-block-4',
      'type', 'paragraph',
      'order', 4,
      'variant', 'checklist',
      'items', jsonb_build_array(
        '**Never share your private key or seed phrase.** This is rule zero. If nobody has your key, nobody can take your money.',
        '**Verify, don''t trust.** Check URLs carefully. If "support" contacts you, go to the real site yourself.',
        '**Start small.** First time using a new app? Send $1 first. Verify it works. Then send the rest.',
        '**If it sounds too good to be true, it is.** 100% returns? Free money? Scam. Every time.',
        '**Read before you sign.** Your wallet shows every transaction before it executes. Read it. If anything looks off, reject.'
      )
    )
  ),
  (
    v_bw7_version_id, 5, 'callout',
    jsonb_build_object(
      'id', 'bw-7-block-5',
      'type', 'callout',
      'order', 5,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$Your **Google account security = your wallet security** right now. Use a strong password. Enable 2-factor authentication. If someone gets into your Google, they get into everything tied to it — including your LockedIn wallet.$$
    )
  );

  -- ========================================================================
  -- bw-8: Taking the Keys — Self-Custody and What Comes Next
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_bw8_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'bw-8-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', $$The Training Wheels Come Off

Over the past 7 lessons, you went from "what's a blockchain?" to understanding how your money works on-chain. You didn't just learn theory — your USDC is locked, your Fuel is growing, your transactions are on-chain.

Now comes the optional final step: **taking full control of your wallet.** This means holding your own private key, signing your own transactions, and having no middleman between you and the blockchain.$$
    )
  ),
  (
    v_bw8_version_id, 2, 'paragraph',
    jsonb_build_object(
      'id', 'bw-8-block-2',
      'type', 'paragraph',
      'order', 2,
      'variant', 'kv-grid',
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Privy (Current)', 'value', 'Google Login', 'desc', 'Convenient. Key managed by Privy. Recovery via Google.', 'color', 'default'),
        jsonb_build_object('label', 'Self-Custody', 'value', 'Your Keys', 'desc', 'Full control. You hold the private key. Recovery via seed phrase only.', 'color', 'amber')
      )
    )
  ),
  (
    v_bw8_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'bw-8-block-3',
      'type', 'paragraph',
      'order', 3,
      'variant', 'flow',
      'text', $$How to graduate to self-custody:$$,
      'steps', jsonb_build_array(
        jsonb_build_object('title', 'Export your key from Privy', 'desc', E'Settings \u2192 Wallet \u2192 Export \u2192 Authenticate with Google'),
        jsonb_build_object('title', 'Download Phantom wallet', 'desc', 'Browser extension from phantom.app or mobile app'),
        jsonb_build_object('title', 'Import your wallet', 'desc', E'Choose "Import existing wallet" \u2192 enter your exported key'),
        jsonb_build_object('title', 'Back up your seed phrase', 'desc', 'Write it on physical paper. Store safely. NEVER screenshot it.'),
        jsonb_build_object('title', 'Get a little SOL', 'desc', 'Buy in Phantom or transfer from an exchange. 0.05 SOL is enough for months.'),
        jsonb_build_object('title', 'Connect to LockedIn', 'desc', E'"Connect Wallet" \u2192 Phantom popup \u2192 Approve. Everything works the same.', 'icon', E'\u2713', 'color', 'green')
      )
    )
  ),
  (
    v_bw8_version_id, 4, 'callout',
    jsonb_build_object(
      'id', 'bw-8-block-4',
      'type', 'callout',
      'order', 4,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', $$You started with a Google login and a vague understanding that "crypto is a thing." Now you know blockchains, wallets, transactions, smart contracts, tokens, and security. **Your USDC is locked. Your Brewer is burning. Your Ichor is flowing. And now you know exactly what all of that means.**$$
    )
  );

  ---------------------------------------------------------------------------
  -- REBUILD PUBLISHED PAYLOADS
  ---------------------------------------------------------------------------

  -- Helper: build each payload from fresh blocks + existing questions
  -- bw-1 payload
  v_bw1_payload := jsonb_build_object(
    'id','bw-1','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title','The Problem That Started Everything','order',1,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw1_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw1_version_id
    )
  );

  -- bw-2 payload
  v_bw2_payload := jsonb_build_object(
    'id','bw-2','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Solana \u2014 The Blockchain Your Money Lives On','order',2,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw2_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw2_version_id
    )
  );

  -- bw-3 payload
  v_bw3_payload := jsonb_build_object(
    'id','bw-3','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Wallets \u2014 The Key You Didn''t Know You Had','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw3_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw3_version_id
    )
  );

  -- bw-4 payload
  v_bw4_payload := jsonb_build_object(
    'id','bw-4','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Transactions \u2014 What Happens When You Tap a Button','order',4,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw4_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw4_version_id
    )
  );

  -- bw-5 payload
  v_bw5_payload := jsonb_build_object(
    'id','bw-5','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Smart Contracts \u2014 The Code That Guards Your Money','order',5,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw5_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw5_version_id
    )
  );

  -- bw-6 payload
  v_bw6_payload := jsonb_build_object(
    'id','bw-6','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Tokens \u2014 Not All Digital Money Is the Same','order',6,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw6_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw6_version_id
    )
  );

  -- bw-7 payload
  v_bw7_payload := jsonb_build_object(
    'id','bw-7','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Security \u2014 The Lesson That Could Save You Thousands','order',7,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw7_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw7_version_id
    )
  );

  -- bw-8 payload
  v_bw8_payload := jsonb_build_object(
    'id','bw-8','courseId','blockchain-wallets','moduleId','blockchain-wallets-module-core',
    'title',E'Taking the Keys \u2014 Self-Custody and What Comes Next','order',8,'version',1,'releaseId',v_release_id::text,
    'blocks', (
      select jsonb_agg(lb.payload order by lb.block_order)
      from lesson.lesson_blocks lb
      where lb.lesson_version_id = v_bw8_version_id
    ),
    'questions', (
      select coalesce(jsonb_agg(
        case when q.question_type = 'mcq' then
          jsonb_build_object(
            'id', q.id, 'type', q.question_type, 'prompt', q.prompt,
            'options', (
              select jsonb_agg(
                jsonb_build_object('id', q.id || '-opt-' || qo.option_order, 'text', qo.option_text)
                order by qo.option_order
              )
              from lesson.question_options qo where qo.question_id = q.id
            )
          )
        else
          jsonb_build_object('id', q.id, 'type', q.question_type, 'prompt', q.prompt)
        end
        order by q.question_order
      ), '[]'::jsonb)
      from lesson.questions q
      where q.lesson_version_id = v_bw8_version_id
    )
  );

  ---------------------------------------------------------------------------
  -- Re-insert published_lessons
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
  -- Re-insert published_lesson_payloads (with content_hash)
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

  raise notice 'Rich blocks re-seed complete for Course 1. Release ID: %', v_release_id;
end;
$seed$;
