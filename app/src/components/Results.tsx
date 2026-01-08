/**
 * Composant Results
 * 
 * Affiche les résultats des votes (propositions finalisées et en cours)
 */

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { getProgram, finalizeProposal, Proposal } from '../utils/program'

interface ResultsProps {
    proposals: Proposal[]
    onRefresh: () => void
    loading: boolean
}

function Results({ proposals, onRefresh, loading }: ResultsProps) {
    const { connection } = useConnection()
    const wallet = useWallet()

    const [finalizingId, setFinalizingId] = useState<string | null>(null)

    // Sépare les propositions finalisées des actives
    const finalized = proposals.filter(p => p.isFinalized)
    const active = proposals.filter(p => !p.isFinalized)

    /**
     * Détermine le résultat d'une proposition
     */
    const getResult = (proposal: Proposal): { text: string, color: string } => {
        if (proposal.approveVotes > proposal.rejectVotes) {
            return { text: ' APPROUVÉE', color: 'var(--success)' }
        } else if (proposal.rejectVotes > proposal.approveVotes) {
            return { text: ' REJETÉE', color: 'var(--error)' }
        } else {
            return { text: ' ÉGALITÉ', color: 'var(--text-muted)' }
        }
    }

    /**
     * Vérifie si une proposition peut être finalisée
     */
    const canFinalize = (proposal: Proposal): boolean => {
        const endTime = proposal.createdAt + 600 // 10 minutes
        const now = Math.floor(Date.now() / 1000)
        return now >= endTime && !proposal.isFinalized
    }

    /**
     * Gère la finalisation d'une proposition
     */
    const handleFinalize = async (proposal: Proposal) => {
        if (!wallet.publicKey) return

        // Double vérification que la proposition peut être finalisée
        if (!canFinalize(proposal)) {
            const timeLeft = (proposal.createdAt + 600) - Math.floor(Date.now() / 1000)
            const minutes = Math.floor(timeLeft / 60)
            const seconds = timeLeft % 60
            alert(`Veuillez attendre encore ${minutes}m ${seconds}s avant de finaliser`)
            return
        }

        setFinalizingId(proposal.publicKey.toString())
        try {
            const program = getProgram(connection, wallet)
            await finalizeProposal(program, proposal.publicKey, wallet.publicKey)
            onRefresh()
        } catch (error: any) {
            console.error('Erreur finalisation:', error)
            if (error.message?.includes('TooEarly')) {
                alert('Le délai de 10 minutes n\'est pas encore écoulé')
            }
        } finally {
            setFinalizingId(null)
        }
    }

    /**
     * Calcule le pourcentage de votes pour
     */
    const getApprovalPercentage = (proposal: Proposal): number => {
        const total = proposal.approveVotes + proposal.rejectVotes
        if (total === 0) return 50
        return Math.round((proposal.approveVotes / total) * 100)
    }

    return (
        <div className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2> Résultats</h2>
                <button
                    className="btn btn-primary"
                    onClick={onRefresh}
                    disabled={loading}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    {loading ? <span className="spinner"></span> : ' Actualiser'}
                </button>
            </div>

            {/* Statistiques globales */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    background: 'var(--surface-light)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{proposals.length}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total</div>
                </div>
                <div style={{
                    background: 'var(--surface-light)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{active.length}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Actives</div>
                </div>
                <div style={{
                    background: 'var(--surface-light)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>{finalized.length}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Finalisées</div>
                </div>
            </div>

            {/* Liste des propositions */}
            {proposals.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    Aucune proposition pour le moment
                </p>
            ) : (
                <div className="proposals-list">
                    {/* Propositions finalisées d'abord */}
                    {finalized.map((proposal) => {
                        const result = getResult(proposal)
                        const percentage = getApprovalPercentage(proposal)

                        return (
                            <div key={proposal.publicKey.toString()} className="proposal-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3>{proposal.title}</h3>
                                    <span className="badge badge-finalized">Finalisée</span>
                                </div>

                                {/* Barre de progression */}
                                <div style={{
                                    background: 'var(--error)',
                                    borderRadius: '4px',
                                    height: '8px',
                                    margin: '0.75rem 0',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        background: 'var(--success)',
                                        width: `${percentage}%`,
                                        height: '100%',
                                        transition: 'width 0.3s'
                                    }}></div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="vote-stats" style={{ marginBottom: 0 }}>
                                        <span className="stat approve"> {proposal.approveVotes}</span>
                                        <span className="stat reject"> {proposal.rejectVotes}</span>
                                    </div>
                                    <span style={{ fontWeight: 'bold', color: result.color }}>{result.text}</span>
                                </div>
                            </div>
                        )
                    })}

                    {/* Propositions actives pouvant être finalisées */}
                    {active.filter(canFinalize).map((proposal) => (
                        <div key={proposal.publicKey.toString()} className="proposal-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3>{proposal.title}</h3>
                                <span className="badge badge-active">Prête</span>
                            </div>

                            <div className="vote-stats">
                                <span className="stat approve"> {proposal.approveVotes}</span>
                                <span className="stat reject"> {proposal.rejectVotes}</span>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={() => handleFinalize(proposal)}
                                disabled={finalizingId === proposal.publicKey.toString() || !wallet.connected}
                                style={{ width: '100%' }}
                            >
                                {finalizingId === proposal.publicKey.toString() ? (
                                    <><span className="spinner"></span> Finalisation...</>
                                ) : (
                                    ' Finaliser cette proposition'
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Results
