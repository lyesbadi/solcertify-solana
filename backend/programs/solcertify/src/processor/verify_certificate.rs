// Processor: Verify Certificate
//
// Vérifie l'authenticité d'un certificat et retourne ses informations.

use crate::state::CertificationType;
use crate::{CertificateInfo, VerifyCertificate};
use anchor_lang::prelude::*;

/// Handler pour vérifier un certificat
pub fn handler(ctx: Context<VerifyCertificate>) -> Result<CertificateInfo> {
    let certificate = &ctx.accounts.certificate;
    let authority = &ctx.accounts.authority;
    let clock = Clock::get()?;

    // Convertir le type de certification en u8
    let cert_type_u8 = match certificate.cert_type {
        CertificationType::Standard => 0,
        CertificationType::Premium => 1,
        CertificationType::Luxury => 2,
        CertificationType::Exceptional => 3,
    };

    // Déterminer si le certificat est actuellement verrouillé
    let is_locked = clock.unix_timestamp < certificate.locked_until;

    let info = CertificateInfo {
        serial_number: certificate.serial_number.clone(),
        brand: certificate.brand.clone(),
        model: certificate.model.clone(),
        cert_type: cert_type_u8,
        estimated_value: certificate.estimated_value,
        owner: certificate.owner,
        certifier: certificate.certifier,
        metadata_uri: certificate.metadata_uri.clone(),
        created_at: certificate.created_at,
        last_transfer_at: certificate.last_transfer_at,
        locked_until: certificate.locked_until,
        is_locked,
        previous_owners_count: certificate.previous_owners.len() as u8,
        total_certificates_issued: authority.total_issued,
    };

    msg!("Verification du certificat: {}", certificate.serial_number);
    msg!(
        "Marque: {} - Modele: {}",
        certificate.brand,
        certificate.model
    );
    msg!("Proprietaire actuel: {}", certificate.owner);
    msg!("Verrouille: {}", is_locked);

    Ok(info)
}
