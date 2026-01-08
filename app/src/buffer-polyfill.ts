/**
 * Polyfill Buffer pour le navigateur
 * Ce fichier DOIT être importé en premier dans main.tsx
 */
import { Buffer } from 'buffer';

// Ajouter Buffer au contexte global AVANT tout autre import
declare global {
    interface Window {
        Buffer: typeof Buffer;
    }
}

(window as any).Buffer = Buffer;
(globalThis as any).Buffer = Buffer;

// Export par défaut pour s'assurer qu'il est bien chargé
export default Buffer;
