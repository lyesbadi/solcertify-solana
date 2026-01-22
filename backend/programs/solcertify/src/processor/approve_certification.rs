use anchor_lang::prelude::*;
use crate::state::{RequestStatus, MAX_CERTIFICATES, LOCK_PERIOD};
use crate::errors::ErrorCode;
use crate::ApproveCertification;

/// Pourcentage des frais pour le certificateur (60%)
const CERTIFIER_SHARE_PERCENT: u64 = 60;

/// Handler pour approuver une demande de certification
/// Le certificateur valide la montre et le certificat est emis
/// Les frais sont distribues : 60% certificateur, 40% plateforme
pub fn handler(ctx: Context<ApproveCertification>) -> Result<()> {
    let clock = Clock::get()?;

    // Lire les valeurs necessaires avant les emprunts mutables
    let fee_paid = ctx.accounts.request.fee_paid;
    let serial_number = ctx.accounts.request.serial_number.clone();
    let brand = ctx.accounts.request.brand.clone();
    let model = ctx.accounts.request.model.clone();
    let cert_type = ctx.accounts.request.cert_type.clone();
    let estimated_value = ctx.accounts.request.estimated_value;
    let requester = ctx.accounts.request.requester;
    let metadata_uri = ctx.accounts.request.metadata_uri.clone();
    let request_status = ctx.accounts.request.status.clone();
    let owner_cert_count = ctx.accounts.owner_activity.certificate_count;

    // Verifier que la demande est en attente
    require!(
        request_status == RequestStatus::Pending,
        ErrorCode::RequestNotPending
    );

    // Verifier que le certificateur est agree
    require!(
        ctx.accounts.authority.approved_certifiers.contains(&ctx.accounts.certifier.key()),
        ErrorCode::UnauthorizedCertifier
    );

    // Verifier la limite de certificats du proprietaire
    require!(
        owner_cert_count < MAX_CERTIFICATES,
        ErrorCode::MaxCertificatesReached
    );

    // Calculer la distribution des frais
    let certifier_share = fee_paid * CERTIFIER_SHARE_PERCENT / 100;
    let treasury_share = fee_paid - certifier_share;

    // Transferer depuis le compte request PDA (le programme en est proprietaire)
    // Part du certificateur
    **ctx.accounts.request.to_account_info().try_borrow_mut_lamports()? -= certifier_share;
    **ctx.accounts.certifier.try_borrow_mut_lamports()? += certifier_share;
    
    // Part de la plateforme (treasury)
    **ctx.accounts.request.to_account_info().try_borrow_mut_lamports()? -= treasury_share;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += treasury_share;

    // Creer le certificat
    let certificate = &mut ctx.accounts.certificate;
    certificate.serial_number = serial_number.clone();
    certificate.brand = brand;
    certificate.model = model;
    certificate.cert_type = cert_type.clone();
    certificate.estimated_value = estimated_value;
    certificate.owner = requester;
    certificate.certifier = ctx.accounts.certifier.key();
    certificate.metadata_uri = metadata_uri;
    certificate.created_at = clock.unix_timestamp;
    certificate.last_transfer_at = clock.unix_timestamp;
    certificate.locked_until = clock.unix_timestamp + LOCK_PERIOD;
    certificate.previous_owners = Vec::new();
    certificate.bump = ctx.bumps.certificate;

    // Mettre a jour le UserActivity du proprietaire
    let owner_activity = &mut ctx.accounts.owner_activity;
    if owner_activity.user == Pubkey::default() {
        owner_activity.user = requester;
        owner_activity.bump = ctx.bumps.owner_activity;
    }
    owner_activity.certificate_count += 1;
    owner_activity.last_action_at = clock.unix_timestamp;

    // Mettre a jour les stats de l'autorite
    let authority = &mut ctx.accounts.authority;
    authority.total_issued += 1;
    match cert_type {
        crate::state::CertificationType::Standard => authority.standard_count += 1,
        crate::state::CertificationType::Premium => authority.premium_count += 1,
        crate::state::CertificationType::Luxury => authority.luxury_count += 1,
        crate::state::CertificationType::Exceptional => authority.exceptional_count += 1,
    }

    // Marquer la demande comme approuvee
    let request = &mut ctx.accounts.request;
    request.status = RequestStatus::Approved;
    request.assigned_certifier = Some(ctx.accounts.certifier.key());
    request.resolved_at = clock.unix_timestamp;

    msg!("Certification approved for: {}", serial_number);
    msg!("Certifier received: {} lamports", certifier_share);

    Ok(())
}
