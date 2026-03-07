#![allow(deprecated)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("BsJDnhJGVdLQ3mxBJ7YCMkkBitKP2RT49zFqR9XsGri1");

const OPEN_STATUS: u8 = 0;

#[program]
pub mod community_pot {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        stable_mint: Pubkey,
    ) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol_config;
        protocol.authority = ctx.accounts.authority.key();
        protocol.stable_mint = stable_mint;
        protocol.bump = ctx.bumps.protocol_config;
        Ok(())
    }

    pub fn record_redirect(
        ctx: Context<RecordRedirect>,
        receipt_key: [u8; 32],
        window_id: i64,
        amount: u64,
        recorded_at_ts: i64,
    ) -> Result<()> {
        require!(amount > 0, CommunityPotError::InvalidRedirectAmount);

        let receipt = &mut ctx.accounts.receipt;
        if receipt.is_initialized() {
            return Ok(());
        }

        let window = &mut ctx.accounts.window;
        if !window.is_initialized() {
            window.initialize(
                ctx.accounts.protocol_config.key(),
                window_id,
                ctx.bumps.window,
                recorded_at_ts,
            );
        } else {
            require!(
                window.protocol_config == ctx.accounts.protocol_config.key(),
                CommunityPotError::WindowProtocolMismatch
            );
            require!(
                window.window_id == window_id,
                CommunityPotError::WindowIdMismatch
            );
        }

        window.record_redirect(amount, recorded_at_ts)?;
        let window_key = window.key();
        receipt.record(
            window_key,
            receipt_key,
            amount,
            ctx.bumps.receipt,
            recorded_at_ts,
        );

        emit!(RedirectRecorded {
            window: window_key,
            window_id,
            amount,
            total_redirected_amount: window.total_redirected_amount,
            redirect_count: window.redirect_count,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [ProtocolConfig::SEED],
        bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(receipt_key: [u8; 32], window_id: i64)]
pub struct RecordRedirect<'info> {
    #[account(
        mut,
        seeds = [ProtocolConfig::SEED],
        bump = protocol_config.bump,
        has_one = authority @ CommunityPotError::UnauthorizedWorker,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + PotWindow::INIT_SPACE,
        seeds = [PotWindow::SEED, &window_id.to_le_bytes()],
        bump,
    )]
    pub window: Account<'info, PotWindow>,
    #[account(
        init,
        payer = authority,
        space = 8 + RedirectReceipt::INIT_SPACE,
        seeds = [RedirectReceipt::SEED, window.key().as_ref(), &receipt_key],
        bump,
    )]
    pub receipt: Account<'info, RedirectReceipt>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub stable_mint: Pubkey,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SEED: &'static [u8] = b"protocol";
}

#[account]
#[derive(InitSpace)]
pub struct PotWindow {
    pub protocol_config: Pubkey,
    pub window_id: i64,
    pub total_redirected_amount: u64,
    pub redirect_count: u32,
    pub opened_at_ts: i64,
    pub last_recorded_at_ts: i64,
    pub status: u8,
    pub bump: u8,
}

impl PotWindow {
    pub const SEED: &'static [u8] = b"window";

    fn initialize(
        &mut self,
        protocol_config: Pubkey,
        window_id: i64,
        bump: u8,
        opened_at_ts: i64,
    ) {
        self.protocol_config = protocol_config;
        self.window_id = window_id;
        self.total_redirected_amount = 0;
        self.redirect_count = 0;
        self.opened_at_ts = opened_at_ts;
        self.last_recorded_at_ts = opened_at_ts;
        self.status = OPEN_STATUS;
        self.bump = bump;
    }

    fn is_initialized(&self) -> bool {
        self.protocol_config != Pubkey::default()
    }

    fn record_redirect(&mut self, amount: u64, recorded_at_ts: i64) -> Result<()> {
        self.total_redirected_amount = self
            .total_redirected_amount
            .checked_add(amount)
            .ok_or(CommunityPotError::NumericalOverflow)?;
        self.redirect_count = self
            .redirect_count
            .checked_add(1)
            .ok_or(CommunityPotError::NumericalOverflow)?;
        self.last_recorded_at_ts = recorded_at_ts;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct RedirectReceipt {
    pub window: Pubkey,
    pub receipt_key: [u8; 32],
    pub amount: u64,
    pub recorded_at_ts: i64,
    pub bump: u8,
}

impl RedirectReceipt {
    pub const SEED: &'static [u8] = b"redirect";

    fn record(
        &mut self,
        window: Pubkey,
        receipt_key: [u8; 32],
        amount: u64,
        bump: u8,
        recorded_at_ts: i64,
    ) {
        self.window = window;
        self.receipt_key = receipt_key;
        self.amount = amount;
        self.recorded_at_ts = recorded_at_ts;
        self.bump = bump;
    }

    fn is_initialized(&self) -> bool {
        self.window != Pubkey::default()
    }
}

#[event]
pub struct RedirectRecorded {
    pub window: Pubkey,
    pub window_id: i64,
    pub amount: u64,
    pub total_redirected_amount: u64,
    pub redirect_count: u32,
}

#[error_code]
pub enum CommunityPotError {
    #[msg("Only the configured worker authority may record redirects.")]
    UnauthorizedWorker,
    #[msg("Redirect amount must be greater than zero.")]
    InvalidRedirectAmount,
    #[msg("Pot window protocol does not match the configured protocol.")]
    WindowProtocolMismatch,
    #[msg("Pot window id does not match the expected window.")]
    WindowIdMismatch,
    #[msg("Numerical overflow.")]
    NumericalOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded_window(window_id: i64) -> PotWindow {
        PotWindow {
            protocol_config: Pubkey::new_unique(),
            window_id,
            total_redirected_amount: 0,
            redirect_count: 0,
            opened_at_ts: 0,
            last_recorded_at_ts: 0,
            status: OPEN_STATUS,
            bump: 255,
        }
    }

    #[test]
    fn record_redirect_accumulates_totals() {
        let window = seeded_window(202603);
        let mut window = window;
        window.record_redirect(100_000, 1_700_000_000).unwrap();
        window.record_redirect(250_000, 1_700_010_000).unwrap();

        assert_eq!(window.total_redirected_amount, 350_000);
        assert_eq!(window.redirect_count, 2);
        assert_eq!(window.last_recorded_at_ts, 1_700_010_000);
    }

    #[test]
    fn receipt_marks_initialized_after_record() {
        let mut receipt = RedirectReceipt {
            window: Pubkey::default(),
            receipt_key: [0; 32],
            amount: 0,
            recorded_at_ts: 0,
            bump: 0,
        };

        assert!(!receipt.is_initialized());
        receipt.record(Pubkey::new_unique(), [7; 32], 123, 200, 1_700_000_000);
        assert!(receipt.is_initialized());
        assert_eq!(receipt.amount, 123);
    }

    #[test]
    fn window_initialize_sets_expected_defaults() {
        let protocol = Pubkey::new_unique();
        let mut window = PotWindow {
            protocol_config: Pubkey::default(),
            window_id: 0,
            total_redirected_amount: 0,
            redirect_count: 0,
            opened_at_ts: 0,
            last_recorded_at_ts: 0,
            status: 99,
            bump: 0,
        };

        window.initialize(protocol, 202603, 201, 1_700_000_000);

        assert_eq!(window.protocol_config, protocol);
        assert_eq!(window.window_id, 202603);
        assert_eq!(window.total_redirected_amount, 0);
        assert_eq!(window.redirect_count, 0);
        assert_eq!(window.status, OPEN_STATUS);
        assert_eq!(window.bump, 201);
    }
}
