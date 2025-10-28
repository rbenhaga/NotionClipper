// packages/ui/src/hooks/useContentHandlers.ts
import { useCallback } from 'react';

interface UseContentHandlersProps {
  setEditedClipboard: (content: any) => void;
  setHasUserEditedContent: (edited: boolean) => void;
  hasUserEditedContentRef: React.MutableRefObject<boolean>;
  ignoreNextEditRef: React.MutableRefObject<boolean>;
  loadClipboard: () => Promise<void>;
  clearClipboard: () => Promise<void>;
}

export function useContentHandlers({
  setEditedClipboard,
  setHasUserEditedContent,
  hasUserEditedContentRef,
  ignoreNextEditRef,
  loadClipboard,
  clearClipboard
}: UseContentHandlersProps) {

  // Handler d'édition de contenu avec protection système
  const handleEditContent = useCallback((newContent: any) => {
    // Ignorer si on est en train de reset explicitement
    if (ignoreNextEditRef.current) {
      console.log('[EDIT] Ignoring edit during explicit reset');
      return;
    }

    if (newContent === null) {
      // Annulation explicite des modifications
      console.log('[EDIT] 🔄 User explicitly cancelled modifications');
      ignoreNextEditRef.current = true;
      setEditedClipboard(null);
      setHasUserEditedContent(false);
      hasUserEditedContentRef.current = false;
      setTimeout(() => {
        ignoreNextEditRef.current = false;
      }, 100);
      return;
    }

    console.log('[EDIT] ✏️ Content edited by user:', {
      textLength: newContent?.text?.length || 0,
      preview: (newContent?.text || '').substring(0, 50) + '...'
    });

    // Marquer que l'utilisateur a édité
    hasUserEditedContentRef.current = true;
    setHasUserEditedContent(true);

    // Sauvegarder le contenu édité (sera protégé contre les changements de clipboard)
    setEditedClipboard(newContent);
  }, [setEditedClipboard, setHasUserEditedContent, hasUserEditedContentRef, ignoreNextEditRef]);

  // Fonction pour reprendre la surveillance du clipboard
  const resumeClipboardWatching = useCallback(async () => {
    console.log('[CLIPBOARD] 🔄 Resuming clipboard watching');
    
    // 1. Activer la protection contre les événements système
    ignoreNextEditRef.current = true;
    
    // 2. Remettre les flags à false
    setHasUserEditedContent(false);
    hasUserEditedContentRef.current = false;
    
    // 3. Effacer le contenu édité
    setEditedClipboard(null);
    
    // 4. Forcer le rechargement du clipboard
    if (loadClipboard) {
      await loadClipboard();
    }
    
    // 5. Sécurité: remettre le flag à false après un délai
    setTimeout(() => {
      ignoreNextEditRef.current = false;
    }, 200);
    
    console.log('[CLIPBOARD] ✅ Clipboard watching resumed and content refreshed');
  }, [setHasUserEditedContent, hasUserEditedContentRef, setEditedClipboard, loadClipboard, ignoreNextEditRef]);

  // Handler pour clear clipboard avec reprise de surveillance
  const handleClearClipboard = useCallback(async () => {
    if (clearClipboard) {
      await clearClipboard();
    }
    await resumeClipboardWatching();
  }, [clearClipboard, resumeClipboardWatching]);

  return {
    handleEditContent,
    resumeClipboardWatching,
    handleClearClipboard
  };
}