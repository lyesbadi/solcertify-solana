// SolCertify - Programme Principal
//
// Programme Anchor pour la certification d'authenticité de montres de luxe sur Solana.

use anchor_lang::prelude::*;

// Déclaration des modules
pub mod errors;
mod processor;
pub mod state;

// Réexporter les types pour l'IDL
pub use state::CertificationType;

// ID du programme
declare_id!("FGgYzSL6kTGm2D9UZPCtoGZZykiHZKWUnAUxZiPeXEee");

// Programme SolCertify
#[program]
pub mod solcertify {
    use super::*;

    /// Initialise l'autorité de certification
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("DEBUG: INITIALIZE V2 CALLED - CODE IS LIVE");
        processor::initialize::handler(ctx)
    }

    /// Ajoute un certificateur agréé
    pub fn add_certifier(ctx: Context<AddCertifier>, certifier: Pubkey) -> Result<()> {
        processor::add_certifier::handler(ctx, certifier)
    }

    /// Retire un certificateur de la liste des agréés
    pub fn remove_certifier(ctx: Context<RemoveCertifier>, certifier: Pubkey) -> Result<()> {
        processor::remove_certifier::handler(ctx, certifier)
    }

    /// Émet un nouveau certificat d'authenticité
    pub fn issue_certificate(
        ctx: Context<IssueCertificate>,
        serial_number: String,
        brand: String,
        model: String,
        cert_type: CertificationType,
        estimated_value: u64,
        metadata_uri: String,
    ) -> Result<()> {
        processor::issue_certificate::handler(
            ctx,
            serial_number,
            brand,
            model,
            cert_type,
            estimated_value,
            metadata_uri,
        )
    }

    /// Transfère la propriété d'un certificat
    pub fn transfer_certificate(ctx: Context<TransferCertificate>) -> Result<()> {
        processor::transfer_certificate::handler(ctx)
    }

    /// Vérifie l'authenticité d'un certificat
    pub fn verify_certificate(ctx: Context<VerifyCertificate>) -> Result<CertificateInfo> {
        processor::verify_certificate::handler(ctx)
    }
}

// ==================== ACCOUNTS STRUCTS ====================

use crate::errors::ErrorCode;
use crate::state::{Certificate, CertificationAuthority, UserActivity};

/// Structure retournée lors de la vérification d'un certificat
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CertificateInfo {
    pub serial_number: String,
    pub brand: String,
    pub model: String,
    pub cert_type: u8,
    pub estimated_value: u64,
    pub owner: Pubkey,
    pub certifier: Pubkey,
    pub metadata_uri: String,
    pub created_at: i64,
    pub last_transfer_at: i64,
    pub locked_until: i64,
    pub is_locked: bool,
    pub previous_owners_count: u8,
    pub total_certificates_issued: u64,
}

// === Initialize ===
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = CertificationAuthority::SPACE,
        seeds = [b"auth_v5"],
        bump
    )]
    pub authority: Account<'info, CertificationAuthority>,

    /// CHECK: Ce compte est seulement utilisé pour recevoir des SOL
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// === AddCertifier ===
#[derive(Accounts)]
pub struct AddCertifier<'info> {
    #[account(
        mut,
        constraint = admin.key() == authority.admin @ ErrorCode::UnauthorizedCertifier
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,
}

// === RemoveCertifier ===
#[derive(Accounts)]
pub struct RemoveCertifier<'info> {
    #[account(
        mut,
        constraint = admin.key() == authority.admin @ ErrorCode::UnauthorizedCertifier
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,
}

// === IssueCertificate ===
#[derive(Accounts)]
#[instruction(serial_number: String)]
pub struct IssueCertificate<'info> {
    #[account(mut)]
    pub certifier: Signer<'info>,

    /// CHECK: Ce compte est seulement utilisé comme référence pour le propriétaire
    pub owner: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,

    #[account(
        init,
        payer = certifier,
        space = Certificate::SPACE,
        seeds = [b"certificate", serial_number.as_bytes()],
        bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(
        init_if_needed,
        payer = certifier,
        space = UserActivity::SPACE,
        seeds = [b"user_activity", owner.key().as_ref()],
        bump
    )]
    pub owner_activity: Account<'info, UserActivity>,

    /// CHECK: Vérifié par la contrainte sur authority.treasury
    #[account(
        mut,
        constraint = treasury.key() == authority.treasury @ ErrorCode::UnauthorizedCertifier
    )]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// === TransferCertificate ===
#[derive(Accounts)]
pub struct TransferCertificate<'info> {
    #[account(mut)]
    pub from: Signer<'info>,

    /// CHECK: Ce compte est seulement utilisé comme référence
    pub to: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"certificate", certificate.serial_number.as_bytes()],
        bump = certificate.bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(
        mut,
        seeds = [b"user_activity", from.key().as_ref()],
        bump = from_activity.bump
    )]
    pub from_activity: Account<'info, UserActivity>,

    #[account(
        init_if_needed,
        payer = from,
        space = UserActivity::SPACE,
        seeds = [b"user_activity", to.key().as_ref()],
        bump
    )]
    pub to_activity: Account<'info, UserActivity>,

    pub system_program: Program<'info, System>,
}

// === VerifyCertificate ===
#[derive(Accounts)]
pub struct VerifyCertificate<'info> {
    #[account(
        seeds = [b"certificate", certificate.serial_number.as_bytes()],
        bump = certificate.bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,
}
