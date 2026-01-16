/**
 * Utilitaires pour interagir avec le programme DecentraVote
 *
 * Ce fichier contient les fonctions pour:
 * - Initialiser le programme Anchor
 * - Récupérer les propositions
 * - Calculer les PDAs
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'

// TODO: Remplacez par votre Program ID après `anchor build`
export const PROGRAM_ID = new PublicKey('FspmA7UoptTCbR1oq1Rd5iHg737gTeKCRfZwfJtj7Fjb')

// Interface pour les propositions (correspondant au Rust)
export interface Proposal {
    publicKey: PublicKey
    title: string
    description: string
    proposer: PublicKey
    approveVotes: number
    rejectVotes: number
    createdAt: number
    isFinalized: boolean
    bump: number
}

// IDL pour Anchor 0.29.0 (format plus simple)
const IDL: any = {
    version: "0.1.0",
    name: "decentravote",
    instructions: [
        {
            name: "proposeLaw",
            accounts: [
                { name: "proposer", isMut: true, isSigner: true },
                { name: "proposal", isMut: true, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false }
            ],
            args: [
                { name: "title", type: "string" },
                { name: "description", type: "string" }
            ]
        },
        {
            name: "vote",
            accounts: [
                { name: "voter", isMut: true, isSigner: true },
                { name: "proposal", isMut: true, isSigner: false },
                { name: "voteRecord", isMut: true, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false }
            ],
            args: [
                { name: "choice", type: { defined: "VoteChoice" } }
            ]
        },
        {
            name: "finalizeProposal",
            accounts: [
                { name: "authority", isMut: true, isSigner: true },
                { name: "proposal", isMut: true, isSigner: false }
            ],
            args: []
        }
    ],
    accounts: [
        {
            name: "proposal",
            type: {
                kind: "struct",
                fields: [
                    { name: "title", type: "string" },
                    { name: "description", type: "string" },
                    { name: "proposer", type: "publicKey" },
                    { name: "approveVotes", type: "u64" },
                    { name: "rejectVotes", type: "u64" },
                    { name: "createdAt", type: "i64" },
                    { name: "isFinalized", type: "bool" },
                    { name: "bump", type: "u8" }
                ]
            }
        },
        {
            name: "voteRecord",
            type: {
                kind: "struct",
                fields: [
                    { name: "voter", type: "publicKey" },
                    { name: "proposal", type: "publicKey" },
                    { name: "vote", type: { defined: "VoteChoice" } },
                    { name: "bump", type: "u8" }
                ]
            }
        }
    ],
    types: [
        {
            name: "VoteChoice",
            type: {
                kind: "enum",
                variants: [
                    { name: "Approve" },
                    { name: "Reject" }
                ]
            }
        }
    ]
}

/**
 * Crée une instance du programme Anchor
 */
export function getProgram(
    connection: Connection,
    wallet: WalletContextState
): Program {
    const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
    )
    // Pour Anchor 0.29.0: new Program(idl, programId, provider)
    return new Program(IDL, PROGRAM_ID, provider)
}

/**
 * Calcule le PDA pour une proposition
 */
export function getProposalPda(title: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("proposal"), Buffer.from(title)],
        PROGRAM_ID
    )
}

/**
 * Calcule le PDA pour un vote record
 */
export function getVoteRecordPda(
    proposalPda: PublicKey,
    voterPubkey: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), proposalPda.toBuffer(), voterPubkey.toBuffer()],
        PROGRAM_ID
    )
}

/**
 * Récupère toutes les propositions
 */
export async function getProposals(program: Program): Promise<Proposal[]> {
    try {
        const accounts = await (program.account as any).proposal.all()
        return accounts.map((acc: any) => ({
            publicKey: acc.publicKey,
            title: acc.account.title as string,
            description: acc.account.description as string,
            proposer: acc.account.proposer as PublicKey,
            approveVotes: (acc.account.approveVotes as any).toNumber(),
            rejectVotes: (acc.account.rejectVotes as any).toNumber(),
            createdAt: (acc.account.createdAt as any).toNumber(),
            isFinalized: acc.account.isFinalized as boolean,
            bump: acc.account.bump as number
        }))
    } catch (error) {
        console.error('Erreur getProposals:', error)
        return []
    }
}

/**
 * Crée une nouvelle proposition
 */
export async function createProposal(
    program: Program,
    title: string,
    description: string,
    proposerPubkey: PublicKey
): Promise<string> {
    const [proposalPda] = getProposalPda(title)

    const tx = await program.methods
        .proposeLaw(title, description)
        .accounts({
            proposer: proposerPubkey,
            proposal: proposalPda,
            systemProgram: SystemProgram.programId,
        })
        .rpc()

    return tx
}

/**
 * Vote sur une proposition
 */
export async function voteOnProposal(
    program: Program,
    proposalPda: PublicKey,
    voterPubkey: PublicKey,
    approve: boolean
): Promise<string> {
    const [voteRecordPda] = getVoteRecordPda(proposalPda, voterPubkey)

    const choice = approve ? { approve: {} } : { reject: {} }

    const tx = await program.methods
        .vote(choice)
        .accounts({
            voter: voterPubkey,
            proposal: proposalPda,
            voteRecord: voteRecordPda,
            systemProgram: SystemProgram.programId,
        })
        .rpc()

    return tx
}

/**
 * Finalise une proposition
 */
export async function finalizeProposal(
    program: Program,
    proposalPda: PublicKey,
    authorityPubkey: PublicKey
): Promise<string> {
    const tx = await program.methods
        .finalizeProposal()
        .accounts({
            authority: authorityPubkey,
            proposal: proposalPda,
        })
        .rpc()

    return tx
}
