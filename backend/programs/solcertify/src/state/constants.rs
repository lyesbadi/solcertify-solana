// Contraintes temporelles
pub const COOLDOWN_PERIOD: i64 = 5 * 60; // 5 minutes en secondes
pub const LOCK_PERIOD: i64 = 10 * 60; // 10 minutes en secondes

// Limites de possession
pub const MAX_CERTIFICATES: u8 = 4; // Maximum 4 certificats par utilisateur

// Limites de taille
pub const MAX_CERTIFIERS: usize = 50; // Maximum 50 certificateurs agréés
pub const MAX_PREVIOUS_OWNERS: usize = 20; // Maximum 20 propriétaires dans l'historique

// Seeds pour les PDAs
pub const AUTHORITY_SEED: &[u8] = b"authority";
pub const CERTIFICATE_SEED: &[u8] = b"certificate";
pub const USER_ACTIVITY_SEED: &[u8] = b"user_activity";
