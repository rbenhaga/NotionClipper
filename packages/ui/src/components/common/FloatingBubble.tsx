// packages/ui/src/components/focus-mode/FloatingBubble.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Check,
  AlertCircle,
  Loader2,
  WifiOff,
  Eye,
  Minimize2,
  FileUp,
  Zap
} from 'lucide-react';

// Logo SVG pour la bulle
const BubbleLogo: React.FC<{ size?: number; color?: string }> = ({ 
  size = 28, 
  color = '#374151' 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id={`bubbleLogoGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} />
        <stop offset="100%" stopColor={color} stopOpacity="0.8" />
      </linearGradient>
    </defs>
    {/* Logo Notion Clipper - Étoile stylisée */}
    <path
      d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill={`url(#bubbleLogoGradient-${size})`}
      stroke={`url(#bubbleLogoGradient-${size})`}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Petites étoiles décoratives */}
    <path d="M20 3v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M22 5h-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 17v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 18H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type BubbleState = 'idle' | 'active' | 'sending' | 'success' | 'error' | 'offline' | 'dragging';

export interface FloatingBubbleProps {
  isActive?: boolean;
  pageTitle?: string;
  clipCount?: number;
}

export const FloatingBubble = memo<FloatingBubbleProps>(({ 
  isActive = false, 
  pageTitle = 'Page',
  clipCount = 0 
}) => {
  // ============================================
  // ÉTAT
  // ============================================
  
  const [state, setState] = useState<BubbleState>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileHover, setIsFileHover] = useState(false);
  const [counter, setCounter] = useState(clipCount);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const electronAPIRef = useRef<any>(null);
  const controls = useAnimation();

  // ============================================
  // INITIALISATION
  // ============================================

  useEffect(() => {
    if (typeof window !== 'undefined') {
      electronAPIRef.current = (window as any).electronAPI;
    }

    setState(isActive ? 'active' : 'idle');
  }, [isActive]);

  useEffect(() => {
    setCounter(clipCount);
  }, [clipCount]);

  // ============================================
  // ANIMATIONS DE SUCCÈS
  // ============================================

  const playSuccessAnimation = useCallback(async () => {
    await controls.start({
      scale: [1, 1.3, 0.9, 1.1, 1],
      rotate: [0, -10, 10, -5, 5, 0],
      transition: { 
        duration: 0.6, 
        ease: [0.34, 1.56, 0.64, 1] // Apple spring
      }
    });
  }, [controls]);

  // ============================================
  // ÉVÉNEMENTS EXTERNES ELECTRON
  // ============================================

  useEffect(() => {
    const electronAPI = electronAPIRef.current;
    if (!electronAPI) return;

    const handleClipSent = async () => {
      setState('success');
      await playSuccessAnimation();
      setTimeout(() => setState(isActive ? 'active' : 'idle'), 1500);
    };

    const handleStateChange = (_: any, newState: BubbleState) => {
      setState(newState);
    };

    const handleCounterUpdate = (_: any, count: number) => {
      setCounter(count);
    };

    const handleMenuOpened = () => {
      setShowMenu(true);
    };

    const handleMenuClosed = () => {
      setShowMenu(false);
    };

    const handleDragState = (_: any, dragging: boolean) => {
      setIsDragging(dragging);
      setState(dragging ? 'dragging' : (isActive ? 'active' : 'idle'));
    };

    electronAPI.on?.('bubble:clip-sent', handleClipSent);
    electronAPI.on?.('bubble:state-change', handleStateChange);
    electronAPI.on?.('bubble:update-counter', handleCounterUpdate);
    electronAPI.on?.('bubble:menu-opened', handleMenuOpened);
    electronAPI.on?.('bubble:menu-closed', handleMenuClosed);
    electronAPI.on?.('bubble:drag-state', handleDragState);

    return () => {
      electronAPI.removeListener?.('bubble:clip-sent', handleClipSent);
      electronAPI.removeListener?.('bubble:state-change', handleStateChange);
      electronAPI.removeListener?.('bubble:update-counter', handleCounterUpdate);
      electronAPI.removeListener?.('bubble:menu-opened', handleMenuOpened);
      electronAPI.removeListener?.('bubble:menu-closed', handleMenuClosed);
      electronAPI.removeListener?.('bubble:drag-state', handleDragState);
    };
  }, [playSuccessAnimation, isActive]);

  // ============================================
  // DRAG & DROP - Bulle
  // ============================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (showMenu) {
      return; // Pas de drag pendant que le menu est ouvert
    }
    
    setIsDragging(true);
    
    electronAPIRef.current?.invoke('bubble:drag-start', {
      x: e.screenX,
      y: e.screenY
    });
  }, [showMenu]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    electronAPIRef.current?.invoke('bubble:drag-move', {
      x: e.screenX,
      y: e.screenY
    });
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

  // ============================================
  // CLIC SIMPLE - Ouvrir menu
  // ============================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDragging || showMenu) return;
    
    // Clic simple ouvre le menu
    electronAPIRef.current?.invoke('bubble:toggle-menu');
  }, [isDragging, showMenu]);

  // ============================================
  // ACTIONS MENU
  // ============================================

  const handleShowMain = useCallback(async () => {
    await electronAPIRef.current?.invoke('window:show-main');
    await electronAPIRef.current?.invoke('bubble:close-menu');
  }, []);

  const handleQuickSend = useCallback(async () => {
    await electronAPIRef.current?.invoke('focus-mode:quick-send');
    await electronAPIRef.current?.invoke('bubble:close-menu');
  }, []);

  const handleDisable = useCallback(async () => {
    await electronAPIRef.current?.invoke('focus-mode:disable');
  }, []);

  // ============================================
  // DRAG & DROP - Fichiers
  // ============================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileHover(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileHover(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileHover(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const fileData = files.map(f => ({
      path: (f as any).path || f.name, // Dans Electron, File a une propriété path
      name: f.name,
      type: f.type,
      size: f.size
    }));

    await electronAPIRef.current?.invoke('focus-mode:upload-files', fileData);
  }, []);

  // ============================================
  // FERMER MENU SI CLIC EN DEHORS
  // ============================================

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        bubbleRef.current && 
        !bubbleRef.current.contains(e.target as Node)
      ) {
        electronAPIRef.current?.invoke('bubble:close-menu');
      }
    };

    if (showMenu) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // ============================================
  // HELPERS VISUELS
  // ============================================

  const getStateColor = () => {
    // Toujours retourner blanc pour le fond
    return '#ffffff';
  };

  const getStateIcon = () => {
    const getIconColor = () => {
      switch (state) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'sending': return '#3b82f6';
        case 'offline': return '#6b7280';
        default: return '#374151';
      }
    };

    switch (state) {
      case 'success': return <Check size={28} strokeWidth={3} color={getIconColor()} />;
      case 'error': return <AlertCircle size={28} color={getIconColor()} />;
      case 'sending': return <Loader2 size={28} className="animate-spin" color={getIconColor()} />;
      case 'offline': return <WifiOff size={28} color={getIconColor()} />;
      default: return <BubbleLogo size={28} color={getIconColor()} />;
    }
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <div
      ref={bubbleRef}
      className="fixed inset-0 flex items-center justify-center"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        pointerEvents: showMenu ? 'auto' : 'auto',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Bulle principale */}
      <motion.div
        animate={controls}
        whileHover={!isDragging && !showMenu ? { scale: 1.08 } : {}}
        whileTap={!isDragging && !showMenu ? { scale: 0.95 } : {}}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="relative flex items-center justify-center transition-all duration-200"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.15),
            0 2px 8px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.8)
          `,
          backdropFilter: 'blur(20px) saturate(180%)',
          cursor: isDragging ? 'grabbing' : (showMenu ? 'default' : 'grab'),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto'
        }}
      >
        {/* Icône état */}
        <motion.div
          className="text-white"
          animate={{
            rotate: state === 'sending' ? 360 : 0,
            scale: state === 'success' ? [1, 1.2, 1] : 1
          }}
          transition={{
            rotate: { 
              duration: 1.5, 
              repeat: state === 'sending' ? Infinity : 0, 
              ease: 'linear' 
            },
            scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
          }}
        >
          {getStateIcon()}
        </motion.div>

        {/* Badge compteur */}
        <AnimatePresence>
          {counter > 0 && state !== 'dragging' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="absolute -top-1 -right-1 flex items-center justify-center px-2 min-w-[24px] h-6 rounded-full text-xs font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
            >
              {counter}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicateur file hover */}
        <AnimatePresence>
          {isFileHover && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '3px dashed rgba(59, 130, 246, 0.5)'
              }}
            >
              <FileUp size={32} className="text-blue-400" strokeWidth={2} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Menu contextuel - Affiché dans la fenêtre agrandie */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              mass: 0.8
            }}
            className="absolute top-0 left-0 right-0 bottom-16 mx-auto my-auto flex flex-col"
            style={{
              width: '240px',
              maxHeight: '280px',
              pointerEvents: 'auto'
            }}
          >
            {/* Carte menu */}
            <div 
              className="flex-1 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(30, 30, 35, 0.98)',
                backdropFilter: 'blur(40px) saturate(180%)',
                boxShadow: `
                  0 20px 60px rgba(0, 0, 0, 0.3),
                  0 0 0 1px rgba(255, 255, 255, 0.08),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Mode Focus
                </div>
                <div className="text-sm font-medium text-white/90 truncate flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {pageTitle}
                </div>
              </div>

              {/* Options */}
              <div className="py-1.5">
                {/* Envoyer contenu */}
                <motion.button
                  onClick={handleQuickSend}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                    <Zap size={16} className="text-blue-400" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white/90">Envoyer le contenu</div>
                    <div className="text-xs text-gray-400">Ctrl+Maj+C</div>
                  </div>
                </motion.button>

                {/* Voir l'application */}
                <motion.button
                  onClick={handleShowMain}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10">
                    <Eye size={16} className="text-purple-400" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white/90">Voir l'application</div>
                  </div>
                </motion.button>

                {/* Divider */}
                <div className="h-px bg-white/5 mx-2 my-1.5" />

                {/* Désactiver */}
                <motion.button
                  onClick={handleDisable}
                  whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10">
                    <Minimize2 size={16} className="text-red-400" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-400">Quitter le Mode Focus</div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Flèche pointant vers la bulle */}
            <div className="flex items-center justify-center pt-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 rotate-45"
                style={{
                  background: 'rgba(30, 30, 35, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderTop: 'none',
                  borderLeft: 'none',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

FloatingBubble.displayName = 'FloatingBubble';

export default FloatingBubble;