// Module regroupant toutes les structures de donnees du programme SolCertify
//
// Les structures definies ici representent les comptes stockes on-chain:
// - CertificationAuthority : Autorite de certification (singleton)
// - Certificate : Certificat d'authenticite pour une montre
// - UserActivity : Activite d'un utilisateur (cooldown + compteur)
// - CertificationType : Enum des types de certification
// - CertificationRequest : Demande de certification en attente
// - constants : Constantes du programme

pub mod constants;
pub mod certification_type;
pub mod authority;
pub mod certificate;
pub mod user_activity;
pub mod certification_request;

pub use constants::*;
pub use certification_type::*;
pub use authority::*;
pub use certificate::*;
pub use user_activity::*;
pub use certification_request::*;

