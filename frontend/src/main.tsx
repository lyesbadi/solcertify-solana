import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import App from './App';
import './index.css';

import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = 'http://localhost:8899';

const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <App />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    </React.StrictMode>
);
