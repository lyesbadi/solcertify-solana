use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserActivity {
    pub user: Pubkey,          // Adresse de l'utilisateur
    pub last_action_at: i64,   // Timestamp de la dernière action
    pub certificate_count: u8, // Nombre de certificats actifs (max 4)
    pub bump: u8,              // Bump seed du PDA
}

impl UserActivity {
    // Taille du compte (discriminator + fields)
    // 8 + 32 (user) + 8 (last_action_at) + 1 (certificate_count) + 1 (bump)
    pub const SPACE: usize = 8 + 32 + 8 + 1 + 1;

    // Vérifie si le cooldown a expiré
    pub fn has_cooldown_elapsed(&self, current_time: i64, cooldown_period: i64) -> bool {
        if let Some(threshold) = self.last_action_at.checked_add(cooldown_period) {
            current_time >= threshold
        } else {
            false
        }
    }

    // Vérifie si l'utilisateur peut acquérir un nouveau certificat
    pub fn can_receive_certificate(&self, max_certificates: u8) -> bool {
        self.certificate_count < max_certificates
    }

    // Met à jour le timestamp de la dernière action
    pub fn update_last_action(&mut self, current_time: i64) {
        self.last_action_at = current_time;
    }

    // Incrémente le compteur de certificats
    pub fn increment_certificate_count(&mut self) -> Result<()> {
        self.certificate_count = self
            .certificate_count
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    // Décrémente le compteur de certificats
    pub fn decrement_certificate_count(&mut self) -> Result<()> {
        if self.certificate_count > 0 {
            self.certificate_count = self
                .certificate_count
                .checked_sub(1)
                .ok_or(ProgramError::ArithmeticOverflow)?;
        }
        Ok(())
    }
}
