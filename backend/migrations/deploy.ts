/**
 * Script de deploiement Anchor
 * 
 * Ce script est execute par `anchor migrate`
 * Il permet d'initialiser l'etat du programme si necessaire
 */

import { AnchorProvider } from '@coral-xyz/anchor'

// Note: Pour SolCertify, pas d'initialisation speciale requise ici
// Le programme est pret a l'emploi apres deploiement
// L'initialisation (Authority, Treasury, etc.) se fait via setup_dev.ts

module.exports = async function (provider: AnchorProvider) {
    console.log(" Deploiement de SolCertify")
    console.log("   Provider:", provider.connection.rpcEndpoint)
    console.log("   Wallet:", provider.wallet.publicKey.toString())
    console.log("")
    console.log(" Programme deploye avec succes!")
    console.log("")
    console.log("Prochaines etapes:")
    console.log("1. Lancez le script de config: npx ts-node scripts/setup_dev.ts")
    console.log("2. Ou utilisez le pipeline complet: ./scripts/full_pipeline.ps1")
}
