//! Instruction pour proposer une nouvelle loi
//!
//! Cette instruction permet à n'importe quel utilisateur de créer
//! une proposition de loi qui pourra ensuite être votée.

use crate::state::Proposal;
use anchor_lang::prelude::*;

/// Contexte des comptes pour l'instruction propose_law
///
/// ## Comptes
/// 1. `proposer` - Le signataire qui crée et paye pour la proposition
/// 2. `proposal` - Le compte PDA qui stockera la proposition
/// 3. `system_program` - Programme système pour créer le compte
#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct ProposeLaw<'info> {
    /// Le créateur de la proposition
    /// - Doit signer la transaction
    /// - Paye les frais de création du compte (rent)
    #[account(mut)]
    pub proposer: Signer<'info>,

    /// Le compte PDA de la proposition
    /// - Initialisé par cette instruction
    /// - Seeds: ["proposal", title]
    /// - Taille: 8 (discriminant) + taille de Proposal
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", title.as_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    /// Programme système Solana
    /// Requis pour créer de nouveaux comptes
    pub system_program: Program<'info, System>,
}

/// Crée une nouvelle proposition de loi
///
/// # Arguments
/// * `ctx` - Contexte contenant les comptes
/// * `title` - Titre de la proposition (utilisé comme seed du PDA)
/// * `description` - Description détaillée de la proposition
///
/// # Retour
/// * `Result<()>` - Ok si la proposition est créée avec succès
///
/// # Exemple TypeScript
/// ```typescript
/// await program.methods
///   .proposeLaw("Ma loi", "Description de ma loi")
///   .accounts({ proposer: wallet.publicKey })
///   .rpc();
/// ```
pub fn propose_law(ctx: Context<ProposeLaw>, title: String, description: String) -> Result<()> {
    // Récupère une référence mutable vers le compte proposal
    let proposal = &mut ctx.accounts.proposal;

    // Récupère le timestamp actuel via le Sysvar Clock
    let clock = Clock::get()?;

    // Initialise tous les champs de la proposition
    proposal.title = title;
    proposal.description = description;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.approve_votes = 0;
    proposal.reject_votes = 0;
    proposal.created_at = clock.unix_timestamp;
    proposal.is_finalized = false;
    proposal.bump = ctx.bumps.proposal;

    // Log pour le débogage (visible dans les logs Solana)
    msg!(" Nouvelle proposition créée: {}", proposal.title);
    msg!("   Proposeur: {}", proposal.proposer);
    msg!("   Timestamp: {}", proposal.created_at);

    Ok(())
}
