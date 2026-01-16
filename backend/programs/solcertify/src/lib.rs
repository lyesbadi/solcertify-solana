// SolCertify - Programme Principal
//
// Programme Anchor pour la certification d'authenticité de montres de luxe sur Solana.
//
// Fonctionnalités:
// - Émettre des certificats d'authenticité pour montres de luxe
// - Transférer la propriété des certificats
// - Vérifier l'authenticité d'une montre
// - Gérer les certificateurs agréés
//
// Architecture:
// Le programme utilise des PDAs (Program Derived Addresses) pour stocker:
// - L'autorité de certification (singleton)
// - Les certificats individuels (par numéro de série)
// - L'activité des utilisateurs (cooldown + compteur)

use anchor_lang::prelude::*;

// Déclaration des modules
pub mod state;
pub mod errors;
pub mod instructions;

// ID du programme
declare_id!("FspmA7UoptTCbR1oq1Rd5iHg737gTeKCRfZwfJtj7Fjb");

// Programme SolCertify
//
// Ce programme permet de:
// - Certifier des montres de luxe via des certificateurs agréés
// - Transférer la propriété avec contraintes temporelles
// - Vérifier l'authenticité on-chain
// - Respecter les limites (4 certificats max par utilisateur)
#[program]
pub mod solcertify {
    // TODO: Les instructions seront implémentées dans la Phase 2
    // - initialize: Initialise l'autorité de certification
    // - add_certifier: Ajoute un certificateur agréé
    // - remove_certifier: Retire un certificateur
    // - issue_certificate: Émet un nouveau certificat
    // - transfer_certificate: Transfère la propriété
    // - verify_certificate: Vérifie l'authenticité
}
