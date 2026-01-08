//! Module regroupant toutes les structures de données du programme
//!
//! Les structures définies ici représentent les comptes stockés on-chain:
//! - `Proposal` : Une proposition de loi
//! - `VoteRecord` : Un enregistrement de vote individuel

pub mod proposal;
pub mod vote_record;

pub use proposal::*;
pub use vote_record::*;
