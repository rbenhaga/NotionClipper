// packages/ui/src/components/focus-mode/FloatingBubble.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Target,
  X,
  Settings,
  Eye,
  Check,
  Loader2,
  AlertCircle,
  WifiOff,
  FileUp,
  Sparkles
} from 'lucide-react';

type BubbleState = 'idle' | 'hover' | 'dragging' | 'sending' | 'success' | 'error' | 'offline';

export interface FloatingBubbleProps {
  isActive?: boolean;
  pageTitle?: string;
  clipCount?: number;
  isOnline?: boolean;
}

interface MenuOption {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  danger?: boolean;
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  isActive = false,
  pageTitle = 'Page',
  clipCount = 0,
  isOnline = true
}) => {
  const [state, setState] = useState<BubbleState>(isActive ? 'idle' : 'idle');
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileHover, setIsFileHover] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });
  const controls = useAnimation();

  // ============================================
  // GESTION ÉTAT ONLINE/OFFLINE
  // ============================================

  useEffect(() => {
    if (!isOnline && state !== 'offline') {
      setState('offline');
    } else if (isOnline && state === 'offline') {
      setState('idle');
    }
  }, [isOnline, state]);

  // ============================================
  // ANIMATIONS DE SUCCÈS
  // ============================================

  const playSuccessAnimation = useCallback(async () => {
    await controls.start({
      scale: [1, 1.3, 1],
      rotate: [0, 10, -10, 0],
      transition: { duration: 0.6, ease: 'easeOut' }
    });
  }, [controls]);

  // ============================================
  // DRAG & DROP FILE HANDLERS
  // ============================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsFileHover(true);
    }
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

    if (!isActive) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setState('sending');

    try {
      const result = await (window as any).electronAPI?.focusMode.uploadFiles(files);
      
      if (result?.success) {
        setState('success');
        await playSuccessAnimation();
        setTimeout(() => setState('idle'), 1500);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [isActive, playSuccessAnimation]);

  // ============================================
  // MOUSE DRAG HANDLERS
  // ============================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || showMenu) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setState('dragging');
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      windowX: e.screenX,
      windowY: e.screenY
    };

    (window as any).electronAPI?.invoke('bubble:drag-start', {
      x: e.screenX,
      y: e.screenY
    });

    // Activer les événements souris
    (window as any).electronAPI?.invoke('bubble:set-mouse-events', true);
  }, [showMenu]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    (window as any).electronAPI?.invoke('bubble:drag-move', {
      x: e.screenX,
      y: e.screenY
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setState('idle');

    (window as any).electronAPI?.invoke('bubble:drag-end');
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ============================================
  // CLIC RAPIDE (QUICK SEND)
  // ============================================

  const handleQuickSend = useCallback(async () => {
    if (!isActive || state === 'sending' || !isOnline) return;
    
    setState('sending');
    
    try {
      const result = await (window as any).electronAPI?.focusMode.quickSend();
      
      if (result?.success) {
        setState('success');
        await playSuccessAnimation();
        setTimeout(() => setState('idle'), 1500);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    } catch (error) {
      console.error('Quick send error:', error);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [isActive, state, isOnline, playSuccessAnimation]);

  // ============================================
  // MENU CONTEXTUEL
  // ============================================

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragging) {
      setShowMenu(!showMenu);
    }
  }, [isDragging, showMenu]);

  const menuOptions: MenuOption[] = [
    {
      icon: <Eye size={16} />,
      label: 'Ouvrir l\'app principale',
      action: async () => {
        await (window as any).electronAPI?.invoke('window:show-main');
        setShowMenu(false);
      }
    },
    {
      icon: <Settings size={16} />,
      label: 'Paramètres du Mode Focus',
      action: async () => {
        await (window as any).electronAPI?.invoke('window:show-main');
        await (window as any).electronAPI?.invoke('window:open-config');
        setShowMenu(false);
      }
    },
    {
      icon: <X size={16} />,
      label: 'Quitter le Mode Focus',
      action: async () => {
        await (window as any).electronAPI?.focusMode.disable();
        setShowMenu(false);
      },
      danger: true
    }
  ];

  // Fermer menu si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // ============================================
  // ÉVÉNEMENTS EXTERNES
  // ============================================

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    
    const handleClipSent = async () => {
      setState('success');
      await playSuccessAnimation();
      setTimeout(() => setState('idle'), 1500);
    };

    const handleStateChange = (_: any, newState: BubbleState) => {
      setState(newState);
    };

    electronAPI?.on('bubble:clip-sent', handleClipSent);
    electronAPI?.on('bubble:state-change', handleStateChange);

    return () => {
      electronAPI?.removeListener('bubble:clip-sent', handleClipSent);
      electronAPI?.removeListener('bubble:state-change', handleStateChange);
    };
  }, [playSuccessAnimation]);

  // ============================================
  // RENDU
  // ============================================

  const getStateColor = () => {
    switch (state) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'sending': return '#3b82f6';
      case 'offline': return '#6b7280';
      case 'dragging': return '#8b5cf6';
      default: return isActive ? '#0066ff' : '#6b7280';
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case 'success': return <Check size={24} strokeWidth={3} />;
      case 'error': return <AlertCircle size={24} />;
      case 'sending': return <Loader2 size={24} className="animate-spin" />;
      case 'offline': return <WifiOff size={24} />;
      default: return isActive ? <Target size={24} /> : <Sparkles size={24} />;
    }
  };

  return (
    <div
      ref={bubbleRef}
      className="fixed inset-0 flex items-center justify-center"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Bulle principale */}
      <motion.div
        animate={controls}
        whileHover={!isDragging ? { scale: 1.1 } : {}}
        whileTap={!isDragging ? { scale: 0.95 } : {}}
        className="relative cursor-pointer"
        style={{
          width: 64,
          height: 64,
          userSelect: 'none',
          // @ts-ignore - WebkitAppRegion is not in the type definitions but is valid CSS
          WebkitAppRegion: 'no-drag'
        } as React.CSSProperties}
        onMouseDown={handleMouseDown}
        onClick={handleQuickSend}
        onContextMenu={handleRightClick}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          animate={{
            backgroundColor: getStateColor(),
            opacity: state === 'sending' ? [0.3, 0.6, 0.3] : [0.2, 0.4, 0.2],
            scale: state === 'success' ? [1, 1.5, 1] : 1
          }}
          transition={{
            duration: state === 'sending' ? 1.5 : 2,
            repeat: state === 'sending' ? Infinity : 0,
            ease: 'easeInOut'
          }}
        />

        {/* Cercle principal */}
        <motion.div
          className="absolute inset-0 rounded-full backdrop-blur-md border-2 flex items-center justify-center"
          style={{
            backgroundColor: `${getStateColor()}15`,
            borderColor: getStateColor(),
            boxShadow: `0 8px 32px ${getStateColor()}40`
          }}
          animate={{
            borderColor: getStateColor(),
            scale: isFileHover ? 1.15 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="text-white"
            animate={{
              rotate: state === 'sending' ? 360 : 0,
              scale: state === 'success' ? [1, 1.2, 1] : 1
            }}
            transition={{
              rotate: { duration: 2, repeat: state === 'sending' ? Infinity : 0, ease: 'linear' },
              scale: { duration: 0.5 }
            }}
          >
            {getStateIcon()}
          </motion.div>
        </motion.div>

        {/* Badge compteur */}
        <AnimatePresence>
          {clipCount > 0 && state !== 'dragging' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg"
            >
              {clipCount}
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
              className="absolute inset-0 rounded-full bg-blue-500/20 backdrop-blur-sm border-2 border-dashed border-blue-400 flex items-center justify-center"
            >
              <FileUp size={28} className="text-blue-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Menu contextuel liquide */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute"
            style={{
              top: -200,
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: 220
            }}
          >
            {/* Flèche pointant vers la bulle */}
            <div className="absolute left-1/2 bottom-0 w-4 h-4 bg-gray-900/95 backdrop-blur-xl transform rotate-45 -translate-x-1/2 translate-y-2" />
            
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-700/50">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Mode Focus</div>
                <div className="text-sm font-semibold text-white mt-0.5 truncate">{pageTitle}</div>
              </div>

              {/* Options */}
              <div className="py-2">
                {menuOptions.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={option.action}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      option.danger ? 'text-red-400' : 'text-gray-200'
                    }`}
                  >
                    <span className={option.danger ? 'text-red-400' : 'text-gray-400'}>
                      {option.icon}
                    </span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};