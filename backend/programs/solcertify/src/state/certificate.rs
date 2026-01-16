use crate::state::CertificationType;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Certificate {
    #[max_len(50)]
    pub serial_number: String, // Numéro de série UNIQUE (max 50 chars)
    #[max_len(30)]
    pub brand: String, // Marque (max 30 chars)
    #[max_len(50)]
    pub model: String, // Modèle (max 50 chars)
    pub cert_type: CertificationType, // Type de certification
    pub estimated_value: u64,         // Valeur estimée en EUR
    #[max_len(100)]
    pub metadata_uri: String, // URI des métadonnées IPFS (max 100 chars)
    pub owner: Pubkey,                // Propriétaire actuel
    pub certifier: Pubkey,            // Certificateur qui a émis le certificat
    pub created_at: i64,              // Timestamp de création
    pub last_transfer_at: i64,        // Timestamp du dernier transfert
    pub locked_until: i64,            // Timestamp jusqu'au verrouillage
    #[max_len(20)]
    pub previous_owners: Vec<Pubkey>, // Historique des propriétaires (max 20)
    pub bump: u8,                     // Bump seed du PDA
}

impl Certificate {
    // Constantes de taille pour les chaînes
    pub const MAX_SERIAL_LEN: usize = 50;
    pub const MAX_BRAND_LEN: usize = 30;
    pub const MAX_MODEL_LEN: usize = 50;
    pub const MAX_URI_LEN: usize = 100;
    pub const MAX_PREVIOUS_OWNERS: usize = 20;

    // Taille du compte (discriminator + fields)
    // 8 + (4+50) + (4+30) + (4+50) + 1 + 8 + (4+100) + 32 + 32 + 8 + 8 + 8 + (4+32*20) + 1
    pub const SPACE: usize = 8 + 54 + 34 + 54 + 1 + 8 + 104 + 32 + 32 + 8 + 8 + 8 + 644 + 1;

    // Vérifie si le certificat est actuellement verrouillé
    pub fn is_locked(&self, current_time: i64) -> bool {
        current_time < self.locked_until
    }

    // Vérifie si l'adresse est le propriétaire actuel
    pub fn is_owner(&self, address: &Pubkey) -> bool {
        self.owner == *address
    }

    // Ajoute un propriétaire à l'historique
    pub fn add_to_history(&mut self, previous_owner: Pubkey) {
        if self.previous_owners.len() < 20 {
            self.previous_owners.push(previous_owner);
        }
    }
}
