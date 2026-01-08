//! Structure représentant un enregistrement de vote
//!
//! Chaque vote crée un VoteRecord unique par combinaison (voter, proposal).
//! Cela empêche le double vote car Anchor refuse de créer un compte
//! avec un PDA qui existe déjà.

use anchor_lang::prelude::*;

/// Choix de vote possible
///
/// Utilisé dans l'instruction `vote` pour indiquer le choix du votant
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum VoteChoice {
    /// Vote en faveur de la proposition
    Approve,
    /// Vote contre la proposition
    Reject,
}

/// Enregistrement individuel d'un vote
///
/// ## Seeds du PDA
/// `["vote", proposal.key().as_ref(), voter.key().as_ref()]`
///
/// ## Prévention du double vote
/// Grâce aux seeds uniques, si un votant essaie de voter deux fois
/// sur la même proposition, la création du compte échouera car le
/// PDA existe déjà.
///
/// ## Exemple
/// ```rust
/// let vote_record = &mut ctx.accounts.vote_record;
/// vote_record.voter = voter.key();
/// vote_record.vote = VoteChoice::Approve;
/// ```
#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    /// Adresse publique du votant
    pub voter: Pubkey,

    /// Adresse publique de la proposition votée
    pub proposal: Pubkey,

    /// Choix du votant (Approve ou Reject)
    pub vote: VoteChoice,

    /// Bump seed pour la dérivation du PDA
    pub bump: u8,
}
