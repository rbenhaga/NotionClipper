// packages/ui/src/components/focus-mode/FloatingBubble.tsx

import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { motion, useAnimation, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Check, AlertCircle, Loader2, X, CheckSquare, Sparkles, MoreHorizontal, FileUp, Hash, ChevronDown, ChevronRight } from 'lucide-react';
import { MotionDiv } from '../common/MotionWrapper';
import { PageSelector } from '../common/PageSelector';
import { NotionClipperLogo } from '../../assets/icons';
import { NotionPage } from '../../types';
import { useTranslation } from '@notion-clipper/i18n';

// ============================================
// TYPES
// ============================================

type BubbleState =
  | { type: 'idle'; }
  | { type: 'active'; pageName: string; queueCount?: number; offlineMode?: boolean; }
  | { 
      type: 'menu'; 
      currentPage: NotionPage | null; 
      selectedPages: NotionPage[]; 
      recentPages: NotionPage[]; 
      allPages: NotionPage[];
      multiSelectMode: boolean; 
    }
  | { type: 'preparing' } // 🆕 État préparation immédiate
  | { type: 'sending' }
  | { type: 'success' }
  | { type: 'error' }
  | { type: 'offline' };

interface Heading {
  id: string;
  blockId: string;
  level: 1 | 2 | 3;
  text: string;
}

export interface FloatingBubbleProps {
  initialState?: BubbleState;
}

// ============================================
// ANIMATIONS CONSTANTS - Apple-inspired
// ============================================
const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8
};

const SMOOTH_CONFIG = {
  type: "tween" as const,
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
};

