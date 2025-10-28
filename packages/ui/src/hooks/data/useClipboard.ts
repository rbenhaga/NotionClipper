// packages/ui/src/hooks/useClipboard.ts - COMPLET
import { useState, useCallback } from 'react';

export interface ClipboardData {
    content: string | Uint8Array;
    text?: string; // Alias pour compatibility
    type: 'text' | 'image' | 'html';
    timestamp?: number;
    preview?: string; // Data URL pour les images
    bufferSize?: number; // Taille du buffer pour les images
    metadata?: {
        url?: string;
        title?: string;
        selection?: string;
        dimensions?: { width: number; height: number };
        format?: string;
        mimeType?: string;
    };
}

export interface UseClipboardReturn {
    clipboard: ClipboardData | null;
    editedClipboard: ClipboardData | null;
    setEditedClipboard: (data: ClipboardData | null) => void;
    loadClipboard: () => Promise<void>;
    setClipboard: (data: ClipboardData) => Promise<void>;
    clearClipboard: () => Promise<void>;
}

/**
 * Hook pour gérer le presse-papiers
 * Compatible avec Electron et WebExtension
 */
export function useClipboard(
    loadClipboardFn?: () => Promise<ClipboardData | null>,
    setClipboardFn?: (data: ClipboardData) => Promise<void>,
    clearClipboardFn?: () => Promise<void>
): UseClipboardReturn {
    const [clipboard, setClipboardState] = useState<ClipboardData | null>(null);
    const [editedClipboard, setEditedClipboard] = useState<ClipboardData | null>(null);
    const [lastHash, setLastHash] = useState<string | null>(null);

    const loadClipboard = useCallback(async () => {
        try {
            if (loadClipboardFn) {
                const data = await loadClipboardFn();

                // ✅ PROTECTION: Éviter les mises à jour inutiles si le contenu n'a pas changé
                const currentHash = data ?
                    (data.content ?
                        (typeof data.content === 'string' ? data.content.substring(0, 100) : String(data.content).substring(0, 100)) :
                        data.text ?
                            (typeof data.text === 'string' ? data.text.substring(0, 100) : `${data.type}-${data.timestamp}`) :
                            `${data.type}-${data.timestamp}`) :
                    null;

                // Utiliser une fonction de mise à jour pour éviter la dépendance sur lastHash
                setLastHash(prevHash => {
                    if (currentHash !== prevHash) {
                        setClipboardState(data);
                        return currentHash;
                    }
                    return prevHash;
                });
            }
        } catch (error) {
            console.error('[CLIPBOARD HOOK] ❌ Error loading clipboard:', error);
        }
    }, []); // ✅ Suppression de la dépendance problématique

    const setClipboard = useCallback(async (data: ClipboardData) => {
        setClipboardState(data);
        // Réinitialiser editedClipboard seulement quand on définit explicitement le clipboard
        setEditedClipboard(null);

        if (setClipboardFn) {
            await setClipboardFn(data);
        }
    }, []); // ERREUR CORRIGÉE: Supprimer setClipboardFn des dépendances

    const clearClipboard = useCallback(async () => {
        setClipboardState(null);
        setEditedClipboard(null);

        if (clearClipboardFn) {
            await clearClipboardFn();
        }
    }, []); // ERREUR CORRIGÉE: Supprimer clearClipboardFn des dépendances

    return {
        clipboard,
        editedClipboard,
        setEditedClipboard,
        loadClipboard,
        setClipboard,
        clearClipboard
    };
}