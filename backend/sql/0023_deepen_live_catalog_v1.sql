create extension if not exists pgcrypto;

do $seed$
declare
  v_latest_release_id uuid;
  v_release_id uuid;

  v_sf_module_payload jsonb;
  v_anchor_module_payload jsonb;
  v_rust_module_payload jsonb;
  v_defi_module_payload jsonb;

  v_sf1_payload jsonb;
  v_sf2_payload jsonb;
  v_ad1_payload jsonb;
  v_rs1_payload jsonb;
  v_dp1_payload jsonb;

  v_sf1_version_id uuid;
  v_sf2_version_id uuid;
  v_ad1_version_id uuid;
  v_rs1_version_id uuid;
  v_dp1_version_id uuid;

  v_sf3_version_id uuid;
  v_sf4_version_id uuid;
  v_sf5_version_id uuid;
  v_ad2_version_id uuid;
  v_ad3_version_id uuid;
  v_rs2_version_id uuid;
  v_rs3_version_id uuid;
  v_dp2_version_id uuid;
  v_dp3_version_id uuid;

  v_sf3_payload jsonb;
  v_sf4_payload jsonb;
  v_sf5_payload jsonb;
  v_ad2_payload jsonb;
  v_ad3_payload jsonb;
  v_rs2_payload jsonb;
  v_rs3_payload jsonb;
  v_dp2_payload jsonb;
  v_dp3_payload jsonb;
