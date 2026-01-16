use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum CertificationType {
    Standard,      // < 5000 EUR
    Premium,       // 5000 - 20000 EUR
    Luxury,        // 20000 - 100000 EUR
    Exceptional,   // > 100000 EUR
}

impl CertificationType {
    // Retourne les frais de certification en lamports
    pub fn get_fee(&self) -> u64 {
        match self {
            CertificationType::Standard => 50_000_000,      // 0.05 SOL
            CertificationType::Premium => 100_000_000,      // 0.1 SOL
            CertificationType::Luxury => 250_000_000,       // 0.25 SOL
            CertificationType::Exceptional => 500_000_000,  // 0.5 SOL
        }
    }
}
