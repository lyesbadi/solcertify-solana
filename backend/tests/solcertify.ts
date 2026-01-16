import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcertify } from "../target/types/solcertify";

describe("solcertify", () => {
  // Configuration de l'environnement de test
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Solcertify as Program<Solcertify>;

  // TODO Phase 3: Implémenter les tests
  it("Programme initialisé correctement", () => {
    // Les tests seront implémentés en Phase 3
    console.log("Programme ID:", program.programId.toBase58());
  });
});
