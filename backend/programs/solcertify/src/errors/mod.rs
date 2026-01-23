use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Le certificateur n'est pas agree")]
    UnauthorizedCertifier,

    #[msg("Ce numero de serie a deja ete certifie")]
    SerialNumberAlreadyExists,

    #[msg("L'utilisateur a atteint la limite de 4 certificats")]
    MaxCertificatesReached,

    #[msg("Le cooldown de 5 minutes n'est pas encore ecoule")]
    CooldownNotElapsed,

    #[msg("Le certificat est verrouille pendant 10 minutes apres acquisition")]
    CertificateLocked,

    #[msg("Vous n'etes pas le proprietaire de ce certificat")]
    NotOwner,

    #[msg("Le certificateur existe deja dans la liste")]
    CertifierAlreadyExists,

    #[msg("Le certificateur n'existe pas dans la liste")]
    CertifierNotFound,

    #[msg("La limite de 50 certificateurs agrees est atteinte")]
    MaxCertifiersReached,

    #[msg("La chaine est trop longue")]
    StringTooLong,

    #[msg("Paiement insuffisant pour les frais de certification")]
    InsufficientPayment,

    // Nouveaux codes pour les demandes de certification
    #[msg("La demande n'est pas en attente")]
    RequestNotPending,

    #[msg("Le numero de serie est trop long (max 50 caracteres)")]
    SerialNumberTooLong,

    #[msg("La marque est trop longue (max 30 caracteres)")]
    BrandTooLong,

    #[msg("Le modele est trop long (max 50 caracteres)")]
    ModelTooLong,

    #[msg("L'URI des metadonnees est trop longue (max 200 caracteres)")]
    MetadataUriTooLong,

    #[msg("La raison du rejet est trop longue (max 200 caracteres)")]
    RejectionReasonTooLong,

    #[msg("Une demande existe deja pour ce numero de serie")]
    RequestAlreadyExists,

    // Codes d'erreur pour le système d'assignation de certificateur
    #[msg("Le certificateur n'est pas actif")]
    CertifierNotActive,

    #[msg("Le certificateur a atteint sa capacite maximale de demandes")]
    CertifierAtCapacity,

    #[msg("Seul le certificateur assigne peut traiter cette demande")]
    NotAssignedCertifier,

    #[msg("L'adresse physique est trop longue (max 200 caracteres)")]
    PhysicalAddressTooLong,

    #[msg("Le nom d'affichage est trop long (max 50 caracteres)")]
    DisplayNameTooLong,
}

