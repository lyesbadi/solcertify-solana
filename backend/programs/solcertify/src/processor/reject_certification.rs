use anchor_lang::prelude::*;
use crate::state::{CertificationRequest, RequestStatus};
use crate::errors::ErrorCode;
use crate::RejectCertification;

/// Handler pour rejeter une demande de certification
/// SEUL le certificateur assigné peut rejeter cette demande
/// Les frais sont rembourses au demandeur
pub fn handler(ctx: Context<RejectCertification>, reason: String) -> Result<()> {
    let clock = Clock::get()?;

    // Lire les valeurs avant les emprunts mutables
    let request_status = ctx.accounts.request.status.clone();
    let fee_paid = ctx.accounts.request.fee_paid;
    let serial_number = ctx.accounts.request.serial_number.clone();
    let assigned_certifier = ctx.accounts.request.assigned_certifier;
    let created_at = ctx.accounts.request.created_at;

    // Verifier que la demande est en attente
    require!(
        request_status == RequestStatus::Pending,
        ErrorCode::RequestNotPending
    );

    // NOUVELLE VERIFICATION: Seul le certificateur ASSIGNÉ peut rejeter
    require!(
        assigned_certifier == Some(ctx.accounts.certifier.key()),
        ErrorCode::NotAssignedCertifier
    );

    // Verifier que le certificateur est toujours agrée (sécurité)
    require!(
        ctx.accounts.authority.approved_certifiers.contains(&ctx.accounts.certifier.key()),
        ErrorCode::UnauthorizedCertifier
    );

    // Valider la raison
    require!(
        reason.len() <= CertificationRequest::MAX_REJECTION_REASON,
        ErrorCode::RejectionReasonTooLong
    );

    // Rembourser les frais au demandeur depuis le compte request PDA
    **ctx.accounts.request.to_account_info().try_borrow_mut_lamports()? -= fee_paid;
    **ctx.accounts.requester.try_borrow_mut_lamports()? += fee_paid;

    // Mettre à jour les stats du profil certificateur
    let certifier_profile = &mut ctx.accounts.certifier_profile;
    let processing_time = (clock.unix_timestamp - created_at) as u64;
    certifier_profile.resolve_request(processing_time)?;

    // Marquer la demande comme rejetee
    let request = &mut ctx.accounts.request;
    request.status = RequestStatus::Rejected;
    request.rejection_reason = reason.clone();
    request.resolved_at = clock.unix_timestamp;

    msg!("Certification rejected for: {}", serial_number);
    msg!("Reason: {}", reason);
    msg!("Refunded: {} lamports", fee_paid);

    Ok(())
}
