// packages/ui/src/components/common/FloatingBubble.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Maximize2, X, Upload } from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';

export interface FloatingBubbleProps {
  isActive: boolean;
  pageTitle: string;
  clipCount: number;
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  isActive,
  pageTitle,
  clipCount
}) => {
  const [state, setState] = useState<'idle' | 'hover' | 'dragging' | 'sending' | 'success'>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);


  // ============================================
  // HANDLERS
  // ============================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Bubble clicked! Toggling menu from', showMenu, 'to', !showMenu);
    setShowMenu(!showMenu);
  }, [showMenu]);

  // Drag séparé - seulement avec Alt+Click ou clic droit
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Drag seulement avec Alt+clic ou clic droit
    if (e.altKey || e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setState('dragging');

      const startPos = { x: e.screenX, y: e.screenY };
      (window as any).electronAPI?.invoke('bubble:drag-start', startPos);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        (window as any).electronAPI?.invoke('bubble:drag-move', {
          x: moveEvent.screenX,
          y: moveEvent.screenY
        });
      };

      const handleMouseUp = () => {
        (window as any).electronAPI?.invoke('bubble:drag-end');
        setIsDragging(false);
        setState('idle');
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const handleQuickSend = useCallback(async () => {
    setState('sending');
    setShowMenu(false);
    
    try {
      await (window as any).electronAPI?.invoke('focus-mode:quick-send');
      setState('success');
      setTimeout(() => setState('idle'), 1000);
    } catch (error) {
      console.error('Quick send error:', error);
      setState('idle');
    }
  }, []);

  const handleOpenMain = useCallback(() => {
    (window as any).electronAPI?.invoke('window-show');
    setShowMenu(false);
  }, []);

  const handleDisableFocus = useCallback(async () => {
    await (window as any).electronAPI?.invoke('focus-mode:disable');
    setShowMenu(false);
  }, []);

  const handleFileUpload = useCallback(() => {
    // TODO: Implémenter l'upload de fichiers
    setShowMenu(false);
  }, []);

  // Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('hover');
  }, []);

  const handleDragLeave = useCallback(() => {
    setState('idle');
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setState('sending');
    
    try {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await (window as any).electronAPI?.invoke('focus-mode:upload-files', files);
        setState('success');
        setTimeout(() => setState('idle'), 1000);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setState('idle');
    }
  }, []);

  // Activer les événements souris au montage
  useEffect(() => {
    (window as any).electronAPI?.invoke('bubble:set-mouse-events', true);
  }, []);

  // Fermer le menu en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMenu && !target.closest('.floating-bubble') && !target.closest('.bubble-menu')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="w-full h-full flex items-center justify-center relative select-none">


      {/* Bulle principale */}
      <motion.div
        className={`
          floating-bubble relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-300 ease-out
          bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25
          ${state === 'hover' ? 'scale-105 shadow-xl shadow-violet-500/40' : ''}
          ${state === 'dragging' ? 'scale-95 shadow-2xl shadow-violet-500/50' : ''}
          ${state === 'sending' ? 'animate-pulse' : ''}
          ${state === 'success' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : ''}
        `}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => !isDragging && setState('hover')}
        onMouseLeave={() => !isDragging && !showMenu && setState('idle')}
        onContextMenu={(e) => e.preventDefault()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Logo de l'app - Blanc sur fond violet */}
        <div className="relative z-10 text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" 
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M20 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M22 5h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M4 17v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5 18H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Badge compteur */}
        {clipCount > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full
                       bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold
                       flex items-center justify-center shadow-lg shadow-red-500/40
                       border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={clipCount}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <motion.span
              key={clipCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {clipCount}
            </motion.span>
          </motion.div>
        )}


      </motion.div>

      {/* Menu contextuel */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="bubble-menu absolute top-0 right-20 min-w-[220px] bg-white/98 backdrop-blur-md
                       rounded-xl shadow-xl shadow-black/10 border border-gray-200/50 p-2 z-50"
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Info de la page */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {pageTitle}
              </div>
              <div className="text-xs text-gray-500">
                {clipCount} clip{clipCount !== 1 ? 's' : ''} envoyé{clipCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-violet-600
                           hover:bg-violet-50 rounded-lg transition-colors"
                onClick={handleQuickSend}
              >
                <Send size={16} />
                <span className="flex-1 text-left">Envoyer</span>
                <kbd className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded font-mono">⌘⇧C</kbd>
              </button>

              <button 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700
                           hover:bg-gray-50 rounded-lg transition-colors"
                onClick={handleOpenMain}
              >
                <Maximize2 size={16} />
                <span>Ouvrir l'app</span>
              </button>

              <button 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700
                           hover:bg-gray-50 rounded-lg transition-colors"
                onClick={handleFileUpload}
              >
                <Upload size={16} />
                <span>Uploader fichier</span>
              </button>
            </div>

            <div className="border-t border-gray-100 pt-1">
              <button 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600
                           hover:bg-red-50 rounded-lg transition-colors"
                onClick={handleDisableFocus}
              >
                <X size={16} />
                <span>Désactiver</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};