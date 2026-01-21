import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import idl from '../idl/solcertify.json';

export const PROGRAM_ID = new PublicKey(idl.address);

export function useSolCertify() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const program = useMemo(() => {
        if (!wallet) return null;

        const provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: 'processed',
        });

        return new Program(idl as Idl, provider);
    }, [connection, wallet]);

    const getAuthorityPda = () => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("auth_v5")],
            PROGRAM_ID
        );
    };

    const getCertificatePda = (serialNumber: string) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("certificate"), Buffer.from(serialNumber)],
            PROGRAM_ID
        );
    };

    const getUserActivityPda = (user: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("user_activity"), user.toBuffer()],
            PROGRAM_ID
        );
    };

    return {
        program,
        PROGRAM_ID,
        getAuthorityPda,
        getCertificatePda,
        getUserActivityPda,
        wallet,
        connection
    };
}
