// Processor: Add Certifier
//
// Ajoute un certificateur agréé à la liste.

use crate::errors::ErrorCode;
use crate::state::CertificationAuthority;
use crate::AddCertifier;
use anchor_lang::prelude::*;

/// Handler pour ajouter un certificateur
pub fn handler(ctx: Context<AddCertifier>, certifier: Pubkey) -> Result<()> {
    let authority = &mut ctx.accounts.authority;

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

    // Ajouter le certificateur à la liste
    authority.approved_certifiers.push(certifier);

    msg!("Certificateur ajoute: {}", certifier);
    msg!(
        "Total certificateurs: {}",
        authority.approved_certifiers.len()
    );

    Ok(())
}
