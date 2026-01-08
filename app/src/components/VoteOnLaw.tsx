/**
 * Composant VoteOnLaw
 *
 * Affiche les propositions actives et permet de voter
 */

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram, voteOnProposal, Proposal } from "../utils/program";

interface VoteOnLawProps {
  proposals: Proposal[];
  onVoted: () => void;
  onError: (error: string) => void;
  loading: boolean;
}

function VoteOnLaw({ proposals, onVoted, onError, loading }: VoteOnLawProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  // État pour suivre les votes en cours
  const [votingOn, setVotingOn] = useState<string | null>(null);

  /**
   * Gère le vote sur une proposition
   */
  const handleVote = async (proposal: Proposal, approve: boolean) => {
    if (!wallet.publicKey) {
      onError("Veuillez connecter votre wallet");
      return;
    }

    setVotingOn(proposal.publicKey.toString());
    try {
      const program = getProgram(connection, wallet);
      await voteOnProposal(program, proposal.publicKey, wallet.publicKey, approve);
      onVoted();
    } catch (error: any) {
      console.error("Erreur vote:", error);

      // Gestion des erreurs courantes
      if (error.message?.includes("already in use") || error.logs?.some((l: string) => l.includes("already in use"))) {
        onError("Vous avez déjà voté sur cette proposition");
      } else if (error.message?.includes("ProposalFinalized")) {
        onError("Cette proposition est déjà finalisée");
      } else {
        onError("Erreur lors du vote: " + (error.message || "Erreur inconnue"));
      }
    } finally {
      setVotingOn(null);
    }
  };

  /**
   * Formate le temps restant avant finalisation possible
   */
  const formatTimeRemaining = (createdAt: number): string => {
    const endTime = createdAt + 600; // 10 minutes
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;

    if (remaining <= 0) return "Prêt à finaliser";

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}m ${seconds}s restantes`;
  };

  return (
    <div className="card fade-in">
      <h2> Propositions Actives</h2>

      {loading ? (
        <div className="loading">
          <span className="spinner"></span>
          Chargement des propositions...
        </div>
      ) : proposals.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
          Aucune proposition active pour le moment.
          <br />
          Soyez le premier à en créer une !
        </p>
      ) : (
        <div className="proposals-list">
          {proposals.map((proposal) => {
            const isVoting = votingOn === proposal.publicKey.toString();

            return (
              <div key={proposal.publicKey.toString()} className="proposal-item">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3>{proposal.title}</h3>
                  <span className="badge badge-active">{formatTimeRemaining(proposal.createdAt)}</span>
                </div>

                <p>{proposal.description}</p>

                <div className="vote-stats">
                  <span className="stat approve">Pour: {proposal.approveVotes}</span>
                  <span className="stat reject">Contre: {proposal.rejectVotes}</span>
                </div>

                <div className="vote-buttons">
                  <button
                    className="btn btn-approve"
                    onClick={() => handleVote(proposal, true)}
                    disabled={isVoting || !wallet.connected}
                  >
                    {isVoting ? <span className="spinner"></span> : " Approuver"}
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => handleVote(proposal, false)}
                    disabled={isVoting || !wallet.connected}
                  >
                    {isVoting ? <span className="spinner"></span> : " Rejeter"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default VoteOnLaw;
