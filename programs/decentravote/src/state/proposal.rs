//! Structure représentant une proposition de loi
//!
//! Une proposition contient toutes les informations nécessaires pour :
//! - Identifier la proposition (titre, description)
//! - Suivre les votes (compteurs approve/reject)
//! - Gérer le cycle de vie (timestamp, finalisé)

use anchor_lang::prelude::*;

/// Proposition de loi stockée dans un compte PDA
///
/// ## Seeds du PDA
/// `["proposal", title.as_bytes()]`
///
/// ## Exemple d'utilisation
/// ```rust
/// let proposal = &mut ctx.accounts.proposal;
/// proposal.title = "Nouvelle loi".to_string();
/// proposal.approve_votes += 1;
/// ```
#[account]
#[derive(InitSpace)]
pub struct Proposal {
    /// Titre de la proposition (max 50 caractères)
    /// Utilisé aussi comme seed pour le PDA
    #[max_len(50)]
    pub title: String,

    /// Description détaillée de la proposition (max 200 caractères)
    #[max_len(200)]
    pub description: String,

    /// Adresse publique du créateur de la proposition
    pub proposer: Pubkey,

    /// Nombre de votes "Pour" (Approve)
    pub approve_votes: u64,

    /// Nombre de votes "Contre" (Reject)
    pub reject_votes: u64,

    /// Timestamp Unix de création (secondes depuis epoch)
    /// Utilisé pour calculer quand la proposition peut être finalisée
    pub created_at: i64,

    /// Indique si la proposition a été finalisée
    /// Une fois true, plus aucun vote n'est accepté
    pub is_finalized: bool,

    /// Bump seed pour la dérivation du PDA
    /// Stocké pour pouvoir retrouver le PDA de manière déterministe
    pub bump: u8,
}

impl Proposal {
    /// Vérifie si la proposition a plus de votes "Pour" que "Contre"
    pub fn is_approved(&self) -> bool {
        self.approve_votes > self.reject_votes
    }

    /// Retourne le nombre total de votes
    pub fn total_votes(&self) -> u64 {
        self.approve_votes + self.reject_votes
    }
}
