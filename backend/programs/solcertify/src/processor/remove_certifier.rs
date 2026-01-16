// Processor: Remove Certifier
//
// Retire un certificateur de la liste des agréés.

use crate::errors::ErrorCode;
use crate::RemoveCertifier;
use anchor_lang::prelude::*;

/// Handler pour retirer un certificateur
pub fn handler(ctx: Context<RemoveCertifier>, certifier: Pubkey) -> Result<()> {
    let authority = &mut ctx.accounts.authority;

    // Trouver la position du certificateur dans la liste
    let position = authority
        .approved_certifiers
        .iter()
        .position(|&c| c == certifier)
        .ok_or(ErrorCode::CertifierNotFound)?;

    // Retirer le certificateur de la liste
    authority.approved_certifiers.remove(position);

    msg!("Certificateur retire: {}", certifier);
    msg!(
        "Certificateurs restants: {}",
        authority.approved_certifiers.len()
    );

    Ok(())
}
