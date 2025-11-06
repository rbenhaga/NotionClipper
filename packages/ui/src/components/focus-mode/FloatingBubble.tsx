// packages/ui/src/components/focus-mode/FloatingBubble.tsx
// 🎯 COMPACT VERSION - Utilise PageSelector réutilisable

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2, X, CheckSquare } from 'lucide-react';
import { MotionDiv } from '../common/MotionWrapper';
import { PageSelector } from '../common/PageSelector';
import { NotionClipperLogo } from '../../assets/icons';
import { NotionPage } from '../../types';

// ============================================
// TYPES
// ============================================

type BubbleState =
  | { type: 'compact'; pageName: string }
  | { 
      type: 'menu'; 
      currentPage: NotionPage | null; 
      selectedPages: NotionPage[]; // 🔥 NOUVEAU: Pages sélectionnées multiples
      recentPages: NotionPage[]; 
      allPages: NotionPage[];
      multiSelectMode: boolean; // 🔥 NOUVEAU: Mode sélection multiple
    }
  | { type: 'sending' }
  | { type: 'success' }
  | { type: 'error' };

export interface FloatingBubbleProps {
  initialState?: BubbleState;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const FloatingBubble = memo<FloatingBubbleProps>(({ initialState }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const electronAPIRef = useRef<any>(null);
  const dragStartTimeRef = useRef<number>(0);

  const [state, setState] = useState<BubbleState>(
    initialState || { type: 'compact', pageName: 'Notion' }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const logoControls = useAnimation();

  // Init
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      electronAPIRef.current = (window as any).electronAPI;
    }
  }, []);

  // Electron events
  useEffect(() => {
    const electronAPI = electronAPIRef.current;
    if (!electronAPI) return;

    const handleSizeChange = async (_: any, size: string) => {
      switch (size) {
        case 'menu':
          try {
            const focusState = await electronAPI.focusMode?.getState();
            const recentPages = await electronAPI.invoke('notion:get-recent-pages') || [];
            const allPagesResponse = await electronAPI.invoke('notion:get-pages') || { success: false, pages: [] };

            // 🔥 CORRECTION ULTRA RIGOUREUSE: Extraire correctement les pages de la réponse
            const safeRecentPages = Array.isArray(recentPages) ? recentPages : [];
            const safeAllPages = allPagesResponse.success && Array.isArray(allPagesResponse.pages) 
              ? allPagesResponse.pages 
              : [];
            
            console.log('🔍 [FloatingBubble] PAGES DEBUG:', {
              recentPagesReceived: Array.isArray(recentPages) ? recentPages.length : 0,
              recentPagesUsed: safeRecentPages.length,
              allPagesReceived: allPagesResponse.success && Array.isArray(allPagesResponse.pages) ? allPagesResponse.pages.length : 0,
              allPagesUsed: safeAllPages.length
            });

            // 🔥 CORRECTION: Récupérer les pages cibles persistantes depuis le service Focus Mode
            const targetPages = (focusState?.state as any)?.targetPages || [];
            const hasMultipleTargets = targetPages.length > 1;
            
            console.log('🎯 [FloatingBubble] Loading persistent target pages:', {
              targetPagesCount: targetPages.length,
              targetPages: targetPages.map((p: any) => p.title || p.id),
              multiSelectMode: hasMultipleTargets
            });

            setState({
              type: 'menu',
              currentPage: hasMultipleTargets ? null : (targetPages[0] || focusState?.state?.targetPage || null),
              selectedPages: hasMultipleTargets ? targetPages : [], // 🔥 CORRECTION: Charger les pages persistantes
              recentPages: safeRecentPages,
              allPages: safeAllPages,
              multiSelectMode: hasMultipleTargets, // 🔥 CORRECTION: Mode basé sur le nombre de pages cibles
            });
          } catch {
            setState({ 
              type: 'menu', 
              currentPage: null, 
              selectedPages: [], // 🔥 NOUVEAU
              recentPages: [], 
              allPages: [],
              multiSelectMode: false // 🔥 NOUVEAU
            });
          }
          break;
        case 'sending':
          setState({ type: 'sending' });
          break;
        case 'success':
          setState({ type: 'success' });
          logoControls.start({
            scale: [1, 1.2, 1],
            rotate: [0, -10, 10, 0],
            transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
          });
          break;
        case 'error':
          setState({ type: 'error' });
          break;
        default:
          const focusStateCompact = await electronAPI.focusMode?.getState();
          setState({
            type: 'compact',
            pageName: focusStateCompact?.state?.targetPage?.title || 'Notion',
          });
      }
    };

    const handleDragState = (_: any, dragging: boolean) => setIsDragging(dragging);

    electronAPI.on('bubble:size-changed', handleSizeChange);
    electronAPI.on('bubble:drag-state', handleDragState);

    return () => {
      electronAPI.removeListener('bubble:size-changed', handleSizeChange);
      electronAPI.removeListener('bubble:drag-state', handleDragState);
    };
  }, [logoControls]);

