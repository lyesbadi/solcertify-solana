//! Instruction pour voter sur une proposition
//!
//! Cette instruction permet à un utilisateur de voter pour ou contre
//! une proposition. Chaque adresse ne peut voter qu'une seule fois
//! par proposition grâce au mécanisme de PDA unique.

use crate::state::{Proposal, VoteChoice, VoteRecord};
use anchor_lang::prelude::*;

/// Contexte des comptes pour l'instruction vote
///
/// ## Comptes
/// 1. `voter` - Le signataire qui vote
/// 2. `proposal` - La proposition sur laquelle voter
/// 3. `vote_record` - L'enregistrement du vote (empêche double vote)
/// 4. `system_program` - Programme système
#[derive(Accounts)]
pub struct Vote<'info> {
    /// Le votant
    /// - Doit signer la transaction
    /// - Paye les frais de création du VoteRecord
    #[account(mut)]
    pub voter: Signer<'info>,

    /// La proposition sur laquelle voter
    /// - Doit exister
    /// - Ne doit pas être finalisée
    #[account(
        mut,
        constraint = !proposal.is_finalized @ ErrorCode::ProposalFinalized
    )]
    pub proposal: Account<'info, Proposal>,

    /// Enregistrement du vote
    /// - PDA unique par (proposal, voter)
    /// - Si le compte existe déjà, l'instruction échoue = pas de double vote!
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    /// Programme système Solana
    pub system_program: Program<'info, System>,
}

/// Enregistre un vote sur une proposition
///
/// # Arguments
/// * `ctx` - Contexte contenant les comptes
/// * `choice` - Le choix du votant (Approve ou Reject)
///
/// # Erreurs
/// * `ProposalFinalized` - Si la proposition est déjà finalisée
/// * `ConstraintSeeds` - Si l'utilisateur a déjà voté (double vote)
///
/// # Mécanisme anti-double-vote
/// Le PDA du VoteRecord est dérivé des seeds [vote, proposal, voter].
/// Si l'utilisateur essaie de voter deux fois, Anchor essaiera de
/// créer un compte à une adresse qui existe déjà, ce qui échouera.
///
/// # Exemple TypeScript
/// ```typescript
/// await program.methods
///   .vote({ approve: {} })  // ou { reject: {} }
///   .accounts({
///     voter: wallet.publicKey,
///     proposal: proposalPda,
///   })
///   .rpc();
/// ```
pub fn vote(ctx: Context<Vote>, choice: VoteChoice) -> Result<()> {
    // Récupère les références mutables
    let proposal = &mut ctx.accounts.proposal;
    let vote_record = &mut ctx.accounts.vote_record;

    // Met à jour le compteur de votes selon le choix
    match choice {
        VoteChoice::Approve => {
            proposal.approve_votes = proposal
                .approve_votes
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
            msg!(" Vote POUR enregistré");
        }
        VoteChoice::Reject => {
            proposal.reject_votes = proposal
                .reject_votes
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
            msg!(" Vote CONTRE enregistré");
        }
    }

    // Initialise l'enregistrement du vote
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.proposal = proposal.key();
    vote_record.vote = choice;
    vote_record.bump = ctx.bumps.vote_record;

    // Log récapitulatif
    msg!(
        " État actuel: {} Pour / {} Contre",
        proposal.approve_votes,
        proposal.reject_votes
    );

    Ok(())
}

/// Codes d'erreur personnalisés pour le programme
#[error_code]
pub enum ErrorCode {
    /// La proposition a déjà été finalisée, plus de votes possibles
    #[msg("La proposition est déjà finalisée")]
    ProposalFinalized,

    /// Le délai de vote n'est pas encore écoulé
    #[msg("Le délai de vote n'est pas encore écoulé (10 minutes)")]
    TooEarly,

    /// Dépassement de capacité lors du comptage des votes
    #[msg("Dépassement de capacité du compteur de votes")]
    Overflow,
}
