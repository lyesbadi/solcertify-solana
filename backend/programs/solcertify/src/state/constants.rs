// Contraintes temporelles
pub const COOLDOWN_PERIOD: i64 = 1; // 1 seconde pour le test
pub const LOCK_PERIOD: i64 = 20; // 20 secondes pour le test

// Limites de possession
pub const MAX_CERTIFICATES: u8 = 4; // Maximum 4 certificats par utilisateur

// Limites de taille
pub const MAX_CERTIFIERS: usize = 50; // Maximum 50 certificateurs agréés
pub const MAX_PREVIOUS_OWNERS: usize = 20; // Maximum 20 propriétaires dans l'historique

// Limites de charge pour les certificateurs (Anti-Monopole)
pub const MAX_CONCURRENT_REQUESTS: u16 = 10; // Maximum 10 demandes simultanées par certificateur

// Seeds pour les PDAs
pub const AUTHORITY_SEED: &[u8] = b"authority";
pub const CERTIFICATE_SEED: &[u8] = b"certificate";
pub const USER_ACTIVITY_SEED: &[u8] = b"user_activity";
pub const CERTIFIER_PROFILE_SEED: &[u8] = b"certifier_profile";

