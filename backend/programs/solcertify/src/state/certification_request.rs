use anchor_lang::prelude::*;
use crate::state::CertificationType;

/// Statut d'une demande de certification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum RequestStatus {
    Pending,    // En attente d'examen
    Approved,   // Approuve - certificat emis
    Rejected,   // Rejete par le certificateur
}

impl Default for RequestStatus {
    fn default() -> Self {
        RequestStatus::Pending
    }
}

/// Demande de certification soumise par un utilisateur
#[account]
pub struct CertificationRequest {
    /// Utilisateur qui demande la certification
    pub requester: Pubkey,
    /// Numero de serie de la montre
    pub serial_number: String,
    /// Marque
    pub brand: String,
    /// Modele
    pub model: String,
    /// Type de certification demande
    pub cert_type: CertificationType,
    /// Valeur estimee en EUR
    pub estimated_value: u64,
    /// URI vers les photos/metadonnees IPFS
    pub metadata_uri: String,
    /// Statut de la demande
    pub status: RequestStatus,
    /// Certificateur assigne (optionnel)
    pub assigned_certifier: Option<Pubkey>,
    /// Raison du rejet (si rejete)
    pub rejection_reason: String,
    /// Date de creation
    pub created_at: i64,
    /// Date de resolution (approval/rejection)
    pub resolved_at: i64,
    /// Frais payes par le demandeur
    pub fee_paid: u64,
    /// PDA bump
    pub bump: u8,
}

impl CertificationRequest {
    pub const MAX_SERIAL_LENGTH: usize = 50;
    pub const MAX_BRAND_LENGTH: usize = 30;
    pub const MAX_MODEL_LENGTH: usize = 50;
    pub const MAX_URI_LENGTH: usize = 200;
    pub const MAX_REJECTION_REASON: usize = 200;

    pub const SPACE: usize = 8 +       // discriminator
        32 +                            // requester
        4 + Self::MAX_SERIAL_LENGTH +   // serial_number
        4 + Self::MAX_BRAND_LENGTH +    // brand
        4 + Self::MAX_MODEL_LENGTH +    // model
        1 +                             // cert_type enum
        8 +                             // estimated_value
        4 + Self::MAX_URI_LENGTH +      // metadata_uri
        1 +                             // status enum
        1 + 32 +                        // assigned_certifier Option<Pubkey>
        4 + Self::MAX_REJECTION_REASON + // rejection_reason
        8 +                             // created_at
        8 +                             // resolved_at
        8 +                             // fee_paid
        1;                              // bump
}
