use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Le certificateur n'est pas agréé")]
    UnauthorizedCertifier,

    #[msg("Ce numéro de série a déjà été certifié")]
    SerialNumberAlreadyExists,

    #[msg("L'utilisateur a atteint la limite de 4 certificats")]
    MaxCertificatesReached,

    #[msg("Le cooldown de 5 minutes n'est pas encore écoulé")]
    CooldownNotElapsed,

    #[msg("Le certificat est verrouillé pendant 10 minutes après acquisition")]
    CertificateLocked,

    #[msg("Vous n'êtes pas le propriétaire de ce certificat")]
    NotOwner,

    #[msg("Le certificateur existe déjà dans la liste")]
    CertifierAlreadyExists,

    #[msg("Le certificateur n'existe pas dans la liste")]
    CertifierNotFound,

    #[msg("La limite de 50 certificateurs agréés est atteinte")]
    MaxCertifiersReached,

    #[msg("La chaîne est trop longue")]
    StringTooLong,

    #[msg("Paiement insuffisant pour les frais de certification")]
    InsufficientPayment,
}
