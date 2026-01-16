use anchor_lang::prelude::*;
use crate::state::CertificationType;

#[account]
#[derive(InitSpace)]
pub struct Certificate {
    #[max_len(50)]
    pub serial_number: String,            // Numéro de série UNIQUE (max 50 chars)
    #[max_len(30)]
    pub brand: String,                    // Marque (max 30 chars)
    #[max_len(50)]
    pub model: String,                    // Modèle (max 50 chars)
    pub cert_type: CertificationType,     // Type de certification
    pub estimated_value: u64,             // Valeur estimée en EUR
    #[max_len(100)]
    pub metadata_uri: String,             // URI des métadonnées IPFS (max 100 chars)
    pub owner: Pubkey,                    // Propriétaire actuel
    pub certifier: Pubkey,                // Certificateur qui a émis le certificat
    pub created_at: i64,                  // Timestamp de création
    pub last_transfer_at: i64,            // Timestamp du dernier transfert
    pub locked_until: i64,                // Timestamp jusqu'au verrouillage
    #[max_len(20)]
    pub previous_owners: Vec<Pubkey>,     // Historique des propriétaires (max 20)
    pub bump: u8,                         // Bump seed du PDA
}

impl Certificate {
    // Taille calculée automatiquement avec InitSpace

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
