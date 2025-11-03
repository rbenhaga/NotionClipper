// packages/ui/src/components/common/FloatingBubble.tsx
// 🎯 Floating Bubble - Dynamic Island style pour le Mode Focus
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  X,
  Settings,
  ExternalLink,
  Upload,
  Wifi,
  WifiOff,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';

type BubbleState = 'idle' | 'hover' | 'dragging' | 'sending' | 'success' | 'error' | 'offline';

export interface FloatingBubbleProps {
  pageTitle?: string;
  clipCount?: number;
  isOnline?: boolean;
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  pageTitle = 'Page',
  clipCount = 0,
  isOnline = true
}) => {
  const [state, setState] = useState<BubbleState>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  // ============================================
  // ÉTAT OFFLINE AUTOMATIQUE
  // ============================================

  useEffect(() => {
    if (!isOnline && state !== 'offline') {
      setState('offline');
    } else if (isOnline && state === 'offline') {
      setState('idle');
    }
  }, [isOnline, state]);

  // ============================================
  // DRAG & DROP HANDLERS
  // ============================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    setIsDragging(true);
    setState('dragging');
    
    dragStartRef.current = {
      x: e.screenX,
      y: e.screenY
    };

    // Notifier Electron
    (window as any).electronAPI?.invoke('bubble:drag-start', {
      x: e.screenX,
      y: e.screenY
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.screenX - dragStartRef.current.x;
    const deltaY = e.screenY - dragStartRef.current.y;
    
    setDragPosition({ x: deltaX, y: deltaY });

    // Notifier Electron pour déplacer la fenêtre
    (window as any).electronAPI?.invoke('bubble:drag-move', {
      x: e.screenX,
      y: e.screenY
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setState('idle');
    setDragPosition({ x: 0, y: 0 });

    // Notifier Electron
    (window as any).electronAPI?.invoke('bubble:drag-end');
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

  // ============================================
  // FILE DRAG & DROP
  // ============================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragging && state !== 'sending') {
      setState('hover');
    }
  }, [isDragging, state]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (state === 'hover') {
      setState('idle');
    }
  }, [state]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setState('sending');
    
    try {
      const files = Array.from(e.dataTransfer.files);
      
      if (files.length > 0) {
        const filePaths = files.map(f => ({
          name: f.name,
          path: (f as any).path || '',
          size: f.size,
          type: f.type
        }));
        
        const result = await (window as any).electronAPI?.invoke('focus-mode:upload-files', filePaths);
        
        if (result?.success) {
          setState('success');
          setTimeout(() => setState('idle'), 2000);
        } else {
          setState('error');
          setTimeout(() => setState('idle'), 2000);
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, []);

  // ============================================
  // QUICK SEND (Ctrl+Maj+C)
  // ============================================

  const handleQuickSend = useCallback(async () => {
    if (state === 'sending' || !isOnline) return;
    
    setState('sending');
    
    try {
      const result = await (window as any).electronAPI?.invoke('focus-mode:quick-send');
      
      if (result?.success) {
        setState('success');
        setTimeout(() => setState('idle'), 2000);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    } catch (error) {
      console.error('Quick send error:', error);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [state, isOnline]);

  // ============================================
  // MENU ACTIONS
  // ============================================

  const handleOpenMain = useCallback(async () => {
    await (window as any).electronAPI?.invoke('window:show-main');
    setShowMenu(false);
  }, []);

  const handleDisableFocus = useCallback(async () => {
    await (window as any).electronAPI?.invoke('focus-mode:disable');
    setShowMenu(false);
  }, []);

  const handleOpenSettings = useCallback(async () => {
    await (window as any).electronAPI?.invoke('window:show-main');
    await (window as any).electronAPI?.invoke('window:open-config');
    setShowMenu(false);
  }, []);

  // ============================================
  // ÉVÉNEMENTS EXTERNES
  // ============================================

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    
    // Écouter les envois réussis
    const handleClipSent = () => {
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    };

    // Écouter les changements d'état
    const handleStateChange = (_: any, newState: BubbleState) => {
      setState(newState);
    };

    electronAPI?.on('bubble:clip-sent', handleClipSent);
    electronAPI?.on('bubble:state-change', handleStateChange);

    return () => {
      electronAPI?.removeListener('bubble:clip-sent', handleClipSent);
      electronAPI?.removeListener('bubble:state-change', handleStateChange);
    };
  }, []);

  // ============================================
  // HOVER HANDLERS
  // ============================================

  const handleMouseEnter = useCallback(() => {
    if (state === 'idle') {
      setState('hover');
    }
  }, [state]);

  const handleMouseLeaveElement = useCallback(() => {
    if (state === 'hover' && !showMenu) {
      setState('idle');
    }
  }, [state, showMenu]);

  // ============================================
  // RENDU
  // ============================================

  // Couleur de base selon l'état
  const getBaseColor = () => {
    switch (state) {
      case 'offline':
        return 'from-gray-400 to-gray-500';
      case 'error':
        return 'from-red-400 to-red-500';
      case 'success':
        return 'from-green-400 to-green-500';
      case 'sending':
        return 'from-blue-400 to-blue-500';
      default:
        return 'from-violet-500 to-indigo-600';
    }
  };

  // Scale selon l'état
  const getScale = () => {
    if (state === 'dragging') return 0.95;
    if (state === 'hover') return 1.08;
    if (state === 'success') return 1.12;
    return 1;
  };

  // Icône selon l'état
  const getIcon = () => {
    switch (state) {
      case 'sending':
        return <Loader2 size={24} className="animate-spin" />;
      case 'success':
        return <Check size={24} />;
      case 'error':
        return <AlertCircle size={24} />;
      case 'offline':
        return <WifiOff size={24} />;
      default:
        return <NotionClipperLogo size={24} />;
    }
  };

  return (
    <div
      className="w-screen h-screen flex items-center justify-center overflow-hidden select-none"
      style={{
        background: 'transparent',
        // @ts-ignore - Electron specific CSS property
        WebkitAppRegion: 'no-drag'
      } as React.CSSProperties}
    >
      {/* Bubble Container */}
      <div className="relative">
        
        {/* Glow Ring - Animation continue */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${
              state === 'offline' ? 'rgba(156, 163, 175, 0.3)' :
              state === 'error' ? 'rgba(239, 68, 68, 0.3)' :
              state === 'success' ? 'rgba(34, 197, 94, 0.3)' :
              'rgba(139, 92, 246, 0.3)'
            } 0%, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Main Bubble */}
        <motion.div
          ref={bubbleRef}
          className={`
            relative w-16 h-16 rounded-full cursor-pointer
            bg-gradient-to-br ${getBaseColor()}
            shadow-xl
            flex items-center justify-center
            overflow-hidden
          `}
          style={{
            boxShadow: `
              0 4px 20px ${
                state === 'offline' ? 'rgba(156, 163, 175, 0.4)' :
                state === 'error' ? 'rgba(239, 68, 68, 0.4)' :
                state === 'success' ? 'rgba(34, 197, 94, 0.4)' :
                'rgba(139, 92, 246, 0.4)'
              },
              0 0 40px ${
                state === 'offline' ? 'rgba(156, 163, 175, 0.2)' :
                state === 'error' ? 'rgba(239, 68, 68, 0.2)' :
                state === 'success' ? 'rgba(34, 197, 94, 0.2)' :
                'rgba(139, 92, 246, 0.2)'
              }
            `
          }}
          animate={{
            scale: getScale(),
            rotate: isDragging ? [0, -2, 2, -2, 0] : 0
          }}
          transition={{
            scale: { type: 'spring', stiffness: 300, damping: 20 },
            rotate: { duration: 0.3 }
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeaveElement}
          onClick={() => !isDragging && setShowMenu(!showMenu)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Animated Background Circles */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle at 30% 30%, white, transparent)'
            }}
            animate={{
              scale: state === 'sending' ? [1, 1.2, 1] : 1,
              opacity: state === 'sending' ? [0.3, 0.6, 0.3] : 0.3
            }}
            transition={{
              duration: 1,
              repeat: state === 'sending' ? Infinity : 0
            }}
          />

          {/* Icon Container */}
          <motion.div
            className="relative z-10 text-white"
            animate={{
              rotate: state === 'sending' ? 360 : 0
            }}
            transition={{
              duration: 2,
              repeat: state === 'sending' ? Infinity : 0,
              ease: 'linear'
            }}
          >
            {getIcon()}
          </motion.div>

          {/* Counter Badge */}
          {clipCount > 0 && state !== 'sending' && (
            <motion.div
              className="absolute -top-1 -right-1 bg-white text-violet-600 font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              {clipCount}
            </motion.div>
          )}

          {/* Ripple Effect on Success */}
          {state === 'success' && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-white"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </motion.div>

        {/* Contextual Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="absolute left-full ml-3 top-0 bg-white rounded-xl shadow-2xl overflow-hidden"
              style={{ minWidth: '200px' }}
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Page Info */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-violet-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium">Mode Focus</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {pageTitle}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  {isOnline ? (
                    <>
                      <Wifi size={12} className="text-green-500" />
                      <span>En ligne</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={12} className="text-red-500" />
                      <span>Hors ligne</span>
                    </>
                  )}
                  <span className="mx-1">•</span>
                  <span>{clipCount} clip{clipCount > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={handleQuickSend}
                  disabled={!isOnline}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Envoyer le presse-papiers
                  </span>
                </button>

                <button
                  onClick={handleOpenMain}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <ExternalLink size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Ouvrir l'application
                  </span>
                </button>

                <button
                  onClick={handleOpenSettings}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Paramètres
                  </span>
                </button>

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={handleDisableFocus}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
                >
                  <X size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    Désactiver le Mode Focus
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag Indicator */}
        {isDragging && (
          <motion.div
            className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/75 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Déplacer la bulle
          </motion.div>
        )}

        {/* Drop Zone Indicator */}
        {state === 'hover' && !isDragging && (
          <motion.div
            className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-violet-600 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Déposer pour envoyer
          </motion.div>
        )}
      </div>
    </div>
  );
};