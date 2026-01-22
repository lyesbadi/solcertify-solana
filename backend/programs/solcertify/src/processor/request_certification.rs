use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{CertificationRequest, CertificationType, RequestStatus};
use crate::errors::ErrorCode;
use crate::RequestCertification;

/// Handler pour soumettre une demande de certification
/// L'utilisateur paie les frais upfront, qui seront distribues lors de l'approbation
pub fn handler(
    ctx: Context<RequestCertification>,
    serial_number: String,
    brand: String,
    model: String,
    cert_type: CertificationType,
    estimated_value: u64,
    metadata_uri: String,
) -> Result<()> {
    let clock = Clock::get()?;

    // Valider les longueurs
    require!(
        serial_number.len() <= CertificationRequest::MAX_SERIAL_LENGTH,
        ErrorCode::SerialNumberTooLong
    );
    require!(
        brand.len() <= CertificationRequest::MAX_BRAND_LENGTH,
        ErrorCode::BrandTooLong
    );
    require!(
        model.len() <= CertificationRequest::MAX_MODEL_LENGTH,
        ErrorCode::ModelTooLong
    );
    require!(
        metadata_uri.len() <= CertificationRequest::MAX_URI_LENGTH,
        ErrorCode::MetadataUriTooLong
    );

    // Calculer les frais
    let fee = cert_type.get_fee();

    // Transferer les frais vers le compte request PDA (le programme en est proprietaire)
    // Les frais seront distribues lors de l'approbation ou rembourses lors du rejet
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.requester.to_account_info(),
                to: ctx.accounts.request.to_account_info(),
            },
        ),
        fee,
    )?;

    // Initialiser la demande
    let request = &mut ctx.accounts.request;
    request.requester = ctx.accounts.requester.key();
    request.serial_number = serial_number.clone();
    request.brand = brand;
    request.model = model;
    request.cert_type = cert_type;
    request.estimated_value = estimated_value;
    request.metadata_uri = metadata_uri;
    request.status = RequestStatus::Pending;
    request.assigned_certifier = None;
    request.rejection_reason = String::new();
    request.created_at = clock.unix_timestamp;
    request.resolved_at = 0;
    request.fee_paid = fee;
    request.bump = ctx.bumps.request;

    msg!("Certification request created for: {}", serial_number);
    msg!("Fee paid: {} lamports", fee);

    Ok(())
}
