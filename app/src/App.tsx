/**
 * Composant principal de l'application DecentraVote
 * 
 * Affiche l'interface complète avec:
 * - Connexion wallet
 * - Formulaire de proposition
 * - Liste des propositions et votes
 * - Résultats des votes
 */

import { useEffect, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import ProposeLaw from './components/ProposeLaw'
import VoteOnLaw from './components/VoteOnLaw'
import Results from './components/Results'
import { getProgram, getProposals, Proposal } from './utils/program'

function App() {
    // Hooks Solana
    const { connection } = useConnection()
    const wallet = useWallet()

    // État local
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    /**
     * Charge les propositions depuis la blockchain
     */
    const loadProposals = async () => {
        if (!wallet.publicKey) return

        setLoading(true)
        try {
            const program = getProgram(connection, wallet)
            const fetchedProposals = await getProposals(program)
            setProposals(fetchedProposals)
        } catch (error) {
            console.error('Erreur lors du chargement:', error)
            setMessage({ type: 'error', text: 'Erreur lors du chargement des propositions' })
        } finally {
            setLoading(false)
        }
    }

    // Charge les propositions quand le wallet est connecté
    useEffect(() => {
        if (wallet.connected) {
            loadProposals()
        }
    }, [wallet.connected])

    /**
     * Affiche un message temporaire
     */
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text })
        setTimeout(() => setMessage(null), 5000)
    }

    return (
        <div className="app">
            {/* Header avec titre et bouton de connexion */}
            <header className="header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h1 style={{ margin: 0 }}> DecentraVote</h1>
                    <p style={{ margin: '0.5rem 0 0 0' }}>Système de vote décentralisé sur Solana</p>
                </div>
                <WalletMultiButton />
            </header>

            {/* Message de notification */}
            {message && (
                <div className={`message message-${message.type} fade-in`}>
                    {message.text}
                </div>
            )}

            {/* Contenu principal - visible seulement si connecté */}
            {wallet.connected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Ligne du haut: Proposer et Résultats côte à côte */}
                    <div className="grid">
                        <ProposeLaw
                            onProposalCreated={() => {
                                loadProposals()
                                showMessage('success', ' Proposition créée avec succès!')
                            }}
                            onError={(err: string) => showMessage('error', err)}
                        />

                        <Results
                            proposals={proposals}
                            onRefresh={loadProposals}
                            loading={loading}
                        />
                    </div>

                    {/* Ligne du bas: Propositions Actives pleine largeur */}
                    <VoteOnLaw
                        proposals={proposals.filter(p => !p.isFinalized)}
                        onVoted={() => {
                            loadProposals()
                            showMessage('success', ' Vote enregistré!')
                        }}
                        onError={(err: string) => showMessage('error', err)}
                        loading={loading}
                    />
                </div>
            ) : (
                /* Message si non connecté */
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2> Bienvenue sur DecentraVote</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
                        Connectez votre wallet Phantom pour commencer à voter
                    </p>
                    <div style={{ marginTop: '2rem' }}>
                        <WalletMultiButton />
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '2rem',
                marginTop: '2rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <p>Workshop SUPINFO - Développement Blockchain Solana</p>
                <p style={{ marginTop: '0.5rem' }}>
                    Propulsé par Anchor & React
                </p>
            </footer>
        </div>
    )
}

export default App
