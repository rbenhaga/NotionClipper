// packages/ui/src/hooks/usePageHandlers.ts
import { useCallback } from 'react';

interface UsePageHandlersProps {
  selectedPages: string[];
  setSelectedPages: (pages: string[]) => void;
  selectedPage: any;
  setSelectedPage: (page: any) => void;
  multiSelectMode: boolean;
  setMultiSelectMode: (mode: boolean) => void;
  pages: any[];
}

export function usePageHandlers({
  selectedPages,
  setSelectedPages,
  selectedPage,
  setSelectedPage,
  multiSelectMode,
  setMultiSelectMode,
  pages
}: UsePageHandlersProps) {

  const handlePageSelect = useCallback((page: any, event?: any) => {
    // Support multi-sélection depuis MinimalistView
    if (Array.isArray(page)) {
      // Tableau de pages depuis MinimalistView
      console.log('[App] 📥 Received multiple pages:', page.length);
      setSelectedPages(page.map((p: any) => p.id));
      setSelectedPage(page[0]); // Première page comme page principale
      setMultiSelectMode(page.length > 1); // Activer le mode multi si plusieurs pages
      return;
    }

    // Mode normal : Toujours permettre la multi-sélection avec simple clic
    // Si la page est déjà sélectionnée, la désélectionner
    if (selectedPages.indexOf(page.id) !== -1) {
      const newSelection = selectedPages.filter(id => id !== page.id);
      setSelectedPages(newSelection);
      
      // Si plus aucune page sélectionnée, désactiver le mode multi
      if (newSelection.length === 0) {
        setSelectedPage(null);
        setMultiSelectMode(false);
      } else if (newSelection.length === 1) {
        // Si une seule page reste, la définir comme selectedPage
        const remainingPage = pages.find(p => p.id === newSelection[0]);
        setSelectedPage(remainingPage);
        setMultiSelectMode(false);
      }
      return;
    }

    // Si aucune page n'est sélectionnée, sélectionner celle-ci
    if (selectedPages.length === 0 && !selectedPage) {
      setSelectedPage(page);
      setSelectedPages([]);
      setMultiSelectMode(false);
      return;
    }

    // Sinon, ajouter à la sélection multiple
    const currentSelection = selectedPages.length > 0 ? selectedPages : (selectedPage ? [selectedPage.id] : []);
    setSelectedPages([...currentSelection, page.id]);
    setMultiSelectMode(true);

    // Garder la première page comme selectedPage principal
    if (!selectedPage) {
      setSelectedPage(page);
    }
  }, [multiSelectMode, selectedPages, selectedPage, pages, setSelectedPages, setSelectedPage, setMultiSelectMode]);

  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode(!multiSelectMode);
    if (!multiSelectMode) {
      setSelectedPage(null);
    } else {
      setSelectedPages([]);
    }
  }, [multiSelectMode, setMultiSelectMode, setSelectedPage, setSelectedPages]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPages([]);
    setSelectedPage(null);
    setMultiSelectMode(false); // Revenir en mode simple
  }, [setSelectedPages, setSelectedPage, setMultiSelectMode]);

  const handleDeselectPage = useCallback((pageId: string) => {
    setSelectedPages(selectedPages.filter((id: string) => id !== pageId));
  }, [selectedPages, setSelectedPages]);

  return {
    handlePageSelect,
    handleToggleMultiSelect,
    handleDeselectAll,
    handleDeselectPage
  };
}