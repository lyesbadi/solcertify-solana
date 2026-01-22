// SolCertify - Programme Principal
//
// Programme Anchor pour la certification d'authenticite de montres de luxe sur Solana.
// Inclut le flux de demande de certification avec distribution des frais.

use anchor_lang::prelude::*;

// Declaration des modules
pub mod errors;
mod processor;
pub mod state;

// Reexporter les types pour l'IDL
pub use state::{CertificationType, RequestStatus};

// ID du programme
declare_id!("FGgYzSL6kTGm2D9UZPCtoGZZykiHZKWUnAUxZiPeXEee");

// Programme SolCertify
#[program]
pub mod solcertify {
    use super::*;

    /// Initialise l'autorite de certification
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("DEBUG: INITIALIZE V2 CALLED - CODE IS LIVE");
        processor::initialize::handler(ctx)
    }

    /// Ajoute un certificateur agree
    pub fn add_certifier(ctx: Context<AddCertifier>, certifier: Pubkey) -> Result<()> {
        processor::add_certifier::handler(ctx, certifier)
    }

    /// Retire un certificateur de la liste des agrees
    pub fn remove_certifier(ctx: Context<RemoveCertifier>, certifier: Pubkey) -> Result<()> {
        processor::remove_certifier::handler(ctx, certifier)
    }

    /// Emet un nouveau certificat d'authenticite (mode direct - certificateur)
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

    /// Transfère la propriete d'un certificat
    pub fn transfer_certificate(ctx: Context<TransferCertificate>) -> Result<()> {
        processor::transfer_certificate::handler(ctx)
    }

    /// Verifie l'authenticite d'un certificat
    pub fn verify_certificate(ctx: Context<VerifyCertificate>) -> Result<CertificateInfo> {
        processor::verify_certificate::handler(ctx)
    }

    // ==================== NOUVELLES INSTRUCTIONS ====================

    /// Soumet une demande de certification (utilisateur)
    /// L'utilisateur paie les frais upfront
    pub fn request_certification(
        ctx: Context<RequestCertification>,
        serial_number: String,
        brand: String,
        model: String,
        cert_type: CertificationType,
        estimated_value: u64,
        metadata_uri: String,
    ) -> Result<()> {
        processor::request_certification::handler(
            ctx,
            serial_number,
            brand,
            model,
            cert_type,
            estimated_value,
            metadata_uri,
        )
    }

    /// Approuve une demande de certification (certificateur)
    /// Cree le certificat et distribue les frais (60% certificateur, 40% plateforme)
    pub fn approve_certification(ctx: Context<ApproveCertification>) -> Result<()> {
        processor::approve_certification::handler(ctx)
    }

    /// Rejette une demande de certification (certificateur)
    /// Rembourse les frais au demandeur
    pub fn reject_certification(ctx: Context<RejectCertification>, reason: String) -> Result<()> {
        processor::reject_certification::handler(ctx, reason)
    }
}

// ==================== ACCOUNTS STRUCTS ====================

use crate::errors::ErrorCode;
use crate::state::{Certificate, CertificationAuthority, CertificationRequest, UserActivity};

/// Structure retournee lors de la verification d'un certificat
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

    /// CHECK: Ce compte est seulement utilise pour recevoir des SOL
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

// === IssueCertificate (mode direct) ===
#[derive(Accounts)]
#[instruction(serial_number: String)]
pub struct IssueCertificate<'info> {
    #[account(mut)]
    pub certifier: Signer<'info>,

    /// CHECK: Ce compte est seulement utilise comme reference pour le proprietaire
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

    /// CHECK: Verifie par la contrainte sur authority.treasury
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

    /// CHECK: Ce compte est seulement utilise comme reference
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

// ==================== NOUVELLES STRUCTS ACCOUNTS ====================

// === RequestCertification ===
#[derive(Accounts)]
#[instruction(serial_number: String)]
pub struct RequestCertification<'info> {
    #[account(mut)]
    pub requester: Signer<'info>,

    #[account(
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,

    #[account(
        init,
        payer = requester,
        space = CertificationRequest::SPACE,
        seeds = [b"request", serial_number.as_bytes()],
        bump
    )]
    pub request: Account<'info, CertificationRequest>,

    /// CHECK: Treasury pour recevoir les frais
    #[account(
        mut,
        constraint = treasury.key() == authority.treasury @ ErrorCode::UnauthorizedCertifier
    )]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// === ApproveCertification ===
#[derive(Accounts)]
pub struct ApproveCertification<'info> {
    #[account(mut)]
    pub certifier: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,

    #[account(
        mut,
        seeds = [b"request", request.serial_number.as_bytes()],
        bump = request.bump
    )]
    pub request: Account<'info, CertificationRequest>,

    #[account(
        init,
        payer = certifier,
        space = Certificate::SPACE,
        seeds = [b"certificate", request.serial_number.as_bytes()],
        bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(
        init_if_needed,
        payer = certifier,
        space = UserActivity::SPACE,
        seeds = [b"user_activity", request.requester.as_ref()],
        bump
    )]
    pub owner_activity: Account<'info, UserActivity>,

    /// CHECK: Treasury qui detient les frais
    #[account(
        mut,
        constraint = treasury.key() == authority.treasury @ ErrorCode::UnauthorizedCertifier
    )]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// === RejectCertification ===
#[derive(Accounts)]
pub struct RejectCertification<'info> {
    #[account(mut)]
    pub certifier: Signer<'info>,

    #[account(
        seeds = [b"auth_v5"],
        bump = authority.bump
    )]
    pub authority: Account<'info, CertificationAuthority>,

    #[account(
        mut,
        seeds = [b"request", request.serial_number.as_bytes()],
        bump = request.bump
    )]
    pub request: Account<'info, CertificationRequest>,

    /// CHECK: Requester pour recevoir le remboursement
    #[account(
        mut,
        constraint = requester.key() == request.requester @ ErrorCode::NotOwner
    )]
    pub requester: AccountInfo<'info>,

    /// CHECK: Treasury qui detient les frais
    #[account(
        mut,
        constraint = treasury.key() == authority.treasury @ ErrorCode::UnauthorizedCertifier
    )]
    pub treasury: AccountInfo<'info>,
}
