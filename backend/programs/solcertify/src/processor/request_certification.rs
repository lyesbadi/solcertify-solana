use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{CertificationRequest, CertificationType, RequestStatus};
use crate::errors::ErrorCode;
use crate::RequestCertification;

/// Handler pour soumettre une demande de certification
/// L'utilisateur paie les frais upfront et choisit un certificateur spécifique
/// Le certificateur cible voit sa charge incrémentée
pub fn handler(
    ctx: Context<RequestCertification>,
    serial_number: String,
    brand: String,
    model: String,
    cert_type: CertificationType,
    estimated_value: u64,
    metadata_uri: String,
    target_certifier: Pubkey, // Certificateur choisi par le demandeur
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

    // Vérifier que le certificateur est dans la liste des agréés
    require!(
        ctx.accounts.authority.is_approved_certifier(&target_certifier),
        ErrorCode::UnauthorizedCertifier
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

    // Incrémenter la charge du certificateur cible
    let certifier_profile = &mut ctx.accounts.certifier_profile;
    certifier_profile.increment_load()?;

    // Initialiser la demande avec le certificateur assigné
    let request = &mut ctx.accounts.request;
    request.requester = ctx.accounts.requester.key();
    request.serial_number = serial_number.clone();
    request.brand = brand;
    request.model = model;
    request.cert_type = cert_type;
    request.estimated_value = estimated_value;
    request.metadata_uri = metadata_uri;
    request.status = RequestStatus::Pending;
    request.assigned_certifier = Some(target_certifier); // ASSIGNATION OBLIGATOIRE
    request.rejection_reason = String::new();
    request.created_at = clock.unix_timestamp;
    request.resolved_at = 0;
    request.fee_paid = fee;
    request.bump = ctx.bumps.request;

    msg!("Certification request created for: {}", serial_number);
    msg!("Assigned to certifier: {}", target_certifier);
    msg!("Fee paid: {} lamports", fee);

    Ok(())
}
