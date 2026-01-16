/**
 * Script de déploiement Anchor
 * 
 * Ce script est exécuté par `anchor migrate`
 * Il permet d'initialiser l'état du programme si nécessaire
 */

import { AnchorProvider } from '@coral-xyz/anchor'

// Note: Pour DecentraVote, pas d'initialisation spéciale requise
// Le programme est prêt à l'emploi après déploiement

module.exports = async function (provider: AnchorProvider) {
    console.log(" Déploiement de DecentraVote")
    console.log("   Provider:", provider.connection.rpcEndpoint)
    console.log("   Wallet:", provider.wallet.publicKey.toString())
    console.log("")
    console.log(" Programme déployé avec succès!")
    console.log("")
    console.log("Prochaines étapes:")
    console.log("1. Récupérez le Program ID avec: solana address -k target/deploy/decentravote-keypair.json")
    console.log("2. Mettez à jour lib.rs avec le Program ID")
    console.log("3. Mettez à jour app/src/utils/program.ts")
    console.log("4. Recompilez avec: anchor build")
}
