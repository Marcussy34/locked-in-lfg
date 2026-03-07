[Solana Documentation](https://solana.com/docs) [Core Concepts](https://solana.com/docs/core)

# [Program Derived Addresses (PDAs)](https://solana.com/docs/core/pda)

Copy MarkdownOpen

Program Derived Addresses (PDAs) are 32-byte account addresses that are
deterministically derived from a program ID and a set of seeds. They are
guaranteed to not lie on the Ed25519 curve, which means no private key exists
for them. Only the program whose ID was used in the derivation can "sign" for a
PDA, and it does so through [`invoke_signed`](https://solana.com/docs/core/cpi) during
cross-program invocations (CPIs).

![Program Derived Address](https://solana.com/assets/docs/core/pda/pda.svg)Program Derived Address

[**PDA Derivation** \\
\\
Derivation algorithm, canonical bump, findProgramAddress examples with\\
different seed types.](https://solana.com/docs/core/pda/pda-derivation) [**PDA Accounts** \\
\\
Creating accounts at PDA addresses, invoke\_signed signing, Anchor patterns.](https://solana.com/docs/core/pda/pda-accounts)

## [Key facts](https://solana.com/docs/core/pda\#key-facts)

- **Deterministic**: The same seeds and program ID always produce the same
address.
- **Off-curve**: The derived address is verified to not be a valid Ed25519
public key. If the hash happens to land on the curve, the derivation fails and
a different bump seed is tried.
- **No private key**: Because the address is off-curve, no one can produce a
cryptographic signature for it. The program "signs" via the runtime's
`invoke_signed` mechanism instead.

## [When to use PDAs](https://solana.com/docs/core/pda\#when-to-use-pdas)

- **Deterministic addressing**: Derive the same account from the same seeds
every time.
- **Program signing**: Only the owning program can sign via `invoke_signed`,
enabling programs to act as autonomous authorities.
- **User-scoped state**: Derive per-user accounts from user pubkey seeds (e.g.,
`["user", user_pubkey]`).
- **No keypair management**: No private key to store or lose. The address is
derived purely from seeds.

## [Limits](https://solana.com/docs/core/pda\#limits)

| Limit | Value | Source |
| --- | --- | --- |
| Max seeds | 16 | [`MAX_SEEDS`](https://github.com/anza-xyz/solana-sdk/blob/clock%40v2.2.3/pubkey/src/lib.rs#L47) |
| Max seed length | 32 bytes maximum per seed | [`MAX_SEED_LEN`](https://github.com/anza-xyz/solana-sdk/blob/clock%40v2.2.3/pubkey/src/lib.rs#L45) |
| Bump range | 0-255 (1 byte) | Appended as the final seed element |
| `create_program_address` cost | 1,500 CUs | [`create_program_address_units`](https://github.com/anza-xyz/agave/blob/v3.1.8/program-runtime/src/execution_budget.rs#L200) |
| `find_program_address` worst-case cost | 1,500 entry + 1,500 x iterations | 1,500 on entry + 1,500 per failed bump |
| Max PDA signers per CPI | 16 | [`MAX_SIGNERS`](https://github.com/anza-xyz/agave/blob/v3.1.8/program-runtime/src/cpi.rs#L62) |

Is this page helpful?

[Previous\\
\\
Compute Budget](https://solana.com/docs/core/fees/compute-budget) [Next\\
\\
PDA Derivation](https://solana.com/docs/core/pda/pda-derivation)

### Table of Contents

[Key facts](https://solana.com/docs/core/pda#key-facts) [When to use PDAs](https://solana.com/docs/core/pda#when-to-use-pdas) [Limits](https://solana.com/docs/core/pda#limits)

[Edit Page](https://github.com/solana-foundation/solana-com/blob/main/apps/docs/content/docs/en/core/pda/index.mdx)

Ask AI

Managed by

[Solana Foundation](https://solana.com/)

© 2026 Solana Foundation.

All rights reserved.

[YouTube](https://solana.com/youtube)[Twitter](https://solana.com/twitter)[Discord](https://solana.com/discord)[Reddit](https://solana.com/reddit)[GitHub](https://solana.com/github)[Telegram](https://solana.com/telegram)

en

Solana

- [Grants](https://solana.org/grants)
- [Media Kit](https://solana.com/branding)
- [Careers](https://jobs.solana.com/)
- [Disclaimer](https://solana.com/tos)
- [Privacy Policy](https://solana.com/privacy-policy)

Get connected

- [Blog](https://solana.com/news)
- Newsletter

Program Derived Addresses (PDAs) \| Solana