/**
 * Point d'entrée de l'application React
 * Configure les providers Solana et le wallet adapter
 */

import ReactDOM from 'react-dom/client'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import App from './App'
import './index.css'

// Import des styles du wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css'

// Configuration du réseau
// Pour localhost : 'http://localhost:8899' (nécessite solana-test-validator)
// Pour devnet (réseau de test public) : 'https://api.devnet.solana.com'
const network = 'http://localhost:8899'

// Wallets supportés
const wallets: any[] = []

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ConnectionProvider endpoint={network}>
        <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
                <App />
            </WalletModalProvider>
        </WalletProvider>
    </ConnectionProvider>
)
