/**
 * Composant ProposeLaw
 * 
 * Formulaire pour créer une nouvelle proposition de loi
 */

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { getProgram, createProposal } from '../utils/program'

interface ProposeLawProps {
    onProposalCreated: () => void
    onError: (error: string) => void
}

function ProposeLaw({ onProposalCreated, onError }: ProposeLawProps) {
    const { connection } = useConnection()
    const wallet = useWallet()

    // État du formulaire
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    /**
     * Gère la soumission du formulaire
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!title.trim()) {
            onError('Le titre est requis')
            return
        }
        if (!description.trim()) {
            onError('La description est requise')
            return
        }
        if (title.length > 50) {
            onError('Le titre ne doit pas dépasser 50 caractères')
            return
        }
        if (description.length > 200) {
            onError('La description ne doit pas dépasser 200 caractères')
            return
        }
        if (!wallet.publicKey) {
            onError('Veuillez connecter votre wallet')
            return
        }

        setLoading(true)
        try {
            const program = getProgram(connection, wallet)
            await createProposal(program, title, description, wallet.publicKey)

            // Reset du formulaire
            setTitle('')
            setDescription('')
            onProposalCreated()
        } catch (error: any) {
            console.error('Erreur création proposition:', error)

            // Gestion des erreurs courantes
            if (error.message?.includes('already in use')) {
                onError('Une proposition avec ce titre existe déjà')
            } else {
                onError('Erreur lors de la création: ' + (error.message || 'Erreur inconnue'))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card fade-in">
            <h2> Proposer une Nouvelle Loi</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">
                        Titre <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            ({title.length}/50)
                        </span>
                    </label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Loi sur la transparence budgétaire"
                        maxLength={50}
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">
                        Description <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            ({description.length}/200)
                        </span>
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez votre proposition en détail..."
                        maxLength={200}
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !wallet.connected}
                    style={{ width: '100%' }}
                >
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            Création en cours...
                        </>
                    ) : (
                        ' Soumettre la Proposition'
                    )}
                </button>
            </form>
        </div>
    )
}

export default ProposeLaw
