// Module processor - Logique metier des instructions
//
// Ce module contient le code logique (handlers) pour chaque instruction.
// Les structs Accounts sont definies dans lib.rs.

pub mod add_certifier;
pub mod initialize;
pub mod issue_certificate;
pub mod remove_certifier;
pub mod transfer_certificate;
pub mod verify_certificate;
pub mod request_certification;
pub mod approve_certification;
pub mod reject_certification;