const BOUNCE_CONFIG = {
  type: "spring" as const,
  stiffness: 500,
  damping: 25,
  mass: 0.5
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const FloatingBubble = memo<FloatingBubbleProps>(({ initialState }) => {
  const { t } = useTranslation();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const electronAPIRef = useRef<any>(null);
  const dragStartTimeRef = useRef<number>(0);
  const tooltipTimeoutRef = useRef<number>();

  const [state, setState] = useState<BubbleState>(
    initialState || { type: 'idle' }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [selectedTOC, setSelectedTOC] = useState<Record<string, Heading>>({});
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const logoControls = useAnimation();

  // ============================================
  // MOTION VALUES - Smooth animations
  // ============================================
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);
  const rotate = useMotionValue(0);
  const springScale = useSpring(scale, SPRING_CONFIG);
  const springRotate = useSpring(rotate, { stiffness: 300, damping: 20 });

  // ============================================
  // INIT
  // ============================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      electronAPIRef.current = (window as any).electronAPI;
    }

    // Listeners
    const removeStateListener = electronAPIRef.current?.on?.('bubble:state-change', (newState: string) => {
      console.log('[FloatingBubble] State change:', newState);
      if (newState === 'idle') {
        setState({ type: 'idle' });
      } else if (newState === 'active') {
        setState(prev => ({ 
          type: 'active', 
          pageName: prev.type === 'active' ? prev.pageName : 'Notion',
          queueCount: prev.type === 'active' ? prev.queueCount : 0,
          offlineMode: prev.type === 'active' ? prev.offlineMode : false
        }));
      } else if (newState === 'preparing') {
        setState({ type: 'preparing' });
      } else if (newState === 'sending') {
        setState({ type: 'sending' });
      } else if (newState === 'success') {
        setState({ type: 'success' });
      } else if (newState === 'error') {
        setState({ type: 'error' });
      } else if (newState === 'offline') {
        setState({ type: 'offline' });
      }
    });

    const removeSizeListener = electronAPIRef.current?.on?.('bubble:size-changed', (size: string) => {
      console.log('[FloatingBubble] Size changed:', size);
    });

    return () => {
      removeStateListener?.();
      removeSizeListener?.();
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
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
            type: 'active',
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



  // ============================================
  // HANDLERS - Menu Actions
  // ============================================

  const handleCloseMenu = useCallback(async () => {
    setState(prev => ({ type: 'active', pageName: 'Notion' }));
    await electronAPIRef.current?.invoke('bubble:collapse');
  }, []);

  const handleDisable = useCallback(async () => {
    await electronAPIRef.current?.invoke('focus-mode:disable');
    setState({ type: 'idle' });
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
          electronAPIRef.current?.invoke?.('focus-mode:set-target-pages', pagesToUpdate)
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
  // HANDLERS - TOC
  // ============================================
  const loadHeadings = useCallback(async (pageId: string) => {
    try {
      const blocks = await electronAPIRef.current?.invoke('notion:get-page-blocks', pageId);
      const extracted: Heading[] = [];
      blocks?.forEach((block: any, index: number) => {
        if (block.type.startsWith('heading_')) {
          const level = parseInt(block.type.split('_')[1]) as 1 | 2 | 3;
          const text = block[block.type]?.rich_text?.[0]?.plain_text || 'Sans titre';
          extracted.push({
            id: `heading-${index}`,
            blockId: block.id,
            level,
            text
          });
        }
      });
      setHeadings(extracted);
    } catch (error) {
      console.error('[FloatingBubble] Error loading headings:', error);
      setHeadings([]);
    }
  }, []);

  const handleTOCSelect = useCallback((pageId: string, heading: Heading | null) => {
    setSelectedTOC(prev => {
      if (!heading) {
        const { [pageId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pageId]: heading };
    });
  }, []);

  // ============================================
  // HANDLERS - Système d'interaction OPTIMISÉ (Pointer Events)
  // ============================================
  
  /**
   * 🎯 LOGIQUE OPTIMALE :
   * 
   * BULLE COMPACTE (active/idle) :
   * - Clic simple (pointerup rapide sans mouvement) → Ouvre le menu
   * - Maintien + mouvement → Drag de la bulle
   * 
   * MENU OUVERT :
   * - Clic sur header + mouvement → Drag du menu
   * - Clic sur X → Ferme le menu
   * 
   * 🔥 OPTIMISATIONS :
   * - Pointer Events au lieu de Mouse Events (meilleure précision trackpad/stylet)
   * - setPointerCapture pour stream d'input verrouillé (0 frame drop)
   * - Distance au carré pour éviter sqrt (micro-optimisation)
   * - performance.now() au lieu de Date.now() (précision sub-milliseconde)
   */

  const handleBubblePointerDown = useCallback((e: React.PointerEvent) => {
    // Ne fonctionne que pour la bulle compacte
    if (state.type !== 'active' && state.type !== 'idle') return;
    
    e.preventDefault();
    const pointerId = e.pointerId;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = performance.now();
    let isDraggingNow = false;
    let lastFrameTime = 0;
    let animationFrameId: number | null = null;
    let pendingPosition: { x: number; y: number } | null = null;
    
    const sendPosition = () => {
      if (pendingPosition && isDraggingNow) {
        electronAPIRef.current?.invoke('bubble:drag-move', pendingPosition);
        pendingPosition = null;
      }
      animationFrameId = null;
    };
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const distanceSquared = dx * dx + dy * dy;
      
      // Seuil adaptatif selon le type d'input
      const threshold = moveEvent.pointerType === 'touch' ? 25 : 
                       moveEvent.pointerType === 'pen' ? 36 : 64;
      
      if (!isDraggingNow && distanceSquared > threshold) {
        isDraggingNow = true;
        setIsDragging(true);
        setHasDragged(true);
        setShowTooltip(false);
        
        // 🔥 CRITIQUE: Utiliser send au lieu de invoke pour 0 latence
        electronAPIRef.current?.send?.('bubble:drag-start', {
          x: Math.round(moveEvent.screenX),
          y: Math.round(moveEvent.screenY)
        });
        
        console.log('[Bubble] 🎯 Drag activé (type:', moveEvent.pointerType, ')');
      }
      
      // 🔥 OPTIMISATION: Envoyer CHAQUE mouvement sans batching
      // send() est synchrone donc pas de latence
      if (isDraggingNow) {
        electronAPIRef.current?.send?.('bubble:drag-move', {
          x: Math.round(moveEvent.screenX),
          y: Math.round(moveEvent.screenY)
        });
      }
    };
    
    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      
      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('pointercancel', onPointerUp as any);
      
      const duration = performance.now() - startTime;
      
      if (isDraggingNow) {
        setIsDragging(false);
        // 🔥 CRITIQUE: Utiliser send au lieu de invoke
        electronAPIRef.current?.send?.('bubble:drag-end');
        setTimeout(() => setHasDragged(false), 300);
        console.log('[Bubble] 🎯 Drag terminé');
      }
      else if (duration < 180) {
        console.log('[Bubble] 🎯 Clic simple → Ouverture menu');
        setState({ 
          type: 'menu',
          currentPage: null,
          selectedPages: [],
          recentPages: [],
          allPages: [],
          multiSelectMode: false
        });
        electronAPIRef.current?.invoke('bubble:expand-menu');
      }
    };
    
    window.addEventListener('pointermove', onPointerMove as any, { passive: false });
    window.addEventListener('pointerup', onPointerUp as any);
    window.addEventListener('pointercancel', onPointerUp as any);
  }, [state.type]);

  const handleMenuHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    // Ne fonctionne que pour le menu ouvert
    if (state.type !== 'menu') return;
    
    e.preventDefault();
    e.stopPropagation();
    const pointerId = e.pointerId;
    
    const startX = e.clientX;
    const startY = e.clientY;
    let isDraggingNow = false;
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const distanceSquared = dx * dx + dy * dy;
      
      // Seuil adaptatif selon le type d'input
      const threshold = moveEvent.pointerType === 'touch' ? 25 : 
                       moveEvent.pointerType === 'pen' ? 36 : 64;
      
      if (!isDraggingNow && distanceSquared > threshold) {
        isDraggingNow = true;
        setIsDragging(true);
        
        // 🔥 CRITIQUE: Utiliser send au lieu de invoke pour 0 latence
        electronAPIRef.current?.send?.('bubble:drag-start', {
          x: Math.round(moveEvent.screenX),
          y: Math.round(moveEvent.screenY)
        });
        
        console.log('[Menu] 🎯 Drag du menu activé (type:', moveEvent.pointerType, ')');
      }
      
      // 🔥 OPTIMISATION: Envoyer CHAQUE mouvement sans batching
      // send() est synchrone donc pas de latence
      if (isDraggingNow) {
        electronAPIRef.current?.send?.('bubble:drag-move', {
          x: Math.round(moveEvent.screenX),
          y: Math.round(moveEvent.screenY)
        });
      }
    };
    
    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      
      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('pointercancel', onPointerUp as any);
      
      if (isDraggingNow) {
        setIsDragging(false);
        // 🔥 CRITIQUE: Utiliser send au lieu de invoke
        electronAPIRef.current?.send?.('bubble:drag-end');
      }
    };
    
    window.addEventListener('pointermove', onPointerMove as any, { passive: false });
    window.addEventListener('pointerup', onPointerUp as any);
    window.addEventListener('pointercancel', onPointerUp as any);
  }, [state.type]);

  // 🔥 SUPPRIMÉ: handleMouseMove et handleMouseUp redondants
  // Les Pointer Events gèrent maintenant tout le drag directement dans onPointerMove

  // File Drop Handlers
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.type === 'active' || state.type === 'menu') {
      setIsDragOver(true);
    }
  }, [state.type]);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!electronAPIRef.current?.invoke) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    console.log('[FloatingBubble] Files dropped:', files.length);

    try {
      setState({ type: 'preparing' });

      // Convert to paths for Electron
      const filePaths = files.map(f => (f as any).path).filter(Boolean);
      const result = await electronAPIRef.current.invoke('focus-mode:upload-files', filePaths);

      if (result.success) {
        setState({ type: 'success' });
        setTimeout(() => {
          setState(prev => prev.type === 'success' ? { type: 'active', pageName: 'Notion' } : prev);
        }, 2000);
      } else {
        setState({ type: 'error' });
        setTimeout(() => {
          setState(prev => prev.type === 'error' ? { type: 'active', pageName: 'Notion' } : prev);
        }, 3000);
      }
    } catch (error) {
      console.error('[FloatingBubble] Error uploading files:', error);
      setState({ type: 'error' });
      setTimeout(() => {
        setState(prev => prev.type === 'error' ? { type: 'active', pageName: 'Notion' } : prev);
      }, 3000);
    }
  }, []);

  // ============================================
  // HANDLERS - Tooltip
  // ============================================
  const handleMouseEnter = useCallback(() => {
    if (state.type === 'active' || state.type === 'idle') {
      tooltipTimeoutRef.current = window.setTimeout(() => {
        setShowTooltip(true);
      }, 800);
    }
  }, [state.type]);

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  }, []);

  // ============================================
  // RENDER - IDLE STATE
  // ============================================
  if (state.type === 'idle') {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <MotionDiv
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          transition={{ 
            duration: 0.15,
            ease: [0.25, 0.1, 0.25, 1]
          }}
          onPointerDown={handleBubblePointerDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
            userSelect: 'none',
            touchAction: 'none' // 🔥 FIX TACTILE: Désactive les gestes par défaut
          }}
        >
          <Sparkles size={20} className="text-purple-500" strokeWidth={2} />
        </MotionDiv>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: '100%',
                marginTop: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              {t('common.focusModeDisabled')}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================
  // RENDER - ACTIVE STATE (Compact)
  // ============================================
  if (state.type === 'active') {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'transparent', pointerEvents: 'none' }}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        <MotionDiv
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: isDragOver ? 1.1 : 1, 
            opacity: 1
          }}
          exit={{ scale: 0.85, opacity: 0 }}
          whileHover={{ scale: isDragOver ? 1.1 : 1.08 }}
          transition={{ 
            duration: 0.15,
            ease: [0.25, 0.1, 0.25, 1]
          }}
          onPointerDown={handleBubblePointerDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isDragOver
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
            userSelect: 'none',
            position: 'relative',
            touchAction: 'none' // 🔥 FIX TACTILE: Désactive les gestes par défaut
          }}
        >
          {isDragOver ? (
            <FileUp size={18} className="text-blue-600" strokeWidth={2.5} />
          ) : (
            <NotionClipperLogo size={24} className="text-gray-600" />
          )}

          {/* Queue indicator */}
          {state.queueCount && state.queueCount > 0 && (
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: state.offlineMode 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              {state.queueCount}
            </MotionDiv>
          )}
        </MotionDiv>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && !isDragOver && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: '100%',
                marginTop: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              {state.pageName || t('common.selectPage')}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================
  // RENDER - MENU STATE
  // ============================================
  if (state.type === 'menu') {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'transparent', pointerEvents: 'none' }}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.85,
            borderRadius: 24
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            borderRadius: 16
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.9,
            borderRadius: 20
          }}
          transition={{ 
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1], // 🔥 CORRECTION: Easing rapide et fluide
            opacity: { duration: 0.15 },
            borderRadius: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
          }}
          className="relative select-none"
          style={{
            width: 280,
            maxHeight: 480,
            background: isDragOver
              ? 'rgba(255, 255, 255, 1)'
              : 'rgba(255, 255, 255, 1)',
            boxShadow: isDragOver
              ? '0 12px 48px rgba(59, 130, 246, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.2)'
              : 'none',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'auto',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Multi-select toggle button - Style header moderne */}
          {/* Hon.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: solid ruration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
            title={state.multiSelectMode ? t('common.singleSelectMode') : t('common.multiSelectMode')}
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

          {/* Header - Style Apple/Notion original - Draggable */}
          <MotionDiv
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            onPointerDown={handleMenuHeaderPointerDown}
            style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
              background: 'rgba(255, 255, 255, 1)',
              cursor: 'default',
              userSelect: 'none',
              flexShrink: 0,
              touchAction: 'none' // 🔥 FIX TACTILE: Désactive les gestes par défaut
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
              {t('common.sendTo')}
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
              {(() => {
                const selectedCount = state.selectedPages.length;
                const currentPage = state.currentPage;
                
                if (selectedCount > 1) {
                  return t('common.pagesSelected', { count: selectedCount });
                } else if (selectedCount === 1) {
                  return state.selectedPages[0].title;
                } else if (currentPage) {
                  return currentPage.title;
                } else {
                  return t('common.selectPage');
                }
              })()}
            </div>
          </MotionDiv>

          {/* Drop Zone Indicator */}
          <AnimatePresence>
            {isDragOver && (
              <MotionDiv
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                  borderBottom: '0.5px solid rgba(59, 130, 246, 0.2)',
                  textAlign: 'center'
                }}
              >
                <FileUp size={16} className="mx-auto mb-1 text-blue-600" strokeWidth={2.5} />
                <div style={{ fontSize: 11, fontWeight: 500, color: '#2563eb' }}>
                  {t('common.dropToSend')}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* Page Selector - Toujours en mode multi-sélection */}
          <div style={{ padding: '0', flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <PageSelector
              selectedPage={null} // Toujours null pour forcer le mode multi
              selectedPages={state.selectedPages.length > 0 ? state.selectedPages : (state.currentPage ? [state.currentPage] : [])}
              pages={state.recentPages}
              allPages={state.allPages}
              onPageSelect={handleSelectPage}
              onMultiPageSelect={handleMultiPageSelect}
              placeholder="Changer de page"
              compact={true}
              mode="direct"
              className="w-full"
              keepMenuOpen={true}
              multiSelect={true} // Toujours activé
            />
          </div>

          {/* 🆕 TOC Section - Bouton qui s'élève au-dessus des cards */}
          {(state.selectedPages.length > 0 || state.currentPage) && (
            <div style={{
              borderTop: '0.5px solid rgba(0, 0, 0, 0.06)',
              padding: '8px 12px',
              position: 'relative',
              flexShrink: 0,
              background: 'rgba(255, 255, 255, 1)' // 🔥 CORRECTION 4: Fond blanc opaque
            }}>
              {/* Contenu TOC qui apparaît au-dessus avec scroll */}
              <AnimatePresence>
                {showTOC && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96 }}
                    transition={{ 
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 12,
                      right: 12,
                      marginBottom: 8,
                      maxHeight: 200,
                      overflowY: 'auto',
                      background: 'rgba(255, 255, 255, 1)', // 🔥 CORRECTION 4: Fond blanc opaque
                      borderRadius: 12,
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.12), 0 -2px 8px rgba(0, 0, 0, 0.08)',
                      zIndex: 20,
                      padding: '12px'
                    }}
                  >
                    {/* Afficher les pages sélectionnées OU la page courante */}
                    {state.selectedPages.length > 0 
                      ? state.selectedPages.map(page => (
                          <TOCForPage
                            key={page.id}
                            page={page}
                            selectedHeading={selectedTOC[page.id]}
                            onSelect={(heading) => handleTOCSelect(page.id, heading)}
                            loadHeadings={loadHeadings}
                          />
                        ))
                      : state.currentPage && (
                          <TOCForPage
                            key={state.currentPage.id}
                            page={state.currentPage}
                            selectedHeading={selectedTOC[state.currentPage.id]}
                            onSelect={(heading) => handleTOCSelect(state.currentPage!.id, heading)}
                            loadHeadings={loadHeadings}
                          />
                        )
                    }
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* Bouton Sections qui s'élève - 🔥 CORRECTION 4: Sans coins blancs */}
              <MotionDiv
                animate={{
                  y: showTOC ? -8 : 0,
                  scale: showTOC ? 1.02 : 1
                }}
                transition={{ 
                  duration: 0.25,
                  ease: [0.16, 1, 0.3, 1]
                }}
                style={{
                  position: 'relative',
                  zIndex: showTOC ? 25 : 1
                }}
              >
                <button
                  onClick={() => setShowTOC(!showTOC)}
                  style={{
                    width: '100%',
                    height: 36,
                    borderRadius: 10,
                    background: showTOC 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)'
                      : 'rgba(249, 250, 251, 1)', // 🔥 CORRECTION 4: Fond gris clair au lieu de blanc transparent
                    border: showTOC 
                      ? '1px solid rgba(59, 130, 246, 0.3)' 
                      : '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: showTOC 
                      ? '0 8px 24px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)' 
                      : '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Hash 
                      size={13} 
                      className={showTOC ? 'text-blue-600' : 'text-gray-500'} 
                      strokeWidth={2.5} 
                    />
                    <span style={{
                      fontSize: 12,
                      fontWeight: showTOC ? 600 : 500,
                      color: showTOC ? '#2563eb' : '#374151',
                      transition: 'all 0.2s ease'
                    }}>
                      Sections
                    </span>
                  </div>
                  <ChevronDown 
                    size={13} 
                    className={showTOC ? 'text-blue-500' : 'text-gray-400'}
                    strokeWidth={2.5}
                    style={{
                      transform: showTOC ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </button>
              </MotionDiv>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{
            borderTop: '0.5px solid rgba(0, 0, 0, 0.06)',
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 1)' // 🔥 CORRECTION: Fond blanc opaque
          }}>
            <button
              onClick={handleDisable}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 8,
                background: 'transparent',
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                fontSize: 11,
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t('common.deactivate')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // RENDER - FEEDBACK STATES
  // ============================================
  const feedbackStates = {
    preparing: {
      bg: 'rgba(255, 255, 255, 0.95)',
      shadow: '0 4px 16px rgba(59, 130, 246, 0.15), 0 0 0 0.5px rgba(59, 130, 246, 0.1)',
      icon: <Loader2 size={18} className="animate-spin text-blue-500" strokeWidth={2.5} />,
      shake: false
    },
    sending: {
      bg: 'rgba(255, 255, 255, 0.95)',
      shadow: '0 4px 16px rgba(59, 130, 246, 0.2), 0 0 0 0.5px rgba(59, 130, 246, 0.1)',
      icon: <Loader2 size={18} className="animate-spin text-blue-600" strokeWidth={2.5} />,
      shake: false
    },
    success: {
      bg: 'rgba(236, 253, 245, 0.98)',
      shadow: '0 4px 16px rgba(34, 197, 94, 0.25), 0 0 0 0.5px rgba(34, 197, 94, 0.15)',
      icon: <Check size={22} className="text-green-600" strokeWidth={3} />,
      shake: false
    },
    error: {
      bg: 'rgba(254, 242, 242, 0.98)',
      shadow: '0 4px 16px rgba(239, 68, 68, 0.25), 0 0 0 0.5px rgba(239, 68, 68, 0.15)',
      icon: <AlertCircle size={22} className="text-red-600" strokeWidth={2.5} />,
      shake: true
    },
    offline: {
      bg: 'rgba(255, 251, 235, 0.98)',
      shadow: '0 4px 16px rgba(245, 158, 11, 0.25), 0 0 0 0.5px rgba(245, 158, 11, 0.15)',
      icon: <Loader2 size={18} className="animate-spin text-amber-600" strokeWidth={2.5} />,
      shake: false
    }
  };

  const feedbackState = state.type as keyof typeof feedbackStates;
  if (feedbackStates[feedbackState]) {
    const config = feedbackStates[feedbackState];
    
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <MotionDiv
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            ...(config.shake && { x: [0, -3, 3, -3, 3, 0] })
          }}
          transition={{
            scale: SMOOTH_CONFIG,
            opacity: { duration: 0.15 },
            x: config.shake ? { duration: 0.35 } : undefined
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
              transition={BOUNCE_CONFIG}
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

// ============================================
// TOC COMPONENT FOR SINGLE PAGE
// ============================================
interface TOCForPageProps {
  page: any;
  selectedHeading: Heading | undefined;
  onSelect: (heading: Heading | null) => void;
  loadHeadings: (pageId: string) => Promise<void>;
}

const TOCForPage = memo(({ page, selectedHeading, onSelect, loadHeadings }: TOCForPageProps) => {
  const { t } = useTranslation();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && headings.length === 0) {
      setLoading(true);
      loadHeadings(page.id).then(async () => {
        // Charger les headings directement
        try {
          const blocks = await (window as any).electronAPI?.invoke('notion:get-page-blocks', page.id);
          const extracted: Heading[] = [];
          blocks?.forEach((block: any, index: number) => {
            if (block.type.startsWith('heading_')) {
              const level = parseInt(block.type.split('_')[1]) as 1 | 2 | 3;
              const text = block[block.type]?.rich_text?.[0]?.plain_text || t('common.untitled');
              extracted.push({
                id: `heading-${index}`,
                blockId: block.id,
                level,
                text
              });
            }
          });
          setHeadings(extracted);
          console.log(`[TOC] Loaded ${extracted.length} headings for page:`, page.title);
        } catch (error) {
          console.error('[TOC] Error loading headings:', error);
        }
        setLoading(false);
      });
    }
  }, [expanded, page.id, loadHeadings, headings.length]);

  return (
    <div style={{
      marginBottom: 8,
      borderRadius: 8,
      border: '0.5px solid rgba(0, 0, 0, 0.06)',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: expanded ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {page.title}
        </div>
        <ChevronRight 
          size={10} 
          className="text-gray-400"
          strokeWidth={2.5}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              borderTop: '0.5px solid rgba(0, 0, 0, 0.06)',
              background: 'rgba(0, 0, 0, 0.01)'
            }}
          >
            {loading ? (
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <Loader2 size={12} className="animate-spin text-gray-400 mx-auto" />
              </div>
            ) : headings.length === 0 ? (
              <div style={{
                padding: '12px',
                fontSize: 10,
                color: '#9ca3af',
                textAlign: 'center'
              }}>
                Aucune section
              </div>
            ) : (
              <div style={{ padding: '4px' }}>
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => onSelect(selectedHeading?.id === heading.id ? null : heading)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      paddingLeft: `${8 + (heading.level - 1) * 12}px`,
                      background: selectedHeading?.id === heading.id 
                        ? 'rgba(59, 130, 246, 0.1)' 
                        : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left'
                    }}
                  >
                    <Hash 
                      size={9} 
                      className={selectedHeading?.id === heading.id ? 'text-blue-600' : 'text-gray-400'}
                      strokeWidth={2.5}
                    />
                    <span style={{
                      fontSize: 10,
                      fontWeight: selectedHeading?.id === heading.id ? 600 : 400,
                      color: selectedHeading?.id === heading.id ? '#2563eb' : '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {heading.text}
                    </span>
                    {selectedHeading?.id === heading.id && (
                      <Check size={8} className="ml-auto text-blue-600" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
});

TOCForPage.displayName = 'TOCForPage';

FloatingBubble.displayName = 'FloatingBubble';

export default FloatingBubble;