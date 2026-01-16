# Backend - Smart Contract Solana

Ce dossier contient le smart contract SolCertify écrit en Rust avec le framework Anchor.

## Structure

```
backend/
├── programs/solcertify/    # Code du smart contract
│   └── src/
│       ├── lib.rs          # Point d'entrée
│       ├── state/          # Structures de données
│       ├── instructions/   # Logique métier (Phase 2)
│       └── errors/         # Codes d'erreur
├── tests/                  # Tests unitaires (TypeScript)
├── Anchor.toml            # Configuration Anchor
└── Cargo.toml             # Configuration Rust
```

## Commandes

```bash
# Compiler le programme
anchor build

# Lancer les tests
anchor test

# Déployer sur devnet
anchor deploy --provider.cluster devnet

# Générer l'IDL
anchor idl init <PROGRAM_ID> -f target/idl/solcertify.json
```

## Structures de données

- **CertificationAuthority**: Autorité de certification (singleton)
- **Certificate**: Certificat d'authenticité pour une montre
- **UserActivity**: Activité utilisateur (cooldown + compteur)
- **CertificationType**: Enum des 4 types (Standard/Premium/Luxury/Exceptional)

## Contraintes

- Maximum 4 certificats par utilisateur
- Cooldown de 5 minutes entre transactions
- Lock de 10 minutes après acquisition
- Certificateurs agréés uniquement
- Paiement en SOL selon le type

## Phase actuelle

Phase 1 ✅ - Structures créées, compilation réussie
Phase 2 ⏳ - Implémentation des instructions à venir
