import { useState, useCallback } from 'react';

export interface ClipboardData {
    content: string;
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
    clearClipboard: () => Promise<void>;
}

/**
 * Hook pour gérer le presse-papiers
 * Compatible avec Electron et WebExtension
 */
export function useClipboard(
    loadClipboardFn?: () => Promise<ClipboardData | null>,
    clearClipboardFn?: () => Promise<void>
): UseClipboardReturn {
    const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
    const [editedClipboard, setEditedClipboard] = useState<ClipboardData | null>(null);

    const loadClipboard = useCallback(async () => {
        try {
            if (loadClipboardFn) {
                const data = await loadClipboardFn();
                setClipboard(data);
                setEditedClipboard(null);
            }
        } catch (error) {
            console.error('Error loading clipboard:', error);
        }
    }, [loadClipboardFn]);

    const clearClipboard = useCallback(async () => {
        setClipboard(null);
        setEditedClipboard(null);

        if (clearClipboardFn) {
            await clearClipboardFn();
        }
    }, [clearClipboardFn]);

    return {
        clipboard,
        editedClipboard,
        setEditedClipboard,
        loadClipboard,
        clearClipboard
    };
}