// packages/ui/src/components/focus-mode/FloatingBubble.tsx

import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { motion, useAnimation, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Check, AlertCircle, Loader2, X, CheckSquare, Sparkles, MoreHorizontal, FileUp, Hash, ChevronDown, ChevronRight } from 'lucide-react';
import { MotionDiv } from '../common/MotionWrapper';
import { PageSelector } from '../common/PageSelector';
import { NotionClipperLogo } from '../../assets/icons';
import { NotionPage } from '../../types';
import { useSelectedSections } from '../../hooks/data/useSelectedSections';
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
// ANIMATIONS CONSTANTS - Apple/Notion-inspired
// ============================================

// Spring Physics
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

const FAST_CONFIG = {
  type: "tween" as const,
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number]
};

// Feedback Durations (Must match Electron FloatingBubble.ts)
const FEEDBACK_DURATION = {
  success: 2000,  // 2s - correspond à Electron showSuccess()
  error: 3000,    // 3s - correspond à Electron showError()
  preparing: 100, // 100ms avant sending
};

// Color Palette (Notion-inspired subtle colors)
const COLORS = {
  purple: {
    base: '#a855f7',
    light: 'rgba(168, 85, 247, 0.12)',
    ring: 'rgba(168, 85, 247, 0.25)',
  },
  green: {
    base: '#22c55e',
    light: 'rgba(34, 197, 94, 0.08)',
    ring: 'rgba(34, 197, 94, 0.3)',
  },
  red: {
    base: '#ef4444',
    light: 'rgba(239, 68, 68, 0.08)',
    ring: 'rgba(239, 68, 68, 0.3)',
  },
  amber: {
    base: '#f59e0b',
    light: 'rgba(245, 158, 11, 0.08)',
    ring: 'rgba(245, 158, 11, 0.3)',
  }
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
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // 🔥 NOUVEAU: Utiliser le hook avec persistence au lieu du state local
  const { selectedSections, selectSection, deselectSection, getSectionForPage } = useSelectedSections();

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

    const handleSizeChange = async (size: string) => {
      // 🔥 CRITICAL FIX: Only handle 'menu' size change
      // State changes are now handled via 'bubble:state-change' listener
      if (size === 'menu') {
        try {
          const focusState = await electronAPI.focusMode?.getState();
          const recentPages = await electronAPI.invoke('notion:get-recent-pages') || [];
          const allPagesResponse = await electronAPI.invoke('notion:get-pages') || { success: false, pages: [] };

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
            selectedPages: hasMultipleTargets ? targetPages : [],
            recentPages: safeRecentPages,
            allPages: safeAllPages,
            multiSelectMode: hasMultipleTargets,
          });
        } catch {
          setState({
            type: 'menu',
            currentPage: null,
            selectedPages: [],
            recentPages: [],
            allPages: [],
            multiSelectMode: false
          });
        }
      }
      // 🔥 REMOVED: No longer handle 'compact', 'sending', 'success', 'error' here
      // Those are handled exclusively via 'bubble:state-change' listener above
    };

    const handleDragState = (dragging: boolean) => setIsDragging(dragging);

    electronAPI.on('bubble:size-changed', handleSizeChange);
    electronAPI.on('bubble:drag-state', handleDragState);

    return () => {
      electronAPI.removeListener('bubble:size-changed', handleSizeChange);
      electronAPI.removeListener('bubble:drag-state', handleDragState);
    };
  }, []);



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

  // 🔥 MODIFIÉ: Utiliser le hook au lieu du state local
  const handleTOCSelect = useCallback((pageId: string, heading: Heading | null) => {
    if (!heading) {
      // Désélectionner la section pour cette page
      deselectSection(pageId);
    } else {
      // Sélectionner la section avec le blockId (dernier block calculé)
      selectSection(pageId, heading.blockId, heading.text);
    }
  }, [selectSection, deselectSection]);

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

    // 🔥 FIX: Ne PAS preventDefault immédiatement pour permettre trackpad tap
    // e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    const pointerType = e.pointerType;

    // 🔥 OPTIMISATION: setPointerCapture SEULEMENT pour mouse
    // Pour touch/stylus, touch-action: none suffit et évite la latence
    if (pointerType === 'mouse') {
      try {
        target.setPointerCapture(pointerId);
      } catch (err) {
        console.warn('[Bubble] Failed to capture pointer:', err);
      }
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = performance.now();
    let isDraggingNow = false;

    // 🔥 OPTIMISATION RAF: Throttle à 60fps pour touch/stylus
    let rafId: number | null = null;
    let lastPosition: { x: number; y: number } | null = null;

    const sendDragUpdate = () => {
      if (lastPosition && isDraggingNow) {
        electronAPIRef.current?.send?.('bubble:drag-move', lastPosition);
        lastPosition = null;
      }
      rafId = null;
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

        // 🔥 FIX: preventDefault SEULEMENT quand le drag commence
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        setIsDragging(true);
        setHasDragged(true);
        setShowTooltip(false);

        // 🔥 OPTIMISATION: clientX/clientY + window position (plus précis pour touch)
        const screenX = window.screenX + moveEvent.clientX;
        const screenY = window.screenY + moveEvent.clientY;

        electronAPIRef.current?.send?.('bubble:drag-start', {
          x: Math.round(screenX),
          y: Math.round(screenY)
        });

        console.log('[Bubble] 🎯 Drag activé (type:', moveEvent.pointerType, ')');
      }

      // 🔥 OPTIMISATION RAF: Throttle à 60fps au lieu d'envoyer chaque événement
      if (isDraggingNow) {
        // Touch-action: none suffit, pas besoin de preventDefault() dans la loop
        // moveEvent.preventDefault();

        // 🔥 OPTIMISATION: clientX/clientY + window position (plus précis)
        const screenX = window.screenX + moveEvent.clientX;
        const screenY = window.screenY + moveEvent.clientY;

        // Stocker la dernière position
        lastPosition = {
          x: Math.round(screenX),
          y: Math.round(screenY)
        };

        // Throttle avec RAF (60fps max au lieu de 120Hz+)
        if (!rafId) {
          rafId = requestAnimationFrame(sendDragUpdate);
        }
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;

      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('pointercancel', onPointerCancel as any);

      // 🔥 OPTIMISATION: Cancel RAF si en cours
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // 🔥 FIX: Libérer le pointer capture (seulement si mouse)
      if (pointerType === 'mouse') {
        try {
          target.releasePointerCapture(pointerId);
        } catch (err) {
          // Ignore si déjà libéré
        }
      }

      const duration = performance.now() - startTime;

      if (isDraggingNow) {
        setIsDragging(false);
        // 🔥 CRITIQUE: Utiliser send au lieu de invoke
        electronAPIRef.current?.send?.('bubble:drag-end');
        setTimeout(() => setHasDragged(false), 300);
        console.log('[Bubble] 🎯 Drag terminé');
      }
      // 🔥 FIX: Augmenter durée de clic 180ms → 300ms pour trackpad tap
      else if (duration < 300) {
        console.log('[Bubble] 🎯 Tap/Click détecté (type:', upEvent.pointerType, 'durée:', Math.round(duration), 'ms)');
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

    // 🔥 FIX: Gérer pointercancel (important pour touch/stylus)
    const onPointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;

      console.warn('[Bubble] ⚠️ Pointer cancelled (type:', cancelEvent.pointerType, ')');

      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('pointercancel', onPointerCancel as any);

      // 🔥 OPTIMISATION: Cancel RAF si en cours
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Libérer le pointer (seulement si mouse)
      if (pointerType === 'mouse') {
        try {
          target.releasePointerCapture(pointerId);
        } catch (err) {
          // Ignore
        }
      }

      if (isDraggingNow) {
        setIsDragging(false);
        electronAPIRef.current?.send?.('bubble:drag-end');
        setTimeout(() => setHasDragged(false), 300);
      }
    };

    window.addEventListener('pointermove', onPointerMove as any, { passive: false });
    window.addEventListener('pointerup', onPointerUp as any);
    window.addEventListener('pointercancel', onPointerCancel as any);
  }, [state.type]);

  const handleMenuHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    // Ne fonctionne que pour le menu ouvert
    if (state.type !== 'menu') return;

    // 🔥 FIX: Ne PAS preventDefault immédiatement
    // e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    const pointerType = e.pointerType;

    // 🔥 OPTIMISATION: setPointerCapture SEULEMENT pour mouse
    if (pointerType === 'mouse') {
      try {
        target.setPointerCapture(pointerId);
      } catch (err) {
        console.warn('[Menu] Failed to capture pointer:', err);
      }
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let isDraggingNow = false;

    // 🔥 OPTIMISATION RAF: Throttle à 60fps
    let rafId: number | null = null;
    let lastPosition: { x: number; y: number } | null = null;

    const sendDragUpdate = () => {
      if (lastPosition && isDraggingNow) {
        electronAPIRef.current?.send?.('bubble:drag-move', lastPosition);
        lastPosition = null;
      }
      rafId = null;
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

        // 🔥 FIX: preventDefault SEULEMENT quand le drag commence
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        setIsDragging(true);

        // 🔥 OPTIMISATION: clientX/clientY + window position
        const screenX = window.screenX + moveEvent.clientX;
        const screenY = window.screenY + moveEvent.clientY;

        electronAPIRef.current?.send?.('bubble:drag-start', {
          x: Math.round(screenX),
          y: Math.round(screenY)
        });

        console.log('[Menu] 🎯 Drag du menu activé (type:', moveEvent.pointerType, ')');
      }

      // 🔥 OPTIMISATION RAF: Throttle à 60fps
      if (isDraggingNow) {
        // Touch-action: none suffit
        // moveEvent.preventDefault();

        const screenX = window.screenX + moveEvent.clientX;
        const screenY = window.screenY + moveEvent.clientY;

        lastPosition = {
          x: Math.round(screenX),
          y: Math.round(screenY)
        };

        if (!rafId) {
          rafId = requestAnimationFrame(sendDragUpdate);
        }
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;

      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('pointercancel', onPointerCancel as any);

      // 🔥 OPTIMISATION: Cancel RAF si en cours
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // 🔥 FIX: Libérer le pointer capture (seulement si mouse)
      if (pointerType === 'mouse') {
        try {
          target.releasePointerCapture(pointerId);
        } catch (err) {
          // Ignore si déjà libéré
        }
      }

      if (isDraggingNow) {
        setIsDragging(false);
        // 🔥 CRITIQUE: Utiliser send au lieu de invoke
        electronAPIRef.current?.send?.('bubble:drag-end');
      }
    };

    // 🔥 FIX: Gérer pointercancel (important pour touch/stylus)
    const onPointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;

      console.warn('[Menu] ⚠️ Pointer cancelled (type:', cancelEvent.pointerType, ')');

      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      window.removeEventListener('pointercancel', onPointerCancel as any);

      // 🔥 OPTIMISATION: Cancel RAF si en cours
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Libérer le pointer (seulement si mouse)
      if (pointerType === 'mouse') {
        try {
          target.releasePointerCapture(pointerId);
        } catch (err) {
          // Ignore
        }
      }

      if (isDraggingNow) {
        setIsDragging(false);
        electronAPIRef.current?.send?.('bubble:drag-end');
      }
    };

    window.addEventListener('pointermove', onPointerMove as any, { passive: false });
    window.addEventListener('pointerup', onPointerUp as any);
    window.addEventListener('pointercancel', onPointerCancel as any);
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
        }, FEEDBACK_DURATION.success);
      } else {
        setState({ type: 'error' });
        setTimeout(() => {
          setState(prev => prev.type === 'error' ? { type: 'active', pageName: 'Notion' } : prev);
        }, FEEDBACK_DURATION.error);
      }
    } catch (error) {
      console.error('[FloatingBubble] Error uploading files:', error);
      setState({ type: 'error' });
      setTimeout(() => {
        setState(prev => prev.type === 'error' ? { type: 'active', pageName: 'Notion' } : prev);
      }, FEEDBACK_DURATION.error);
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
  // RENDER - FEEDBACK STATES (Premium Apple/Notion-level)
  // ============================================
  const feedbackStates = {
    preparing: {
      color: COLORS.purple,
      icon: <Loader2 size={18} strokeWidth={2.5} />,
      showSpinner: true,
    },
    sending: {
      color: COLORS.purple,
      icon: <Loader2 size={18} strokeWidth={2.5} />,
      showSpinner: true,
    },
    success: {
      color: COLORS.green,
      icon: <Check size={20} strokeWidth={3} />,
      showSpinner: false,
    },
    error: {
      color: COLORS.red,
      icon: <AlertCircle size={20} strokeWidth={2.5} />,
      showSpinner: false,
    },
    offline: {
      color: COLORS.amber,
      icon: <Loader2 size={18} strokeWidth={2.5} />,
      showSpinner: true,
    }
  };

  const feedbackState = state.type as keyof typeof feedbackStates;
  if (feedbackStates[feedbackState]) {
    const config = feedbackStates[feedbackState];
    const isLoading = config.showSpinner;
    const isSuccess = state.type === 'success';
    const isError = state.type === 'error';

    return (
      <div className="fixed inset-0 flex items-center justify-center">
        {/* Main Bubble - NO BLINKING, smooth morphing */}
        <MotionDiv
          key="feedback-bubble" // Stable key to prevent remount
          initial={false} // NO initial animation to prevent blinking
          animate={{
            scale: isSuccess ? [1, 1.08, 1] : isError ? 1 : 1,
            ...(isError && {
              x: [0, -3, 3, -3, 3, 0],
              rotate: [0, -1.5, 1.5, -1.5, 1.5, 0]
            })
          }}
          transition={{
            scale: isSuccess ? { duration: 0.4, times: [0, 0.3, 1], ease: [0.34, 1.56, 0.64, 1] } : undefined,
            x: isError ? { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] } : undefined,
            rotate: isError ? { duration: 0.4 } : undefined
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            boxShadow: isError
              ? `0 0 0 2px ${config.color.base}30, 0 4px 20px ${config.color.base}20, 0 2px 8px rgba(0, 0, 0, 0.04)`
              : '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* iOS-style spinner ring - INSIDE bubble, more visible */}
          {isLoading && (
            <MotionDiv
              key="spinner-ring"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.15 },
                rotate: {
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "linear"
                }
              }}
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '50%',
                background: `conic-gradient(from 0deg, transparent 0deg, ${config.color.base}50 60deg, ${config.color.base} 120deg, ${config.color.base}80 240deg, transparent 300deg)`,
                maskImage: 'radial-gradient(circle, transparent 68%, black 69%, black 100%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 68%, black 69%, black 100%)',
              }}
            />
          )}

          {/* Success ring pulse */}
          {isSuccess && (
            <MotionDiv
              key="success-ring"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 0.6, 0] }}
              transition={{
                duration: 0.6,
                times: [0, 0.3, 1],
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: `2px solid ${config.color.base}`,
              }}
            />
          )}

          {/* Error ring pulse */}
          {isError && (
            <MotionDiv
              key="error-ring"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.4, 0.6, 0] }}
              transition={{
                duration: 0.8,
                times: [0, 0.2, 0.4, 0.6, 1],
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: `2px solid ${config.color.base}`,
              }}
            />
          )}

          {/* Icon with smooth cross-fade */}
          <AnimatePresence mode="wait">
            <MotionDiv
              key={state.type}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1]
              }}
              style={{
                color: config.color.base,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? (
                <div className="animate-spin" style={{ display: 'flex' }}>
                  {config.icon}
                </div>
              ) : (
                config.icon
              )}
            </MotionDiv>
          </AnimatePresence>
        </MotionDiv>
      </div>
    );
  }

  // ============================================
  // RENDER - IDLE STATE
  // ============================================
  if (state.type === 'idle') {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        {/* Hover ring subtil pour idle */}
        <MotionDiv
          initial={{ scale: 1, opacity: 0 }}
          whileHover={{ scale: 1.2, opacity: 0.2 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
          style={{
            position: 'absolute',
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            pointerEvents: 'none',
          }}
        />

        <MotionDiv
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
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
            touchAction: 'none',
            willChange: 'transform',  // 🔥 OPTIMISATION: GPU acceleration hint
            transform: 'translateZ(0)',  // 🔥 OPTIMISATION: Force GPU layer
          }}
        >
          <MotionDiv
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 3, -3, 0],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.5, 0.75, 1]
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} style={{ color: '#a855f7' }} strokeWidth={2} />
          </MotionDiv>
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
      >
        {/* 🔥 NOUVEAU: Zone de drop invisible agrandie (200x200px) */}
        <div
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            pointerEvents: 'auto',
            zIndex: 1,
          }}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFileDrop}
        />

        {/* 🔥 FIX: Hover ring sans isDragOver condition pour éviter glitch */}
        <MotionDiv
          initial={{ scale: 1, opacity: 0 }}
          whileHover={{ scale: 1.15, opacity: 0.3 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
          style={{
            position: 'absolute',
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: '2px solid rgba(0, 0, 0, 0.08)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* 🔥 FIX: Bulle sans changement de background pendant drag */}
        <MotionDiv
          initial={{ scale: 1, opacity: 1 }}
          animate={{
            scale: 1,
            opacity: 1
          }}
          exit={{ scale: 0.85, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
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
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
            userSelect: 'none',
            position: 'relative',
            touchAction: 'none',
            zIndex: 3,
          }}
        >
          {/* 🔥 FIX: Icône simplifiée - FileUp seulement si drag over */}
          <MotionDiv
            animate={isDragOver ? {
              scale: [1, 1.2, 1],
            } : {
              scale: [1, 1.05, 1],
              rotate: [0, -2, 2, 0],
            }}
            transition={{
              duration: isDragOver ? 0.3 : 4,
              repeat: Infinity,
              ease: "easeInOut",
              times: isDragOver ? [0, 0.5, 1] : [0, 0.5, 0.75, 1]
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDragOver ? (
              <FileUp size={20} className="text-purple-600" strokeWidth={2.5} />
            ) : (
              <NotionClipperLogo size={24} className="text-gray-600" />
            )}
          </MotionDiv>

          {/* Queue indicator - TEMPORAIREMENT DÉSACTIVÉ car apparaît aléatoirement */}
          {/* {state.queueCount && state.queueCount > 0 && (
            <>
              {state.offlineMode && (
                <MotionDiv
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-1 -right-1"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: `2px solid ${COLORS.amber.base}`,
                    pointerEvents: 'none',
                  }}
                />
              )}

              <MotionDiv
                key={state.queueCount}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={BOUNCE_CONFIG}
                className="absolute -top-1 -right-1"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: state.offlineMode
                    ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                    : 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: state.offlineMode
                    ? '0 2px 12px rgba(245, 158, 11, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.8)'
                    : '0 2px 12px rgba(168, 85, 247, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.8)',
                  border: '2px solid white',
                }}
              >
                {state.queueCount}
              </MotionDiv>
            </>
          )} */}
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
            scale: 0.92,
            borderRadius: 24
          }}
          animate={{
            opacity: 1,
            scale: 1,
            borderRadius: 16
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            borderRadius: 20
          }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
            // Opacity apparaît après 150ms pour laisser Electron resizer la fenêtre
            opacity: {
              duration: 0.15,
              delay: 0.15, // Augmenté de 50ms → 150ms pour éviter le glitch
              ease: [0.25, 0.1, 0.25, 1]
            },
            scale: {
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1]
            },
            borderRadius: {
              duration: 0.25,
              ease: [0.25, 0.1, 0.25, 1]
            }
          }}
          className="relative select-none"
          style={{
            width: 280,
            maxHeight: 420, // 🔧 RÉDUIT: 480 → 420
            background: isDragOver
              ? 'rgba(255, 255, 255, 1)'
              : 'rgba(255, 255, 255, 1)',
            boxShadow: isDragOver
              ? '0 12px 48px rgba(168, 85, 247, 0.3), 0 0 0 2px rgba(168, 85, 247, 0.2)'
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
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                  borderBottom: '0.5px solid rgba(168, 85, 247, 0.2)',
                  textAlign: 'center'
                }}
              >
                <FileUp size={16} className="mx-auto mb-1 text-purple-600" strokeWidth={2.5} />
                <div style={{ fontSize: 11, fontWeight: 500, color: '#a855f7' }}>
                  {t('common.dropToSend')}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* Page Selector - Multi-sélection avec style élégant */}
          <div style={{
            padding: '0',
            flex: 1,
            minHeight: 0,
            overflow: 'auto', // 🔧 FIX: Toujours scroll, pas de condition
            display: 'flex',
            flexDirection: 'column'
          }}>
            <PageSelector
              selectedPage={null} // Toujours null pour forcer le mode multi
              selectedPages={state.selectedPages.length > 0 ? state.selectedPages : (state.currentPage ? [state.currentPage] : [])}
              pages={state.recentPages}
              allPages={state.allPages}
              onPageSelect={handleSelectPage}
              onMultiPageSelect={handleMultiPageSelect}
              placeholder={t('common.selectPage')}
              compact={true}
              mode="direct"
              className="w-full"
              keepMenuOpen={true}
              multiSelect={true} // Toujours activé
            />
          </div>

          {/* 🆕 TOC Section - Bouton EN HAUT, menu EN BAS style Apple/Notion */}
          {(state.selectedPages.length > 0 || state.currentPage) && (
            <div style={{
              position: 'relative',
              flexShrink: 0,
              background: 'rgba(255, 255, 255, 1)',
              borderTop: '0.5px solid rgba(0, 0, 0, 0.06)',
              zIndex: 10
            }}>
              {/* Bouton Sections EN HAUT - Style Apple/Notion premium */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 30,
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 1)',
                }}
              >
                <button
                  onClick={() => setShowTOC(!showTOC)}
                  style={{
                    width: '100%',
                    height: 36,
                    borderRadius: 10,
                    background: showTOC
                      ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(147, 51, 234, 0.08) 100%)'
                      : 'rgba(249, 250, 251, 1)',
                    border: showTOC
                      ? '1px solid rgba(168, 85, 247, 0.3)'
                      : '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: showTOC
                      ? '0 2px 8px rgba(168, 85, 247, 0.15), 0 1px 4px rgba(0, 0, 0, 0.08)'
                      : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Hash
                      size={13}
                      style={{ color: showTOC ? '#a855f7' : '#6b7280' }}
                      strokeWidth={2.5}
                    />
                    <span style={{
                      fontSize: 12,
                      fontWeight: showTOC ? 600 : 500,
                      color: showTOC ? '#a855f7' : '#374151',
                      transition: 'all 0.2s ease'
                    }}>
                      Sections
                    </span>
                  </div>
                  <ChevronDown
                    size={13}
                    style={{
                      color: showTOC ? '#a855f7' : '#9ca3af',
                      transform: showTOC ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    strokeWidth={2.5}
                  />
                </button>
              </div>

              {/* Panel qui s'élève EN-DESSOUS du bouton */}
              <AnimatePresence>
                {showTOC && (
                  <MotionDiv
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    style={{
                      overflow: 'hidden',
                      background: 'rgba(255, 255, 255, 1)',
                      borderTop: '0.5px solid rgba(168, 85, 247, 0.15)',
                      borderBottom: '0.5px solid rgba(168, 85, 247, 0.15)',
                    }}
                  >
                    <div style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      padding: '12px',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.02) 0%, rgba(147, 51, 234, 0.01) 100%)',
                    }}>
                      {/* Afficher les pages sélectionnées OU la page courante */}
                      {state.selectedPages.length > 0
                        ? state.selectedPages.map(page => {
                            // 🔥 Convertir SelectedSection en format Heading pour compatibilité
                            const selectedSection = getSectionForPage(page.id);
                            const selectedHeading = selectedSection ? {
                              id: selectedSection.blockId, // Utiliser blockId comme id
                              blockId: selectedSection.blockId,
                              level: 1 as const, // Level n'est pas utilisé pour la comparaison
                              text: selectedSection.headingText
                            } : undefined;

                            return (
                              <TOCForPage
                                key={page.id}
                                page={page}
                                selectedHeading={selectedHeading}
                                onSelect={(heading) => handleTOCSelect(page.id, heading)}
                                loadHeadings={loadHeadings}
                              />
                            );
                          })
                        : state.currentPage && (() => {
                            const selectedSection = getSectionForPage(state.currentPage.id);
                            const selectedHeading = selectedSection ? {
                              id: selectedSection.blockId,
                              blockId: selectedSection.blockId,
                              level: 1 as const,
                              text: selectedSection.headingText
                            } : undefined;

                            return (
                              <TOCForPage
                                key={state.currentPage.id}
                                page={state.currentPage}
                                selectedHeading={selectedHeading}
                                onSelect={(heading) => handleTOCSelect(state.currentPage!.id, heading)}
                                loadHeadings={loadHeadings}
                              />
                            );
                          })()
                      }
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
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
                {headings.map((heading) => {
                  // 🔥 FIX: Comparer par blockId au lieu de id généré
                  const isSelected = selectedHeading?.blockId === heading.blockId;

                  return (
                    <button
                      key={heading.id}
                      onClick={() => onSelect(isSelected ? null : heading)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        paddingLeft: `${8 + (heading.level - 1) * 12}px`,
                        background: isSelected
                          ? 'rgba(168, 85, 247, 0.1)'
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
                        style={{ color: isSelected ? '#a855f7' : '#9ca3af' }}
                        strokeWidth={2.5}
                      />
                      <span style={{
                        fontSize: 10,
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? '#a855f7' : '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                      {heading.text}
                    </span>
                    {isSelected && (
                      <Check size={8} className="ml-auto text-purple-600" strokeWidth={3} />
                    )}
                  </button>
                  );
                })}
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