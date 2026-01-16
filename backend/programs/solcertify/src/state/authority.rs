use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CertificationAuthority {
    pub admin: Pubkey, // Administrateur du système
    #[max_len(50)]
    pub approved_certifiers: Vec<Pubkey>, // Liste des certificateurs agréés (max 50)
    pub total_issued: u64, // Nombre total de certificats émis
    pub standard_count: u64, // Compteur de certificats Standard
    pub premium_count: u64, // Compteur de certificats Premium
    pub luxury_count: u64, // Compteur de certificats Luxury
    pub exceptional_count: u64, // Compteur de certificats Exceptional
    pub treasury: Pubkey, // Compte de trésorerie pour les frais
    pub bump: u8,      // Bump seed du PDA
}

impl CertificationAuthority {
    // Maximum de certificateurs agréés
    pub const MAX_CERTIFIERS: usize = 50;

    // Taille du compte (discriminator + fields)
    // 8 + 32 + (4+32*50) + 8*5 + 32 + 1
    pub const SPACE: usize = 8 + 32 + 4 + (32 * 50) + 8 * 5 + 32 + 1;

    // Vérifie si un certificateur est agréé
    pub fn is_approved_certifier(&self, certifier: &Pubkey) -> bool {
        self.approved_certifiers.contains(certifier)
    }

    // Incrémente le compteur approprié selon le type
    pub fn increment_counter(&mut self, cert_type: &crate::state::CertificationType) -> Result<()> {
        self.total_issued = self
            .total_issued
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        match cert_type {
            crate::state::CertificationType::Standard => {
                self.standard_count = self
                    .standard_count
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
            crate::state::CertificationType::Premium => {
                self.premium_count = self
                    .premium_count
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
            crate::state::CertificationType::Luxury => {
                self.luxury_count = self
                    .luxury_count
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
            crate::state::CertificationType::Exceptional => {
                self.exceptional_count = self
                    .exceptional_count
                    .checked_add(1)
                    .ok_or(ProgramError::ArithmeticOverflow)?;
            }
        }
        Ok(())
    }
}
