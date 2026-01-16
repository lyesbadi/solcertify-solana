// Processor: Issue Certificate
//
// Émet un nouveau certificat d'authenticité pour une montre de luxe.

use crate::errors::ErrorCode;
use crate::state::constants::{COOLDOWN_PERIOD, LOCK_PERIOD, MAX_CERTIFICATES};
use crate::state::{Certificate, CertificationType};
use crate::IssueCertificate;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Handler pour émettre un certificat
pub fn handler(
    ctx: Context<IssueCertificate>,
    serial_number: String,
    brand: String,
    model: String,
    cert_type: CertificationType,
    estimated_value: u64,
    metadata_uri: String,
) -> Result<()> {
    let authority = &mut ctx.accounts.authority;
    let certificate = &mut ctx.accounts.certificate;
    let owner_activity = &mut ctx.accounts.owner_activity;
    let clock = Clock::get()?;

    // Vérifier que le signataire est un certificateur agréé
    require!(
        authority
            .approved_certifiers
            .contains(&ctx.accounts.certifier.key()),
        ErrorCode::UnauthorizedCertifier
    );

    // Vérifier les longueurs des chaînes
    require!(
        serial_number.len() <= Certificate::MAX_SERIAL_LEN,
        ErrorCode::StringTooLong
    );
    require!(
        brand.len() <= Certificate::MAX_BRAND_LEN,
        ErrorCode::StringTooLong
    );
    require!(
        model.len() <= Certificate::MAX_MODEL_LEN,
        ErrorCode::StringTooLong
    );
    require!(
        metadata_uri.len() <= Certificate::MAX_URI_LEN,
        ErrorCode::StringTooLong
    );

    // Initialiser UserActivity si c'est un nouveau compte
    if owner_activity.user == Pubkey::default() {
        owner_activity.user = ctx.accounts.owner.key();
        owner_activity.certificate_count = 0;
        owner_activity.last_action_at = 0;
        owner_activity.bump = ctx.bumps.owner_activity;
    }

    // Vérifier la limite de possession (max 4 certificats)
    require!(
        owner_activity.certificate_count < MAX_CERTIFICATES,
        ErrorCode::MaxCertificatesReached
    );

    // Vérifier le cooldown (5 minutes entre les actions)
    if owner_activity.last_action_at > 0 {
        let elapsed = clock.unix_timestamp - owner_activity.last_action_at;
        require!(elapsed >= COOLDOWN_PERIOD, ErrorCode::CooldownNotElapsed);
    }

    // Calculer et transférer les frais de certification
    let fee = cert_type.get_fee();
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.certifier.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        fee,
    )?;

    // Initialiser le certificat
    certificate.serial_number = serial_number.clone();
    certificate.brand = brand;
    certificate.model = model;
    certificate.cert_type = cert_type.clone();
    certificate.estimated_value = estimated_value;
    certificate.owner = ctx.accounts.owner.key();
    certificate.certifier = ctx.accounts.certifier.key();
    certificate.metadata_uri = metadata_uri;
    certificate.created_at = clock.unix_timestamp;
    certificate.last_transfer_at = clock.unix_timestamp;
    certificate.locked_until = clock.unix_timestamp + LOCK_PERIOD;
    certificate.previous_owners = Vec::new();
    certificate.bump = ctx.bumps.certificate;

    // Mettre à jour l'activité du propriétaire
    owner_activity.certificate_count += 1;
    owner_activity.last_action_at = clock.unix_timestamp;

    // Mettre à jour les compteurs de l'autorité
    authority.total_issued += 1;
    match cert_type {
        CertificationType::Standard => authority.standard_count += 1,
        CertificationType::Premium => authority.premium_count += 1,
        CertificationType::Luxury => authority.luxury_count += 1,
        CertificationType::Exceptional => authority.exceptional_count += 1,
    }

    msg!("Certificat emis pour: {}", serial_number);
    msg!("Proprietaire: {}", ctx.accounts.owner.key());
    msg!("Frais payes: {} lamports", fee);

    Ok(())
}
