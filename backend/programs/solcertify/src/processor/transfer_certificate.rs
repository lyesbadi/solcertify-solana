// Processor: Transfer Certificate
//
// Transfère la propriété d'un certificat à un nouveau propriétaire.

use crate::errors::ErrorCode;
use crate::state::constants::{COOLDOWN_PERIOD, LOCK_PERIOD, MAX_CERTIFICATES};
use crate::state::Certificate;
use crate::TransferCertificate;
use anchor_lang::prelude::*;

/// Handler pour transférer un certificat
pub fn handler(ctx: Context<TransferCertificate>) -> Result<()> {
    let certificate = &mut ctx.accounts.certificate;
    let from_activity = &mut ctx.accounts.from_activity;
    let to_activity = &mut ctx.accounts.to_activity;
    let clock = Clock::get()?;

    // Vérifier que le signataire est le propriétaire actuel
    require!(
        ctx.accounts.from.key() == certificate.owner,
        ErrorCode::NotOwner
    );

    // Vérifier que le certificat n'est pas verrouillé
    require!(
        clock.unix_timestamp >= certificate.locked_until,
        ErrorCode::CertificateLocked
    );

    // Vérifier le cooldown du vendeur
    if from_activity.last_action_at > 0 {
        let elapsed = clock.unix_timestamp - from_activity.last_action_at;
        require!(elapsed >= COOLDOWN_PERIOD, ErrorCode::CooldownNotElapsed);
    }

    // Initialiser UserActivity du nouveau propriétaire si nécessaire
    if to_activity.user == Pubkey::default() {
        to_activity.user = ctx.accounts.to.key();
        to_activity.certificate_count = 0;
        to_activity.last_action_at = 0;
        to_activity.bump = ctx.bumps.to_activity;
    }

    // Vérifier le cooldown du nouveau propriétaire
    if to_activity.last_action_at > 0 {
        let elapsed = clock.unix_timestamp - to_activity.last_action_at;
        require!(elapsed >= COOLDOWN_PERIOD, ErrorCode::CooldownNotElapsed);
    }

    // Vérifier la limite de possession du nouveau propriétaire
    require!(
        to_activity.certificate_count < MAX_CERTIFICATES,
        ErrorCode::MaxCertificatesReached
    );

    // Sauvegarder l'ancien propriétaire dans l'historique
    let old_owner = certificate.owner;
    if certificate.previous_owners.len() < Certificate::MAX_PREVIOUS_OWNERS {
        certificate.previous_owners.push(old_owner);
    }

    // Effectuer le transfert
    certificate.owner = ctx.accounts.to.key();
    certificate.last_transfer_at = clock.unix_timestamp;
    certificate.locked_until = clock.unix_timestamp + LOCK_PERIOD;

    // Mettre à jour les compteurs
    from_activity.certificate_count = from_activity.certificate_count.saturating_sub(1);
    from_activity.last_action_at = clock.unix_timestamp;

    to_activity.certificate_count += 1;
    to_activity.last_action_at = clock.unix_timestamp;

    msg!("Certificat transfere: {}", certificate.serial_number);
    msg!("De: {}", old_owner);
    msg!("Vers: {}", ctx.accounts.to.key());
    msg!("Verrouille jusqu'a: {}", certificate.locked_until);

    Ok(())
}
