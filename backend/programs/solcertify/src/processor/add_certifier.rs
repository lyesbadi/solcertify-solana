// Processor: Add Certifier
//
// Ajoute un certificateur agréé à la liste et crée son profil avec statistiques.

use crate::errors::ErrorCode;
use crate::state::{CertificationAuthority, CertifierProfile};
use crate::AddCertifier;
use anchor_lang::prelude::*;

/// Handler pour ajouter un certificateur avec son profil
pub fn handler(
    ctx: Context<AddCertifier>, 
    certifier: Pubkey,
    display_name: String,
    physical_address: String,
) -> Result<()> {
    let clock = Clock::get()?;
    let authority = &mut ctx.accounts.authority;

    // Valider les longueurs des champs
    require!(
        display_name.len() <= CertifierProfile::MAX_NAME_LENGTH,
        ErrorCode::DisplayNameTooLong
    );
    require!(
        physical_address.len() <= CertifierProfile::MAX_ADDRESS_LENGTH,
        ErrorCode::PhysicalAddressTooLong
    );

    // Vérifier que le certificateur n'est pas déjà dans la liste
    require!(
        !authority.approved_certifiers.contains(&certifier),
        ErrorCode::CertifierAlreadyExists
    );

    // Vérifier la limite maximale de certificateurs
    require!(
        authority.approved_certifiers.len() < CertificationAuthority::MAX_CERTIFIERS,
        ErrorCode::MaxCertifiersReached
    );

    // Ajouter le certificateur à la liste d'autorité
    authority.approved_certifiers.push(certifier);

    // Initialiser le profil du certificateur
    let profile = &mut ctx.accounts.certifier_profile;
    profile.certifier = certifier;
    profile.display_name = display_name.clone();
    profile.physical_address = physical_address.clone();
    profile.current_load = 0;
    profile.total_processed = 0;
    profile.total_processing_time = 0;
    profile.is_active = true;
    profile.registered_at = clock.unix_timestamp;
    profile.bump = ctx.bumps.certifier_profile;

    msg!("Certificateur ajouté: {}", certifier);
    msg!("Nom: {}", display_name);
    msg!("Adresse: {}", physical_address);
    msg!(
        "Total certificateurs: {}",
        authority.approved_certifiers.len()
    );

    Ok(())
}
