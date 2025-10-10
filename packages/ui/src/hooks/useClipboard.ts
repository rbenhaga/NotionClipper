// packages/ui/src/hooks/useClipboard.ts - COMPLET
import { useState, useCallback } from 'react';

export interface ClipboardData {
    content: string;
    text?: string; // Alias pour compatibility
    type: 'text' | 'image' | 'html';
    timestamp?: number;
    metadata?: {
        url?: string;
        title?: string;
        selection?: string;
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

    const loadClipboard = useCallback(async () => {
        try {
            if (loadClipboardFn) {
                const data = await loadClipboardFn();
                setClipboardState(data);
                setEditedClipboard(null);
            }
        } catch (error) {
            console.error('Error loading clipboard:', error);
        }
    }, []); // ERREUR CORRIGÉE: Supprimer loadClipboardFn des dépendances

    const setClipboard = useCallback(async (data: ClipboardData) => {
        setClipboardState(data);
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