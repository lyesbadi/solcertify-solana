//! # DecentraVote - Programme Principal
//!
//! Programme Anchor pour un système de vote décentralisé sur Solana.
//!
//! ## Fonctionnalités
//! - Proposer des lois
//! - Voter (Approuver/Rejeter)
//! - Finaliser les propositions après un délai
//!
//! ## Architecture
//! Le programme utilise des PDAs (Program Derived Addresses) pour stocker :
//! - Les propositions de loi
//! - Les enregistrements de vote (pour prévenir le double vote)

use anchor_lang::prelude::*;

// Déclaration des modules
pub mod instructions;
pub mod state;

// Imports des instructions et états
use instructions::*;
use state::VoteChoice;

// ID du programme - sera mis à jour après le premier `anchor build`
// TODO: Remplacez par votre Program ID après compilation
declare_id!("FspmA7UoptTCbR1oq1Rd5iHg737gTeKCRfZwfJtj7Fjb");

/// Programme DecentraVote
///
/// Ce programme permet de créer un système de vote décentralisé où :
/// - N'importe qui peut proposer une loi
/// - Chaque adresse peut voter une seule fois par proposition
/// - Après 10 minutes, la proposition peut être finalisée
#[program]
pub mod decentravote {
    use super::*;

    /// Crée une nouvelle proposition de loi
    ///
    /// # Arguments
    /// * `ctx` - Contexte contenant les comptes nécessaires
    /// * `title` - Titre de la proposition (max 50 caractères)
    /// * `description` - Description détaillée (max 200 caractères)
    ///
    /// # Comptes requis
    /// * `proposer` - Le signataire qui crée la proposition (paye les frais)
    /// * `proposal` - Le compte PDA qui stockera la proposition
    /// * `system_program` - Programme système Solana
    pub fn propose_law(ctx: Context<ProposeLaw>, title: String, description: String) -> Result<()> {
        instructions::propose_law(ctx, title, description)
    }

    /// Enregistre un vote sur une proposition
    ///
    /// # Arguments
    /// * `ctx` - Contexte contenant les comptes nécessaires
    /// * `choice` - Le choix du votant (Approve ou Reject)
    ///
    /// # Erreurs
    /// * `ProposalFinalized` - Si la proposition est déjà finalisée
    /// * Le double vote est empêché par la création d'un VoteRecord PDA unique
    pub fn vote(ctx: Context<Vote>, choice: VoteChoice) -> Result<()> {
        instructions::vote(ctx, choice)
    }

    /// Finalise une proposition après le délai de vote
    ///
    /// # Arguments
    /// * `ctx` - Contexte contenant les comptes nécessaires
    ///
    /// # Erreurs
    /// * `TooEarly` - Si le délai de 10 minutes n'est pas écoulé
    /// * `ProposalFinalized` - Si déjà finalisée
    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        instructions::finalize_proposal(ctx)
    }
}
