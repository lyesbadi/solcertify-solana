//! Module regroupant toutes les instructions du programme
//!
//! ## Instructions disponibles
//! - `propose_law` : Créer une nouvelle proposition
//! - `vote` : Voter sur une proposition
//! - `finalize_proposal` : Clôturer une proposition après le délai

pub mod finalize;
pub mod propose_law;
pub mod vote;

pub use finalize::*;
pub use propose_law::*;
pub use vote::*;
