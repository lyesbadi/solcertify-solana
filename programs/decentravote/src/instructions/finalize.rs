//! Instruction pour finaliser une proposition
//!
//! Cette instruction permet de clôturer une proposition après
//! que le délai de vote (10 minutes) soit écoulé.

use crate::instructions::vote::ErrorCode;
use crate::state::Proposal;
use anchor_lang::prelude::*;

/// Durée du vote en secondes (10 minutes)
///
/// Après ce délai, la proposition peut être finalisée.
/// Pour les tests, vous pouvez réduire cette valeur temporairement.
pub const VOTE_DURATION: i64 = 600; // 10 minutes = 600 secondes

/// Contexte des comptes pour l'instruction finalize_proposal
///
/// ## Comptes
/// 1. `authority` - N'importe qui peut finaliser après le délai
/// 2. `proposal` - La proposition à finaliser
#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    /// L'autorité qui finalise
    /// - N'importe qui peut finaliser une proposition après le délai
    /// - Ne paye pas de rent (pas de nouveau compte créé)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// La proposition à finaliser
    /// - Doit exister
    /// - Ne doit pas être déjà finalisée
    #[account(
        mut,
        constraint = !proposal.is_finalized @ ErrorCode::ProposalFinalized
    )]
    pub proposal: Account<'info, Proposal>,
}

/// Finalise une proposition après le délai de vote
///
/// # Arguments
/// * `ctx` - Contexte contenant les comptes
///
/// # Logique
/// 1. Vérifie que le délai de 10 minutes est écoulé
/// 2. Marque la proposition comme finalisée
/// 3. Log le résultat (APPROUVÉE, REJETÉE, ou ÉGALITÉ)
///
/// # Erreurs
/// * `TooEarly` - Si moins de 10 minutes se sont écoulées
/// * `ProposalFinalized` - Si déjà finalisée
///
/// # Exemple TypeScript
/// ```typescript
/// // Après 10 minutes...
/// await program.methods
///   .finalizeProposal()
///   .accounts({
///     authority: wallet.publicKey,
///     proposal: proposalPda,
///   })
///   .rpc();
/// ```
pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;

    // Récupère le timestamp actuel
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    let end_time = proposal.created_at + VOTE_DURATION;

    // Vérifie que le délai est écoulé
    require!(current_time >= end_time, ErrorCode::TooEarly);

    // Marque comme finalisée
    proposal.is_finalized = true;

    // Détermine le résultat
    let result = if proposal.approve_votes > proposal.reject_votes {
        "APPROUVÉE "
    } else if proposal.reject_votes > proposal.approve_votes {
        "REJETÉE "
    } else {
        "ÉGALITÉ "
    };

    // Logs détaillés
    msg!("   Proposition finalisée: {}", proposal.title);
    msg!("   Résultat: {}", result);
    msg!("   Votes Pour: {}", proposal.approve_votes);
    msg!("   Votes Contre: {}", proposal.reject_votes);
    msg!("   Total votes: {}", proposal.total_votes());

    Ok(())
}
