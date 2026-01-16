// Processor: Initialize
//
// Initialise l'autorité de certification du programme SolCertify.

use crate::Initialize;
use anchor_lang::prelude::*;

/// Handler pour l'initialisation
pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let authority = &mut ctx.accounts.authority;

    authority.admin = ctx.accounts.admin.key();
    authority.treasury = ctx.accounts.treasury.key();
    authority.approved_certifiers = Vec::new();
    authority.total_issued = 0;
    authority.standard_count = 0;
    authority.premium_count = 0;
    authority.luxury_count = 0;
    authority.exceptional_count = 0;
    authority.bump = ctx.bumps.authority;

    msg!("SolCertify initialise avec succes");
    msg!("Admin: {}", authority.admin);
    msg!("Treasury: {}", authority.treasury);

    Ok(())
}
