// Module regroupant toutes les structures de données du programme SolCertify
//
// Les structures définies ici représentent les comptes stockés on-chain:
// - CertificationAuthority : Autorité de certification (singleton)
// - Certificate : Certificat d'authenticité pour une montre
// - UserActivity : Activité d'un utilisateur (cooldown + compteur)
// - CertificationType : Enum des types de certification
// - constants : Constantes du programme

pub mod constants;
pub mod certification_type;
pub mod authority;
pub mod certificate;
pub mod user_activity;

pub use constants::*;
pub use certification_type::*;
pub use authority::*;
pub use certificate::*;
pub use user_activity::*;