begin
  if exists (
    select 1
    from lesson.publish_releases
    where release_name = 'dev-catalog-deepen-v1'
  ) then
    raise notice 'Seed skipped: dev-catalog-deepen-v1 already exists.';
    return;
  end if;

  select id into v_latest_release_id
  from lesson.publish_releases
  order by created_at desc
  limit 1;

  if v_latest_release_id is null then
    raise exception 'No published release found. Apply prior seeds first.';
  end if;

  select payload into v_sf_module_payload
  from lesson.published_modules
  where release_id = v_latest_release_id
    and module_id = 'solana-fundamentals-module-core';

  select payload into v_anchor_module_payload
  from lesson.published_modules
  where release_id = v_latest_release_id
    and module_id = 'anchor-dev-module-core';

  select payload into v_rust_module_payload
  from lesson.published_modules
  where release_id = v_latest_release_id
    and module_id = 'rust-solana-module-core';

  select payload into v_defi_module_payload
  from lesson.published_modules
  where release_id = v_latest_release_id
    and module_id = 'defi-protocols-module-core';

  select payload, lesson_version_id into v_sf1_payload, v_sf1_version_id
  from lesson.published_lessons
  where release_id = v_latest_release_id and lesson_id = 'sf-1';

  select payload, lesson_version_id into v_sf2_payload, v_sf2_version_id
  from lesson.published_lessons
  where release_id = v_latest_release_id and lesson_id = 'sf-2';

  select payload, lesson_version_id into v_ad1_payload, v_ad1_version_id
  from lesson.published_lessons
  where release_id = v_latest_release_id and lesson_id = 'ad-1';

  select payload, lesson_version_id into v_rs1_payload, v_rs1_version_id
  from lesson.published_lessons
  where release_id = v_latest_release_id and lesson_id = 'rs-1';

  select payload, lesson_version_id into v_dp1_payload, v_dp1_version_id
  from lesson.published_lessons
  where release_id = v_latest_release_id and lesson_id = 'dp-1';

  if v_sf1_payload is null or v_sf2_payload is null or v_ad1_payload is null or v_rs1_payload is null or v_dp1_payload is null then
    raise exception 'Expected starter lesson payloads were not found in the latest release.';
  end if;

  update lesson.courses
  set estimated_minutes = case id
    when 'solana-fundamentals' then 90
    when 'anchor-dev' then 45
    when 'rust-solana' then 45
    when 'defi-protocols' then 45
    else estimated_minutes
  end,
  updated_at = now()
  where id in ('solana-fundamentals', 'anchor-dev', 'rust-solana', 'defi-protocols');

  insert into lesson.lessons (id, slug, title) values
    ('sf-3', 'transactions-and-instructions', 'Transactions & Instructions'),
    ('sf-4', 'programs-and-the-runtime', 'Programs & the Runtime'),
    ('sf-5', 'wallets-and-keypairs', 'Wallets & Keypairs'),
    ('ad-2', 'accounts-and-constraints', 'Accounts & Constraints'),
    ('ad-3', 'testing-with-anchor', 'Testing with Anchor'),
    ('rs-2', 'structs-and-enums', 'Structs & Enums'),
    ('rs-3', 'error-handling', 'Error Handling'),
    ('dp-2', 'lending-and-borrowing', 'Lending & Borrowing'),
    ('dp-3', 'yield-farming-and-staking', 'Yield Farming & Staking')
  on conflict (id) do update set
    title = excluded.title,
    updated_at = now();

  insert into lesson.module_lessons (module_id, lesson_id, lesson_order, is_required) values
    ('solana-fundamentals-module-core', 'sf-3', 3, true),
    ('solana-fundamentals-module-core', 'sf-4', 4, true),
    ('solana-fundamentals-module-core', 'sf-5', 5, true),
    ('anchor-dev-module-core', 'ad-2', 2, true),
    ('anchor-dev-module-core', 'ad-3', 3, true),
    ('rust-solana-module-core', 'rs-2', 2, true),
    ('rust-solana-module-core', 'rs-3', 3, true),
    ('defi-protocols-module-core', 'dp-2', 2, true),
    ('defi-protocols-module-core', 'dp-3', 3, true)
  on conflict (module_id, lesson_id) do update set
    lesson_order = excluded.lesson_order,
    is_required = excluded.is_required;

  insert into lesson.publish_releases (release_name, notes, created_by)
  values (
    'dev-catalog-deepen-v1',
    'Expands the live starter catalog to the full mock lesson set for the current four courses.',
    'seed-script'
  )
  returning id into v_release_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('sf-3', 1, 'published', v_release_id, 'Initial Transactions & Instructions lesson.', md5('sf-3-v1'), 'seed-script', now())
  returning id into v_sf3_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('sf-4', 1, 'published', v_release_id, 'Initial Programs & Runtime lesson.', md5('sf-4-v1'), 'seed-script', now())
  returning id into v_sf4_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('sf-5', 1, 'published', v_release_id, 'Initial Wallets & Keypairs lesson.', md5('sf-5-v1'), 'seed-script', now())
  returning id into v_sf5_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('ad-2', 1, 'published', v_release_id, 'Initial Accounts & Constraints lesson.', md5('ad-2-v1'), 'seed-script', now())
  returning id into v_ad2_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('ad-3', 1, 'published', v_release_id, 'Initial Testing with Anchor lesson.', md5('ad-3-v1'), 'seed-script', now())
  returning id into v_ad3_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('rs-2', 1, 'published', v_release_id, 'Initial Structs & Enums lesson.', md5('rs-2-v1'), 'seed-script', now())
  returning id into v_rs2_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('rs-3', 1, 'published', v_release_id, 'Initial Error Handling lesson.', md5('rs-3-v1'), 'seed-script', now())
  returning id into v_rs3_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('dp-2', 1, 'published', v_release_id, 'Initial Lending & Borrowing lesson.', md5('dp-2-v1'), 'seed-script', now())
  returning id into v_dp2_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('dp-3', 1, 'published', v_release_id, 'Initial Yield Farming & Staking lesson.', md5('dp-3-v1'), 'seed-script', now())
  returning id into v_dp3_version_id;

  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_sf3_version_id, 1, 'paragraph',
    jsonb_build_object('id','sf-3-block-1','type','paragraph','order',1,'text',$$Transactions are the way users interact with the Solana network. A transaction is a bundle of one or more instructions, each targeting a specific on-chain program. Transactions are atomic — either all instructions succeed or none of them do.

Each instruction specifies: the program to call, the accounts it needs to read or write, and an instruction data payload. A transaction also includes a recent blockhash (to prevent replay attacks) and one or more signatures from the accounts that authorize the transaction.

Solana transactions have a size limit of 1232 bytes. Transaction fees on Solana are deterministic and based on the number of signatures required, not on computational complexity like Ethereum gas fees. The base fee is 5000 lamports per signature (0.000005 SOL).$$)
  ),
  (
    v_sf4_version_id, 1, 'paragraph',
    jsonb_build_object('id','sf-4-block-1','type','paragraph','order',1,'text',$$Programs on Solana are the equivalent of smart contracts on other blockchains. They are compiled to BPF (Berkeley Packet Filter) bytecode and deployed to the network. Programs are stateless and process instructions by reading from and writing to accounts passed in by the caller.

Solana has several built-in native programs: the System Program (creates accounts and transfers SOL), the Token Program (manages SPL tokens), and the Associated Token Account Program (creates deterministic token accounts). Most DeFi and NFT applications build on top of these native programs.

The Solana runtime enforces strict rules: programs can only modify accounts they own, accounts must have enough lamports to be rent-exempt, and cross-program invocations (CPIs) allow programs to call other programs while maintaining security guarantees.$$)
  ),
  (
    v_sf5_version_id, 1, 'paragraph',
    jsonb_build_object('id','sf-5-block-1','type','paragraph','order',1,'text',$$A Solana wallet is fundamentally a keypair — a public key (your address) and a private key (your secret). The public key is a 32-byte Ed25519 key that serves as your on-chain identity. The private key is used to sign transactions and should never be shared.

Wallets can be generated from a seed phrase (also called a mnemonic), which is typically 12 or 24 words following the BIP-39 standard. This seed phrase can deterministically generate multiple keypairs using derivation paths, allowing one backup phrase to control many accounts.

Popular Solana wallets include Phantom, Solflare, and Backpack. For developers, the Solana CLI provides a file-system wallet, and the @solana/web3.js library offers programmatic keypair generation and transaction signing.$$)
  ),
  (
    v_ad2_version_id, 1, 'paragraph',
    jsonb_build_object('id','ad-2-block-1','type','paragraph','order',1,'text',$$In Anchor, every instruction handler receives a context (Context<T>) where T is a struct that derives the Accounts trait. Each field in this struct represents an account the instruction needs to read or write.

Anchor provides constraint attributes like #[account(init, payer = user, space = 8 + 32)] to declare how accounts should be validated. The init constraint creates and initializes a new account, mut marks an account as mutable, and has_one checks ownership relationships.

Program Derived Addresses (PDAs) are commonly used as accounts with deterministic addresses. Anchor makes creating PDAs easy with seeds and bump constraints: #[account(seeds = [b"vault", user.key().as_ref()], bump)].$$)
  ),
  (
    v_ad3_version_id, 1, 'paragraph',
    jsonb_build_object('id','ad-3-block-1','type','paragraph','order',1,'text',$$Anchor includes a built-in testing framework that lets you write integration tests in TypeScript. Tests run against a local Solana validator (solana-test-validator) or Anchor's built-in BankRun environment.

The anchor test command compiles your program, deploys it to localnet, and runs your TypeScript test suite. Tests use the @coral-xyz/anchor library to create a Provider (connection + wallet) and a Program instance that maps to your IDL.

You call program methods like: await program.methods.initialize().accounts({ myAccount: pda }).rpc(). Anchor auto-serializes arguments and deserializes return values based on the IDL. You can also use program.account.myAccount.fetch(pda) to read account data.$$)
  ),
  (
    v_rs2_version_id, 1, 'paragraph',
    jsonb_build_object('id','rs-2-block-1','type','paragraph','order',1,'text',$$Structs are Rust's way of creating custom data types by grouping related fields together. They are heavily used in Solana programs to define account data. You define a struct with the struct keyword and can add methods using impl blocks.

Enums in Rust are more powerful than in most languages — each variant can hold different data. This makes them perfect for modeling instruction types or state machines in Solana programs. The match keyword lets you exhaustively handle every variant.

Deriving traits like Clone, Debug, and BorshSerialize/BorshDeserialize is essential for Solana. Borsh (Binary Object Representation Serializer for Hashing) is the serialization format used by Solana programs to encode/decode account data.$$)
  ),
  (
    v_rs3_version_id, 1, 'paragraph',
    jsonb_build_object('id','rs-3-block-1','type','paragraph','order',1,'text',$$Rust uses the Result<T, E> type for error handling instead of exceptions. A Result is either Ok(value) on success or Err(error) on failure. The ? operator propagates errors up the call stack automatically.

In Solana programs, errors are returned as ProgramError or custom error enums. Anchor provides the #[error_code] macro to define custom errors with messages: #[error_code] enum MyError { #[msg("Insufficient funds")] InsufficientFunds }.

The require! macro in Anchor is a convenient way to validate conditions: require!(amount > 0, MyError::InsufficientFunds). This replaces verbose if/else error returns and makes your code more readable.$$)
  ),
  (
    v_dp2_version_id, 1, 'paragraph',
    jsonb_build_object('id','dp-2-block-1','type','paragraph','order',1,'text',$$Lending protocols allow users to deposit assets and earn interest, while borrowers can take loans against their collateral. The interest rates are typically determined algorithmically based on supply and demand (utilization rate).

Over-collateralization is key: borrowers must deposit more value than they borrow. If the collateral value drops below a threshold (the liquidation ratio), anyone can liquidate the position by repaying the loan and claiming the discounted collateral.

On Solana, major lending protocols include Solend, MarginFi, and Kamino. These protocols use oracle price feeds (like Pyth or Switchboard) to track real-time asset prices for collateral valuation and liquidation triggers.$$)
  ),
  (
    v_dp3_version_id, 1, 'paragraph',
    jsonb_build_object('id','dp-3-block-1','type','paragraph','order',1,'text',$$Yield farming is the practice of moving assets between different DeFi protocols to maximize returns. Users provide liquidity to pools and earn trading fees plus additional token rewards (liquidity mining). The combined return is expressed as APY (Annual Percentage Yield).

Liquid staking lets you stake SOL while maintaining liquidity. Protocols like Marinade (mSOL) and Jito (jitoSOL) give you a derivative token that represents your staked SOL plus accumulated rewards. You can use these tokens in other DeFi protocols.

Impermanent loss is a key risk in yield farming. It occurs when the price ratio of your deposited tokens changes compared to when you entered the pool. The larger the price divergence, the greater the impermanent loss relative to simply holding the tokens.$$)
  );

  insert into lesson.questions (id, lesson_version_id, question_order, question_type, prompt, correct_answer, metadata) values
    ('sf-3-q1', v_sf3_version_id, 1, 'mcq', $$What happens if one instruction in a Solana transaction fails?$$, $$The entire transaction fails — all instructions are reverted$$, '{}'::jsonb),
    ('sf-3-q2', v_sf3_version_id, 2, 'short_text', $$What is the maximum size of a Solana transaction in bytes?$$, '1232', '{}'::jsonb),
    ('sf-3-q3', v_sf3_version_id, 3, 'mcq', $$Why does a Solana transaction include a recent blockhash?$$, 'To prevent replay attacks', '{}'::jsonb),
    ('sf-4-q1', v_sf4_version_id, 1, 'mcq', $$What bytecode format do Solana programs compile to?$$, 'BPF bytecode', '{}'::jsonb),
    ('sf-4-q2', v_sf4_version_id, 2, 'short_text', $$What is the name of the mechanism that allows Solana programs to call other programs? (abbreviation)$$, 'CPI', '{}'::jsonb),
    ('sf-5-q1', v_sf5_version_id, 1, 'mcq', $$What cryptographic curve does Solana use for keypairs?$$, 'Ed25519', '{}'::jsonb),
    ('sf-5-q2', v_sf5_version_id, 2, 'short_text', $$How many words is a standard Solana seed phrase? (pick either common length)$$, '12', '{}'::jsonb),
    ('sf-5-q3', v_sf5_version_id, 3, 'mcq', $$Which of these is NOT a popular Solana wallet?$$, 'MetaMask', '{}'::jsonb),
    ('ad-2-q1', v_ad2_version_id, 1, 'mcq', $$What does the #[account(init)] constraint do?$$, 'Creates and initializes a new on-chain account', '{}'::jsonb),
    ('ad-2-q2', v_ad2_version_id, 2, 'short_text', $$What type wraps the accounts struct in an Anchor instruction handler?$$, 'Context', '{}'::jsonb),
    ('ad-3-q1', v_ad3_version_id, 1, 'mcq', $$What command compiles, deploys, and runs Anchor tests?$$, 'anchor test', '{}'::jsonb),
    ('ad-3-q2', v_ad3_version_id, 2, 'short_text', $$What method on a Program instance sends a transaction for an instruction?$$, 'rpc', '{}'::jsonb),
    ('rs-2-q1', v_rs2_version_id, 1, 'mcq', $$What serialization format does Solana use for account data?$$, 'Borsh', '{}'::jsonb),
    ('rs-2-q2', v_rs2_version_id, 2, 'short_text', $$What keyword is used to add methods to a struct in Rust?$$, 'impl', '{}'::jsonb),
    ('rs-3-q1', v_rs3_version_id, 1, 'mcq', $$What operator propagates errors automatically in Rust?$$, '?', '{}'::jsonb),
    ('rs-3-q2', v_rs3_version_id, 2, 'short_text', $$What Anchor macro is used to validate a condition and return an error?$$, 'require!', '{}'::jsonb),
    ('dp-2-q1', v_dp2_version_id, 1, 'mcq', $$What happens when a borrower's collateral drops below the liquidation ratio?$$, 'Anyone can liquidate the position', '{}'::jsonb),
    ('dp-2-q2', v_dp2_version_id, 2, 'short_text', $$What Solana oracle provides real-time price feeds for DeFi protocols?$$, 'Pyth', '{}'::jsonb),
    ('dp-3-q1', v_dp3_version_id, 1, 'mcq', $$What is impermanent loss?$$, 'Loss from price divergence of pooled tokens vs holding', '{}'::jsonb),
    ('dp-3-q2', v_dp3_version_id, 2, 'short_text', $$What does APY stand for?$$, 'Annual Percentage Yield', '{}'::jsonb);

  insert into lesson.question_options (question_id, option_order, option_text) values
    ('sf-3-q1', 1, 'Only that instruction is reverted'),
    ('sf-3-q1', 2, 'The entire transaction fails — all instructions are reverted'),
    ('sf-3-q1', 3, 'The remaining instructions still execute'),
    ('sf-3-q1', 4, 'The transaction is retried automatically'),
    ('sf-3-q3', 1, 'To calculate the transaction fee'),
    ('sf-3-q3', 2, 'To prevent replay attacks'),
    ('sf-3-q3', 3, 'To determine which validator processes it'),
    ('sf-3-q3', 4, 'To encrypt the transaction data'),
    ('sf-4-q1', 1, 'EVM bytecode'),
    ('sf-4-q1', 2, 'WebAssembly'),
    ('sf-4-q1', 3, 'BPF bytecode'),
    ('sf-4-q1', 4, 'JVM bytecode'),
    ('sf-5-q1', 1, 'secp256k1'),
    ('sf-5-q1', 2, 'Ed25519'),
    ('sf-5-q1', 3, 'P-256'),
    ('sf-5-q1', 4, 'Curve25519'),
    ('sf-5-q3', 1, 'Phantom'),
    ('sf-5-q3', 2, 'MetaMask'),
    ('sf-5-q3', 3, 'Solflare'),
    ('sf-5-q3', 4, 'Backpack'),
    ('ad-2-q1', 1, 'Initializes a variable in memory'),
    ('ad-2-q1', 2, 'Creates and initializes a new on-chain account'),
    ('ad-2-q1', 3, 'Imports an existing account'),
    ('ad-2-q1', 4, 'Deletes an account'),
    ('ad-3-q1', 1, 'anchor build'),
    ('ad-3-q1', 2, 'anchor deploy'),
    ('ad-3-q1', 3, 'anchor test'),
    ('ad-3-q1', 4, 'anchor run'),
    ('rs-2-q1', 1, 'JSON'),
    ('rs-2-q1', 2, 'MessagePack'),
    ('rs-2-q1', 3, 'Borsh'),
    ('rs-2-q1', 4, 'Protobuf'),
    ('rs-3-q1', 1, '!'),
    ('rs-3-q1', 2, '?'),
    ('rs-3-q1', 3, '&'),
    ('rs-3-q1', 4, '::'),
    ('dp-2-q1', 1, 'Nothing, the loan continues'),
    ('dp-2-q1', 2, 'The protocol automatically adds more collateral'),
    ('dp-2-q1', 3, 'Anyone can liquidate the position'),
    ('dp-2-q1', 4, 'The interest rate is reduced'),
    ('dp-3-q1', 1, 'A permanent reduction in token supply'),
    ('dp-3-q1', 2, 'Loss from price divergence of pooled tokens vs holding'),
    ('dp-3-q1', 3, 'Transaction fees paid to validators'),
    ('dp-3-q1', 4, 'Loss from failed transactions');

  insert into lesson.source_attributions (lesson_version_id, source_url, source_repo, source_ref, source_license, citation_note) values
    (v_sf3_version_id, 'https://solana.com/docs/core/transactions', 'solana.com', 'docs/core/transactions', 'unknown', 'Starter Solana Fundamentals lesson adapted for catalog deepening.'),
    (v_sf4_version_id, 'https://solana.com/docs/core/programs', 'solana.com', 'docs/core/programs', 'unknown', 'Starter Solana Fundamentals lesson adapted for catalog deepening.'),
    (v_sf5_version_id, 'https://solana.com/docs/core/accounts#keypairs-and-wallets', 'solana.com', 'docs/core/accounts', 'unknown', 'Starter Solana Fundamentals lesson adapted for catalog deepening.'),
    (v_ad2_version_id, 'https://www.anchor-lang.com/docs/basics/program-structure', 'anchor-lang', 'docs/basics/program-structure', 'unknown', 'Starter Anchor lesson adapted for catalog deepening.'),
    (v_ad3_version_id, 'https://www.anchor-lang.com/docs/clients/typescript', 'anchor-lang', 'docs/clients/typescript', 'unknown', 'Starter Anchor lesson adapted for catalog deepening.'),
    (v_rs2_version_id, 'https://doc.rust-lang.org/book/ch05-00-structs.html', 'rust-lang/book', 'chapter-5', 'unknown', 'Starter Rust lesson adapted for catalog deepening.'),
    (v_rs3_version_id, 'https://doc.rust-lang.org/book/ch09-00-error-handling.html', 'rust-lang/book', 'chapter-9', 'unknown', 'Starter Rust lesson adapted for catalog deepening.'),
    (v_dp2_version_id, 'https://docs.marginfi.com/', 'marginfi/docs', 'overview', 'unknown', 'Starter DeFi lesson adapted for catalog deepening.'),
    (v_dp3_version_id, 'https://docs.orca.so/whirlpools/overview', 'orca-so/docs', 'whirlpools/overview', 'unknown', 'Starter DeFi lesson adapted for catalog deepening.');

  v_sf3_payload := jsonb_build_object(
    'id','sf-3','courseId','solana-fundamentals','moduleId','solana-fundamentals-module-core','title','Transactions & Instructions','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','sf-3-block-1','type','paragraph','order',1,'text',$$Transactions are the way users interact with the Solana network. A transaction is a bundle of one or more instructions, each targeting a specific on-chain program. Transactions are atomic — either all instructions succeed or none of them do.

Each instruction specifies: the program to call, the accounts it needs to read or write, and an instruction data payload. A transaction also includes a recent blockhash (to prevent replay attacks) and one or more signatures from the accounts that authorize the transaction.

Solana transactions have a size limit of 1232 bytes. Transaction fees on Solana are deterministic and based on the number of signatures required, not on computational complexity like Ethereum gas fees. The base fee is 5000 lamports per signature (0.000005 SOL).$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','sf-3-q1','type','mcq','prompt',$$What happens if one instruction in a Solana transaction fails?$$,'options',jsonb_build_array(
        jsonb_build_object('id','sf-3-q1-opt-1','text','Only that instruction is reverted'),
        jsonb_build_object('id','sf-3-q1-opt-2','text','The entire transaction fails — all instructions are reverted'),
        jsonb_build_object('id','sf-3-q1-opt-3','text','The remaining instructions still execute'),
        jsonb_build_object('id','sf-3-q1-opt-4','text','The transaction is retried automatically')
      )),
      jsonb_build_object('id','sf-3-q2','type','short_text','prompt',$$What is the maximum size of a Solana transaction in bytes?$$),
      jsonb_build_object('id','sf-3-q3','type','mcq','prompt',$$Why does a Solana transaction include a recent blockhash?$$,'options',jsonb_build_array(
        jsonb_build_object('id','sf-3-q3-opt-1','text','To calculate the transaction fee'),
        jsonb_build_object('id','sf-3-q3-opt-2','text','To prevent replay attacks'),
        jsonb_build_object('id','sf-3-q3-opt-3','text','To determine which validator processes it'),
        jsonb_build_object('id','sf-3-q3-opt-4','text','To encrypt the transaction data')
      ))
    )
  );

  v_sf4_payload := jsonb_build_object(
    'id','sf-4','courseId','solana-fundamentals','moduleId','solana-fundamentals-module-core','title','Programs & the Runtime','order',4,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','sf-4-block-1','type','paragraph','order',1,'text',$$Programs on Solana are the equivalent of smart contracts on other blockchains. They are compiled to BPF (Berkeley Packet Filter) bytecode and deployed to the network. Programs are stateless and process instructions by reading from and writing to accounts passed in by the caller.

Solana has several built-in native programs: the System Program (creates accounts and transfers SOL), the Token Program (manages SPL tokens), and the Associated Token Account Program (creates deterministic token accounts). Most DeFi and NFT applications build on top of these native programs.

The Solana runtime enforces strict rules: programs can only modify accounts they own, accounts must have enough lamports to be rent-exempt, and cross-program invocations (CPIs) allow programs to call other programs while maintaining security guarantees.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','sf-4-q1','type','mcq','prompt',$$What bytecode format do Solana programs compile to?$$,'options',jsonb_build_array(
        jsonb_build_object('id','sf-4-q1-opt-1','text','EVM bytecode'),
        jsonb_build_object('id','sf-4-q1-opt-2','text','WebAssembly'),
        jsonb_build_object('id','sf-4-q1-opt-3','text','BPF bytecode'),
        jsonb_build_object('id','sf-4-q1-opt-4','text','JVM bytecode')
      )),
      jsonb_build_object('id','sf-4-q2','type','short_text','prompt',$$What is the name of the mechanism that allows Solana programs to call other programs? (abbreviation)$$)
    )
  );

  v_sf5_payload := jsonb_build_object(
    'id','sf-5','courseId','solana-fundamentals','moduleId','solana-fundamentals-module-core','title','Wallets & Keypairs','order',5,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','sf-5-block-1','type','paragraph','order',1,'text',$$A Solana wallet is fundamentally a keypair — a public key (your address) and a private key (your secret). The public key is a 32-byte Ed25519 key that serves as your on-chain identity. The private key is used to sign transactions and should never be shared.

Wallets can be generated from a seed phrase (also called a mnemonic), which is typically 12 or 24 words following the BIP-39 standard. This seed phrase can deterministically generate multiple keypairs using derivation paths, allowing one backup phrase to control many accounts.

Popular Solana wallets include Phantom, Solflare, and Backpack. For developers, the Solana CLI provides a file-system wallet, and the @solana/web3.js library offers programmatic keypair generation and transaction signing.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','sf-5-q1','type','mcq','prompt',$$What cryptographic curve does Solana use for keypairs?$$,'options',jsonb_build_array(
        jsonb_build_object('id','sf-5-q1-opt-1','text','secp256k1'),
        jsonb_build_object('id','sf-5-q1-opt-2','text','Ed25519'),
        jsonb_build_object('id','sf-5-q1-opt-3','text','P-256'),
        jsonb_build_object('id','sf-5-q1-opt-4','text','Curve25519')
      )),
      jsonb_build_object('id','sf-5-q2','type','short_text','prompt',$$How many words is a standard Solana seed phrase? (pick either common length)$$),
      jsonb_build_object('id','sf-5-q3','type','mcq','prompt',$$Which of these is NOT a popular Solana wallet?$$,'options',jsonb_build_array(
        jsonb_build_object('id','sf-5-q3-opt-1','text','Phantom'),
        jsonb_build_object('id','sf-5-q3-opt-2','text','MetaMask'),
        jsonb_build_object('id','sf-5-q3-opt-3','text','Solflare'),
        jsonb_build_object('id','sf-5-q3-opt-4','text','Backpack')
      ))
    )
  );

  v_ad2_payload := jsonb_build_object(
    'id','ad-2','courseId','anchor-dev','moduleId','anchor-dev-module-core','title','Accounts & Constraints','order',2,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','ad-2-block-1','type','paragraph','order',1,'text',$$In Anchor, every instruction handler receives a context (Context<T>) where T is a struct that derives the Accounts trait. Each field in this struct represents an account the instruction needs to read or write.

Anchor provides constraint attributes like #[account(init, payer = user, space = 8 + 32)] to declare how accounts should be validated. The init constraint creates and initializes a new account, mut marks an account as mutable, and has_one checks ownership relationships.

Program Derived Addresses (PDAs) are commonly used as accounts with deterministic addresses. Anchor makes creating PDAs easy with seeds and bump constraints: #[account(seeds = [b"vault", user.key().as_ref()], bump)].$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','ad-2-q1','type','mcq','prompt',$$What does the #[account(init)] constraint do?$$,'options',jsonb_build_array(
        jsonb_build_object('id','ad-2-q1-opt-1','text','Initializes a variable in memory'),
        jsonb_build_object('id','ad-2-q1-opt-2','text','Creates and initializes a new on-chain account'),
        jsonb_build_object('id','ad-2-q1-opt-3','text','Imports an existing account'),
        jsonb_build_object('id','ad-2-q1-opt-4','text','Deletes an account')
      )),
      jsonb_build_object('id','ad-2-q2','type','short_text','prompt',$$What type wraps the accounts struct in an Anchor instruction handler?$$)
    )
  );

  v_ad3_payload := jsonb_build_object(
    'id','ad-3','courseId','anchor-dev','moduleId','anchor-dev-module-core','title','Testing with Anchor','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','ad-3-block-1','type','paragraph','order',1,'text',$$Anchor includes a built-in testing framework that lets you write integration tests in TypeScript. Tests run against a local Solana validator (solana-test-validator) or Anchor's built-in BankRun environment.

The anchor test command compiles your program, deploys it to localnet, and runs your TypeScript test suite. Tests use the @coral-xyz/anchor library to create a Provider (connection + wallet) and a Program instance that maps to your IDL.

You call program methods like: await program.methods.initialize().accounts({ myAccount: pda }).rpc(). Anchor auto-serializes arguments and deserializes return values based on the IDL. You can also use program.account.myAccount.fetch(pda) to read account data.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','ad-3-q1','type','mcq','prompt',$$What command compiles, deploys, and runs Anchor tests?$$,'options',jsonb_build_array(
        jsonb_build_object('id','ad-3-q1-opt-1','text','anchor build'),
        jsonb_build_object('id','ad-3-q1-opt-2','text','anchor deploy'),
        jsonb_build_object('id','ad-3-q1-opt-3','text','anchor test'),
        jsonb_build_object('id','ad-3-q1-opt-4','text','anchor run')
      )),
      jsonb_build_object('id','ad-3-q2','type','short_text','prompt',$$What method on a Program instance sends a transaction for an instruction?$$)
    )
  );

  v_rs2_payload := jsonb_build_object(
    'id','rs-2','courseId','rust-solana','moduleId','rust-solana-module-core','title','Structs & Enums','order',2,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','rs-2-block-1','type','paragraph','order',1,'text',$$Structs are Rust's way of creating custom data types by grouping related fields together. They are heavily used in Solana programs to define account data. You define a struct with the struct keyword and can add methods using impl blocks.

Enums in Rust are more powerful than in most languages — each variant can hold different data. This makes them perfect for modeling instruction types or state machines in Solana programs. The match keyword lets you exhaustively handle every variant.

Deriving traits like Clone, Debug, and BorshSerialize/BorshDeserialize is essential for Solana. Borsh (Binary Object Representation Serializer for Hashing) is the serialization format used by Solana programs to encode/decode account data.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','rs-2-q1','type','mcq','prompt',$$What serialization format does Solana use for account data?$$,'options',jsonb_build_array(
        jsonb_build_object('id','rs-2-q1-opt-1','text','JSON'),
        jsonb_build_object('id','rs-2-q1-opt-2','text','MessagePack'),
        jsonb_build_object('id','rs-2-q1-opt-3','text','Borsh'),
        jsonb_build_object('id','rs-2-q1-opt-4','text','Protobuf')
      )),
      jsonb_build_object('id','rs-2-q2','type','short_text','prompt',$$What keyword is used to add methods to a struct in Rust?$$)
    )
  );

  v_rs3_payload := jsonb_build_object(
    'id','rs-3','courseId','rust-solana','moduleId','rust-solana-module-core','title','Error Handling','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','rs-3-block-1','type','paragraph','order',1,'text',$$Rust uses the Result<T, E> type for error handling instead of exceptions. A Result is either Ok(value) on success or Err(error) on failure. The ? operator propagates errors up the call stack automatically.

In Solana programs, errors are returned as ProgramError or custom error enums. Anchor provides the #[error_code] macro to define custom errors with messages: #[error_code] enum MyError { #[msg("Insufficient funds")] InsufficientFunds }.

The require! macro in Anchor is a convenient way to validate conditions: require!(amount > 0, MyError::InsufficientFunds). This replaces verbose if/else error returns and makes your code more readable.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','rs-3-q1','type','mcq','prompt',$$What operator propagates errors automatically in Rust?$$,'options',jsonb_build_array(
        jsonb_build_object('id','rs-3-q1-opt-1','text','!'),
        jsonb_build_object('id','rs-3-q1-opt-2','text','?'),
        jsonb_build_object('id','rs-3-q1-opt-3','text','&'),
        jsonb_build_object('id','rs-3-q1-opt-4','text','::')
      )),
      jsonb_build_object('id','rs-3-q2','type','short_text','prompt',$$What Anchor macro is used to validate a condition and return an error?$$)
    )
  );

  v_dp2_payload := jsonb_build_object(
    'id','dp-2','courseId','defi-protocols','moduleId','defi-protocols-module-core','title','Lending & Borrowing','order',2,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','dp-2-block-1','type','paragraph','order',1,'text',$$Lending protocols allow users to deposit assets and earn interest, while borrowers can take loans against their collateral. The interest rates are typically determined algorithmically based on supply and demand (utilization rate).

Over-collateralization is key: borrowers must deposit more value than they borrow. If the collateral value drops below a threshold (the liquidation ratio), anyone can liquidate the position by repaying the loan and claiming the discounted collateral.

On Solana, major lending protocols include Solend, MarginFi, and Kamino. These protocols use oracle price feeds (like Pyth or Switchboard) to track real-time asset prices for collateral valuation and liquidation triggers.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','dp-2-q1','type','mcq','prompt',$$What happens when a borrower's collateral drops below the liquidation ratio?$$,'options',jsonb_build_array(
        jsonb_build_object('id','dp-2-q1-opt-1','text','Nothing, the loan continues'),
        jsonb_build_object('id','dp-2-q1-opt-2','text','The protocol automatically adds more collateral'),
        jsonb_build_object('id','dp-2-q1-opt-3','text','Anyone can liquidate the position'),
        jsonb_build_object('id','dp-2-q1-opt-4','text','The interest rate is reduced')
      )),
      jsonb_build_object('id','dp-2-q2','type','short_text','prompt',$$What Solana oracle provides real-time price feeds for DeFi protocols?$$)
    )
  );

  v_dp3_payload := jsonb_build_object(
    'id','dp-3','courseId','defi-protocols','moduleId','defi-protocols-module-core','title','Yield Farming & Staking','order',3,'version',1,'releaseId',v_release_id::text,
    'blocks', jsonb_build_array(jsonb_build_object('id','dp-3-block-1','type','paragraph','order',1,'text',$$Yield farming is the practice of moving assets between different DeFi protocols to maximize returns. Users provide liquidity to pools and earn trading fees plus additional token rewards (liquidity mining). The combined return is expressed as APY (Annual Percentage Yield).

Liquid staking lets you stake SOL while maintaining liquidity. Protocols like Marinade (mSOL) and Jito (jitoSOL) give you a derivative token that represents your staked SOL plus accumulated rewards. You can use these tokens in other DeFi protocols.

Impermanent loss is a key risk in yield farming. It occurs when the price ratio of your deposited tokens changes compared to when you entered the pool. The larger the price divergence, the greater the impermanent loss relative to simply holding the tokens.$$)),
    'questions', jsonb_build_array(
      jsonb_build_object('id','dp-3-q1','type','mcq','prompt',$$What is impermanent loss?$$,'options',jsonb_build_array(
        jsonb_build_object('id','dp-3-q1-opt-1','text','A permanent reduction in token supply'),
        jsonb_build_object('id','dp-3-q1-opt-2','text','Loss from price divergence of pooled tokens vs holding'),
        jsonb_build_object('id','dp-3-q1-opt-3','text','Transaction fees paid to validators'),
        jsonb_build_object('id','dp-3-q1-opt-4','text','Loss from failed transactions')
      )),
      jsonb_build_object('id','dp-3-q2','type','short_text','prompt',$$What does APY stand for?$$)
    )
  );

  insert into lesson.published_modules (release_id, course_id, module_id, module_order, payload) values
    (
      v_release_id,
      'solana-fundamentals',
      'solana-fundamentals-module-core',
      1,
      jsonb_set(jsonb_set(v_sf_module_payload, '{totalLessons}', '5'::jsonb), '{estimatedMinutes}', '90'::jsonb)
    ),
    (
      v_release_id,
      'anchor-dev',
      'anchor-dev-module-core',
      1,
      jsonb_set(jsonb_set(v_anchor_module_payload, '{totalLessons}', '3'::jsonb), '{estimatedMinutes}', '45'::jsonb)
    ),
    (
      v_release_id,
      'rust-solana',
      'rust-solana-module-core',
      1,
      jsonb_set(jsonb_set(v_rust_module_payload, '{totalLessons}', '3'::jsonb), '{estimatedMinutes}', '45'::jsonb)
    ),
    (
      v_release_id,
      'defi-protocols',
      'defi-protocols-module-core',
      1,
      jsonb_set(jsonb_set(v_defi_module_payload, '{totalLessons}', '3'::jsonb), '{estimatedMinutes}', '45'::jsonb)
    );

  insert into lesson.published_lessons (release_id, lesson_id, module_id, lesson_version_id, lesson_order, payload) values
    (v_release_id, 'sf-1', 'solana-fundamentals-module-core', v_sf1_version_id, 1, jsonb_set(v_sf1_payload, '{releaseId}', to_jsonb(v_release_id::text))),
    (v_release_id, 'sf-2', 'solana-fundamentals-module-core', v_sf2_version_id, 2, jsonb_set(v_sf2_payload, '{releaseId}', to_jsonb(v_release_id::text))),
    (v_release_id, 'sf-3', 'solana-fundamentals-module-core', v_sf3_version_id, 3, v_sf3_payload),
    (v_release_id, 'sf-4', 'solana-fundamentals-module-core', v_sf4_version_id, 4, v_sf4_payload),
    (v_release_id, 'sf-5', 'solana-fundamentals-module-core', v_sf5_version_id, 5, v_sf5_payload),
    (v_release_id, 'ad-1', 'anchor-dev-module-core', v_ad1_version_id, 1, jsonb_set(v_ad1_payload, '{releaseId}', to_jsonb(v_release_id::text))),
    (v_release_id, 'ad-2', 'anchor-dev-module-core', v_ad2_version_id, 2, v_ad2_payload),
    (v_release_id, 'ad-3', 'anchor-dev-module-core', v_ad3_version_id, 3, v_ad3_payload),
    (v_release_id, 'rs-1', 'rust-solana-module-core', v_rs1_version_id, 1, jsonb_set(v_rs1_payload, '{releaseId}', to_jsonb(v_release_id::text))),
    (v_release_id, 'rs-2', 'rust-solana-module-core', v_rs2_version_id, 2, v_rs2_payload),
    (v_release_id, 'rs-3', 'rust-solana-module-core', v_rs3_version_id, 3, v_rs3_payload),
    (v_release_id, 'dp-1', 'defi-protocols-module-core', v_dp1_version_id, 1, jsonb_set(v_dp1_payload, '{releaseId}', to_jsonb(v_release_id::text))),
    (v_release_id, 'dp-2', 'defi-protocols-module-core', v_dp2_version_id, 2, v_dp2_payload),
    (v_release_id, 'dp-3', 'defi-protocols-module-core', v_dp3_version_id, 3, v_dp3_payload);

  insert into lesson.published_lesson_payloads (release_id, lesson_id, payload, content_hash) values
    (v_release_id, 'sf-1', jsonb_set(v_sf1_payload, '{releaseId}', to_jsonb(v_release_id::text)), md5(jsonb_set(v_sf1_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)),
    (v_release_id, 'sf-2', jsonb_set(v_sf2_payload, '{releaseId}', to_jsonb(v_release_id::text)), md5(jsonb_set(v_sf2_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)),
    (v_release_id, 'sf-3', v_sf3_payload, md5(v_sf3_payload::text)),
    (v_release_id, 'sf-4', v_sf4_payload, md5(v_sf4_payload::text)),
    (v_release_id, 'sf-5', v_sf5_payload, md5(v_sf5_payload::text)),
    (v_release_id, 'ad-1', jsonb_set(v_ad1_payload, '{releaseId}', to_jsonb(v_release_id::text)), md5(jsonb_set(v_ad1_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)),
    (v_release_id, 'ad-2', v_ad2_payload, md5(v_ad2_payload::text)),
    (v_release_id, 'ad-3', v_ad3_payload, md5(v_ad3_payload::text)),
    (v_release_id, 'rs-1', jsonb_set(v_rs1_payload, '{releaseId}', to_jsonb(v_release_id::text)), md5(jsonb_set(v_rs1_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)),
    (v_release_id, 'rs-2', v_rs2_payload, md5(v_rs2_payload::text)),
    (v_release_id, 'rs-3', v_rs3_payload, md5(v_rs3_payload::text)),
    (v_release_id, 'dp-1', jsonb_set(v_dp1_payload, '{releaseId}', to_jsonb(v_release_id::text)), md5(jsonb_set(v_dp1_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)),
    (v_release_id, 'dp-2', v_dp2_payload, md5(v_dp2_payload::text)),
    (v_release_id, 'dp-3', v_dp3_payload, md5(v_dp3_payload::text));

  raise notice 'Catalog deepen release complete. Release ID: %', v_release_id;
end;
$seed$;
