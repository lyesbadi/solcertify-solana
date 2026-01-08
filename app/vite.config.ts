import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin pour injecter Buffer globalement
const bufferPlugin = (): Plugin => ({
    name: 'buffer-plugin',
    transformIndexHtml: {
        order: 'pre',
        handler(html) {
            return html.replace(
                '<script type="module" src="/src/main.tsx"></script>',
                `<script type="module">
                    import { Buffer } from 'buffer';
                    window.Buffer = Buffer;
                    globalThis.Buffer = Buffer;
                </script>
                <script type="module" src="/src/main.tsx"></script>`
            )
        }
    }
})

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        bufferPlugin(),
        react()
    ],
    define: {
        // Polyfill pour les modules Node.js utilisés par Solana
        'process.env': {},
        global: 'globalThis',
    },
    resolve: {
        alias: {
            // Polyfills nécessaires pour @solana/web3.js
            buffer: 'buffer/',
            // Fix pour rpc-websockets avec les nouvelles versions
            'rpc-websockets/dist/lib/client': 'rpc-websockets',
            'rpc-websockets/dist/lib/client/websocket.browser': 'rpc-websockets',
        },
        // Ensure all packages use the same React instance - critical for contexts
        dedupe: ['react', 'react-dom', '@solana/wallet-adapter-react'],
    },
    optimizeDeps: {
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: 'globalThis',
            },
        },
        include: [
            'buffer',
            '@solana/web3.js',
            'rpc-websockets',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-react-ui',
            '@solana/wallet-adapter-base',
            '@solana/wallet-adapter-phantom',
            '@coral-xyz/anchor',
        ],
    },
    build: {
        rollupOptions: {
            external: [],
        },
    },
})