  // Header drag handler - Amélioré pour éviter la fermeture du menu
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    let dragStarted = false;
    
    const handleMouseMoveHeader = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);

      if (!hasMoved && (deltaX > 5 || deltaY > 5)) { // Seuil plus élevé
        hasMoved = true;
        dragStarted = true;
        setIsDragging(true);
        setHasDragged(true); // 🔥 IMPORTANT: Marquer comme draggé
        electronAPIRef.current?.invoke('bubble:drag-start', {
          x: moveEvent.screenX,
          y: moveEvent.screenY
        });
      }
      
      if (dragStarted) {
        electronAPIRef.current?.invoke('bubble:drag-move', { 
          x: moveEvent.screenX, 
          y: moveEvent.screenY 
        });
      }
    };

    const handleMouseUpHeader = () => {
      window.removeEventListener('mousemove', handleMouseMoveHeader);
      window.removeEventListener('mouseup', handleMouseUpHeader);
      
      if (dragStarted) {
        setIsDragging(false);
        electronAPIRef.current?.invoke('bubble:drag-end');
        // 🔥 DÉLAI plus long pour éviter la fermeture du menu après drag
        setTimeout(() => setHasDragged(false), 300);
      }
    };

    window.addEventListener('mousemove', handleMouseMoveHeader);
    window.addEventListener('mouseup', handleMouseUpHeader);
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (state.type !== 'compact') return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    dragStartTimeRef.current = Date.now();

    const handleMouseMoveStart = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);

      if (!hasMoved && (deltaX > 5 || deltaY > 5)) {
        hasMoved = true;
        setIsDragging(true);
        setHasDragged(true);
        setShowTooltip(false);
        electronAPIRef.current?.invoke('bubble:drag-start', {
          x: moveEvent.screenX,
          y: moveEvent.screenY
        });
      }
    };

    const handleMouseUpStart = () => {
      window.removeEventListener('mousemove', handleMouseMoveStart);
      window.removeEventListener('mouseup', handleMouseUpStart);
      if (hasMoved) setTimeout(() => setHasDragged(false), 300);
    };

    window.addEventListener('mousemove', handleMouseMoveStart);
    window.addEventListener('mouseup', handleMouseUpStart);
  }, [state.type]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    electronAPIRef.current?.invoke('bubble:drag-move', { x: e.screenX, y: e.screenY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      electronAPIRef.current?.invoke('bubble:drag-end');
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Interactions
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging || hasDragged) return;

    const timeSinceMouseDown = Date.now() - dragStartTimeRef.current;
    if (timeSinceMouseDown > 200) return;

    if (state.type === 'compact') {
      setShowTooltip(false);
      electronAPIRef.current?.invoke('bubble:expand-menu');
    }
  }, [isDragging, hasDragged, state.type]);

  const handleCloseMenu = useCallback(() => {
    electronAPIRef.current?.invoke('bubble:collapse');
  }, []);

  const handleSelectPage = useCallback(async (page: NotionPage) => {
    // Mettre à jour la page sélectionnée sans fermer la bulle
    setState(prevState => {
      if (prevState.type === 'menu') {
        return {
          ...prevState,
          currentPage: page
        };
      }
      return prevState;
    });
    
    // Changer la page dans le focus mode
    await electronAPIRef.current?.invoke('focus-mode:change-page', page.id);
    
    // 🔥 CORRECTION ULTRA RIGOUREUSE: Ne plus fermer automatiquement le menu
    // L'utilisateur doit cliquer sur X ou cliquer ailleurs pour fermer
    // setTimeout(() => {
    //   electronAPIRef.current?.invoke('bubble:collapse');
    // }, 300);
  }, []);

  // 🔥 NOUVEAU: Handler pour la sélection multiple
  const handleMultiPageSelect = useCallback(async (pages: NotionPage[]) => {
    setState(prevState => {
      if (prevState.type === 'menu') {
        return {
          ...prevState,
          selectedPages: pages
        };
      }
      return prevState;
    });

    // 🔥 NOUVEAU: Mettre à jour les pages cibles dans le service Focus Mode
    try {
      const result = await electronAPIRef.current?.focusMode?.setTargetPages?.(pages);
      if (result?.success) {
        console.log(`[FloatingBubble] ✅ Target pages updated: ${result.count} pages`);
      } else {
        console.error('[FloatingBubble] ❌ Failed to update target pages:', result);
      }
    } catch (error) {
      console.error('[FloatingBubble] Error updating target pages:', error);
    }
  }, []);

  // 🔥 NOUVEAU: Toggle mode sélection multiple
  const handleToggleMultiSelect = useCallback(async () => {
    setState(prevState => {
      if (prevState.type === 'menu') {
        const newMultiMode = !prevState.multiSelectMode;
        const newState = {
          ...prevState,
          multiSelectMode: newMultiMode,
          selectedPages: newMultiMode && prevState.currentPage ? [prevState.currentPage] : [],
          currentPage: newMultiMode ? null : (prevState.selectedPages[0] || null)
        };

        // 🔥 NOUVEAU: Mettre à jour les pages cibles quand on change de mode
        const pagesToUpdate = newMultiMode 
          ? (prevState.currentPage ? [prevState.currentPage] : [])
          : (prevState.selectedPages.length > 0 ? [prevState.selectedPages[0]] : []);

        if (pagesToUpdate.length > 0) {
          electronAPIRef.current?.focusMode?.setTargetPages?.(pagesToUpdate)
            .then((result: any) => {
              if (result?.success) {
                console.log(`[FloatingBubble] ✅ Mode changed, target pages updated: ${result.count} pages`);
              }
            })
            .catch((error: any) => {
              console.error('[FloatingBubble] Error updating target pages on mode change:', error);
            });
        }

        return newState;
      }
      return prevState;
    });
  }, []);

  // ============================================
  // COMPACT MODE
  // ============================================

  if (state.type === 'compact') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <AnimatePresence>
          {showTooltip && !isDragging && (
            <MotionDiv
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="absolute pointer-events-none"
              style={{ bottom: 'calc(100% + 10px)' }}
            >
              <div style={{
                background: 'rgba(0, 0, 0, 0.92)',
                backdropFilter: 'blur(20px) saturate(150%)',
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '11px',
                fontWeight: 500,
                padding: '5px 9px',
                borderRadius: '7px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {state.pageName}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        <MotionDiv
          ref={bubbleRef}
          whileHover={!isDragging ? { scale: 1.08 } : undefined}
          whileTap={!isDragging ? { scale: 0.94 } : undefined}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onMouseEnter={() => !isDragging && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="relative flex items-center justify-center select-none"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 1)', // 🔥 CORRECTION: Fond complètement opaque
            backdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'none', // 🔥 CORRECTION: Retirer l'ombre dégueulasse
            cursor: 'default', // 🔥 CORRECTION: Curseur normal (flèche)
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'auto',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid rgba(0, 0, 0, 0.08)', // 🔥 CORRECTION: Bordure pour compenser l'absence d'ombre
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <NotionClipperLogo
            size={36}
            className="text-purple-500 [&_*]:!stroke-current [&_*]:!fill-current"
          />

        </MotionDiv>
      </div>
    );
  }

  // ============================================
  // MENU MODE
  // ============================================

  if (state.type === 'menu') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <MotionDiv
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative select-none"
          style={{
            width: 240,
            maxHeight: 340,
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 1)', // 🔥 CORRECTION: Fond complètement opaque
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: 'none', // 🔥 CORRECTION: Retirer l'ombre dégueulasse
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'auto',
            border: '1px solid rgba(0, 0, 0, 0.08)', // 🔥 CORRECTION: Bordure plus visible sans ombre
          }}
        >
          {/* Multi-select toggle button - Style header moderne */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: state.multiSelectMode ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0.05)',
              transition: { duration: 0.15 }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToggleMultiSelect}
            style={{
              position: 'absolute',
              top: 12,
              right: 42,
              width: 28,
              height: 20,
              borderRadius: '6px', // 🔥 CORRECTION: Rectangulaire comme dans le header, pas de cercle gris
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: state.multiSelectMode ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
              border: state.multiSelectMode ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            title={state.multiSelectMode ? 'Mode sélection simple' : 'Mode sélection multiple'}
          >
            <CheckSquare 
              size={12} 
              className={state.multiSelectMode ? 'text-blue-600' : 'text-gray-500'} 
              strokeWidth={2}
              style={{
                transition: 'all 0.15s ease',
              }}
            />
          </motion.button>

          {/* Close button - Style header moderne */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              transition: { duration: 0.15 }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCloseMenu}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 24,
              height: 20,
              borderRadius: '6px', // 🔥 CORRECTION: Rectangulaire comme dans le header, pas de cercle gris
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <X size={12} strokeWidth={2.5} className="text-gray-600 hover:text-red-500 transition-colors duration-150" />
          </motion.button>

          {/* Current page header - Style Apple/Notion - DRAGGABLE */}
          <MotionDiv
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={handleHeaderMouseDown} // 🔥 NOUVEAU: Header draggable simple
            style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
              cursor: 'default', // 🔥 CORRECTION: Curseur normal pour le header
              userSelect: 'none', // 🔥 NOUVEAU: Empêcher la sélection de texte
            }}
          >
            <div style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              {state.multiSelectMode ? 'Sélection multiple' : 'Envoyer vers'}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}>
              {state.multiSelectMode 
                ? `${state.selectedPages.length} page${state.selectedPages.length > 1 ? 's' : ''} sélectionnée${state.selectedPages.length > 1 ? 's' : ''}`
                : (state.currentPage?.title || 'Sélectionner une page')
              }
            </div>
          </MotionDiv>

          {/* Page selector en mode direct - Design Apple parfait */}
          <div style={{ padding: '0 12px 12px', flex: 1, minHeight: 0 }}>
            <PageSelector
              selectedPage={state.multiSelectMode ? null : state.currentPage}
              selectedPages={state.multiSelectMode ? state.selectedPages : []}
              pages={state.recentPages}
              allPages={state.allPages}
              onPageSelect={handleSelectPage}
              onMultiPageSelect={handleMultiPageSelect}
              placeholder="Changer de page"
              compact={true}
              mode="direct"
              className="w-full"
              keepMenuOpen={true}
              multiSelect={state.multiSelectMode} // 🔥 NOUVEAU: Mode sélection multiple
            />
          </div>
        </MotionDiv>
      </div>
    );
  }

  // ============================================
  // SENDING / SUCCESS / ERROR
  // ============================================

  const feedbackStates = {
    sending: {
      bg: 'rgba(255, 255, 255, 0.95)',
      shadow: '0 4px 16px rgba(59, 130, 246, 0.2), 0 0 0 0.5px rgba(59, 130, 246, 0.1)',
      icon: <Loader2 size={18} className="animate-spin text-blue-600" strokeWidth={2.5} />,
    },
    success: {
      bg: 'rgba(236, 253, 245, 0.98)',
      shadow: '0 4px 16px rgba(34, 197, 94, 0.25), 0 0 0 0.5px rgba(34, 197, 94, 0.15)',
      icon: <Check size={22} className="text-green-600" strokeWidth={3} />,
    },
    error: {
      bg: 'rgba(254, 242, 242, 0.98)',
      shadow: '0 4px 16px rgba(239, 68, 68, 0.25), 0 0 0 0.5px rgba(239, 68, 68, 0.15)',
      icon: <AlertCircle size={22} className="text-red-600" strokeWidth={2.5} />,
    },
  };

  if (state.type === 'sending' || state.type === 'success' || state.type === 'error') {
    const config = feedbackStates[state.type];

    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <MotionDiv
          initial={{ scale: 0.88 }}
          animate={{
            scale: 1,
            ...(state.type === 'error' && { x: [0, -2, 2, -2, 2, 0] })
          }}
          transition={{
            scale: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
            x: { duration: 0.35 }
          }}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: config.bg,
            backdropFilter: 'blur(20px)',
            boxShadow: config.shadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {state.type === 'success' ? (
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.08, type: 'spring', damping: 12, stiffness: 300 }}
            >
              {config.icon}
            </MotionDiv>
          ) : (
            config.icon
          )}
        </MotionDiv>
      </div>
    );
  }

  return null;
});

FloatingBubble.displayName = 'FloatingBubble';

export default FloatingBubble;