# DecentraVote - Vote Décentralisé sur Solana

> **Workshop de 3 heures** pour apprendre Solana avec Anchor

## Description

DecentraVote permet de proposer des lois, voter, et finaliser les résultats sur la blockchain Solana.

## Fonctionnalités

- Proposer des lois
- Voter (Approuver/Rejeter)
- Un vote par adresse
- Finalisation après 10 minutes

## Quick Start

```bash
# Prérequis - voir SETUP.md
npm install
anchor build
anchor test
```

## Structure

```
decentravote-solana/
├── programs/decentravote/src/   # Programme Solana
├── tests/                        # Tests Anchor
└── app/                          # Frontend React
```
