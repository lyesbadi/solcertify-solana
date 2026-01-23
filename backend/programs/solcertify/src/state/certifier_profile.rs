use anchor_lang::prelude::*;

/// Profil d'un certificateur agréé avec ses statistiques
/// Un compte séparé par certificateur pour permettre le suivi de performance
#[account]
pub struct CertifierProfile {
    /// Adresse publique du certificateur
    pub certifier: Pubkey,
    /// Nombre de demandes actuellement en cours de traitement
    pub current_load: u16,
    /// Nombre total de demandes traitées (approuvées + rejetées)
    pub total_processed: u64,
    /// Temps de traitement cumulé (en secondes) pour calculer la moyenne
    pub total_processing_time: u64,
    /// Adresse physique / lieu de dépôt pour l'envoi des montres
    pub physical_address: String,
    /// Nom d'affichage du certificateur
    pub display_name: String,
    /// Actif ou non (peut être désactivé par l'admin)
    pub is_active: bool,
    /// Date d'inscription
    pub registered_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl CertifierProfile {
    pub const MAX_ADDRESS_LENGTH: usize = 200;
    pub const MAX_NAME_LENGTH: usize = 50;

    pub const SPACE: usize = 8 +       // discriminator
        32 +                            // certifier pubkey
        2 +                             // current_load u16
        8 +                             // total_processed u64
        8 +                             // total_processing_time u64
        4 + Self::MAX_ADDRESS_LENGTH +  // physical_address String
        4 + Self::MAX_NAME_LENGTH +     // display_name String
        1 +                             // is_active bool
        8 +                             // registered_at i64
        1;                              // bump

    /// Calcule le délai moyen de traitement en secondes
    pub fn average_processing_time(&self) -> u64 {
        if self.total_processed == 0 {
            return 0;
        }
        self.total_processing_time / self.total_processed
    }

    /// Vérifie si le certificateur peut accepter de nouvelles demandes
    pub fn can_accept_request(&self, max_concurrent: u16) -> bool {
        self.is_active && self.current_load < max_concurrent
    }

    /// Incrémente la charge (nouvelle demande assignée)
    pub fn increment_load(&mut self) -> Result<()> {
        self.current_load = self
            .current_load
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    /// Décrémente la charge et met à jour les stats (demande résolue)
    pub fn resolve_request(&mut self, processing_time: u64) -> Result<()> {
        self.current_load = self
            .current_load
            .saturating_sub(1);
        self.total_processed = self
            .total_processed
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        self.total_processing_time = self
            .total_processing_time
            .checked_add(processing_time)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }
}
