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

    // Vérifier si la page est déjà sélectionnée (soit dans selectedPages, soit comme selectedPage)
    const isPageSelected = selectedPages.includes(page.id) || (selectedPage && selectedPage.id === page.id);
    
    if (isPageSelected) {
      // DÉSÉLECTIONNER la page
      const newSelection = selectedPages.filter(id => id !== page.id);
      setSelectedPages(newSelection);
      
      // Si c'était la selectedPage principale, la changer
      if (selectedPage && selectedPage.id === page.id) {
        if (newSelection.length > 0) {
          // Prendre la première page restante comme nouvelle selectedPage
          const newSelectedPage = pages.find(p => p.id === newSelection[0]);
          setSelectedPage(newSelectedPage);
        } else {
          setSelectedPage(null);
        }
      }
      
      // Gérer le mode multi-select
      if (newSelection.length === 0) {
        setMultiSelectMode(false);
      } else if (newSelection.length === 1) {
        setMultiSelectMode(false);
      }
      
      return; // IMPORTANT : sortir ici pour éviter d'ajouter la page à nouveau
    }

    // SÉLECTIONNER la page
    if (selectedPages.length === 0 && !selectedPage) {
      // Première sélection
      setSelectedPage(page);
      setSelectedPages([page.id]);
      setMultiSelectMode(false);
    } else {
      // Ajouter à la sélection existante
      const currentSelection = selectedPages.length > 0 ? selectedPages : (selectedPage ? [selectedPage.id] : []);
      const newSelection = [...currentSelection, page.id];
      setSelectedPages(newSelection);
      setMultiSelectMode(newSelection.length > 1);
      
      // Garder la première page comme selectedPage principal si pas encore définie
      if (!selectedPage) {
        setSelectedPage(page);
      }
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