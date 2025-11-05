// packages/ui/src/components/focus-mode/FloatingBubble.tsx
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Eye, Settings, Minimize2, Upload } from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';

type BubbleState = 'idle' | 'sending' | 'success' | 'error' | 'offline';

interface FloatingBubbleProps {
  pageTitle?: string;
  isOnline?: boolean;
}



// ============================================
// 🎯 COMPOSANT PRINCIPAL
// ============================================

export const FloatingBubble = memo<FloatingBubbleProps>(({
  pageTitle = 'Page',
  isOnline = true,
}) => {
  // État
  const [state, setState] = useState<BubbleState>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileHover, setIsFileHover] = useState(false);
  
  // Refs
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();
  const electronAPIRef = useRef<any>(null);
  
  // Animations
  const bubbleControls = useAnimation();
  const logoControls = useAnimation();
  const haloControls = useAnimation();

  // ============================================
  // INITIALISATION
  // ============================================

  useEffect(() => {
    if (typeof window !== 'undefined') {
      electronAPIRef.current = (window as any).electronAPI;
    }
  }, []);

  // ============================================
  // GESTION DES ÉVÉNEMENTS ELECTRON
  // ============================================

  useEffect(() => {
    const electronAPI = electronAPIRef.current;
    if (!electronAPI) return;

    const handleStateChange = (_: any, newState: BubbleState) => {
      setState(newState);
      
      // Animations organiques selon l'état
      if (newState === 'success') {
        // Animation de vague/ripple
        haloControls.start({
          scale: [1, 2.5, 1],
          opacity: [0.6, 0, 0.6],
          transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] }
        });
        
        // Logo bounce
        logoControls.start({
          scale: [1, 1.15, 0.95, 1.05, 1],
          rotate: [0, -5, 5, -3, 0],
          transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }
        });
      } else if (newState === 'error') {
        // Shake subtil
        bubbleControls.start({
          x: [0, -3, 3, -3, 3, 0],
          transition: { duration: 0.5 }
        });
      }
    };

    const handleDragState = (_: any, dragging: boolean) => {
      setIsDragging(dragging);
    };

    electronAPI.on('bubble:state-change', handleStateChange);
    electronAPI.on('bubble:drag-state', handleDragState);
    electronAPI.on('bubble:clip-sent', () => handleStateChange(null, 'success'));

    return () => {
      electronAPI.removeListener('bubble:state-change', handleStateChange);
      electronAPI.removeListener('bubble:drag-state', handleDragState);
      electronAPI.removeListener('bubble:clip-sent', handleStateChange);
    };
  }, [bubbleControls, logoControls, haloControls]);

  // ============================================
  // DRAG & DROP
  // ============================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (showMenu) return;
    
    // Ne pas empêcher le comportement par défaut pour permettre le clic normal
    e.stopPropagation();
    
    // Démarrer le drag seulement si on maintient le clic et qu'on bouge la souris
    const startX = e.clientX;
    const startY = e.clientY;
    
    const handleMouseMoveStart = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);
      
      // Commencer le drag seulement si on bouge de plus de 5px
      if (deltaX > 5 || deltaY > 5) {
        setIsDragging(true);
        electronAPIRef.current?.invoke('bubble:drag-start', {
          x: moveEvent.screenX,
          y: moveEvent.screenY
        });
        
        // Nettoyer les listeners temporaires
        window.removeEventListener('mousemove', handleMouseMoveStart);
        window.removeEventListener('mouseup', handleMouseUpStart);
      }
    };
    
    const handleMouseUpStart = () => {
      // Nettoyer les listeners si on relâche sans avoir bougé
      window.removeEventListener('mousemove', handleMouseMoveStart);
      window.removeEventListener('mouseup', handleMouseUpStart);
    };
    
    window.addEventListener('mousemove', handleMouseMoveStart);
    window.addEventListener('mouseup', handleMouseUpStart);
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
  // CLIC SIMPLE (pas d'envoi automatique)
  // ============================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDragging || showMenu) return;
    
    // Ne rien faire au clic simple - juste empêcher la propagation
    // L'utilisateur peut utiliser le menu contextuel pour les actions
  }, [isDragging, showMenu]);

  // ============================================
  // MENU CONTEXTUEL (Clic droit)
  // ============================================

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(prev => !prev);
  }, []);

  // Actions menu
  const handleShowMain = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('window:show-main');
  }, []);

  const handleOpenConfig = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('window:open-config');
  }, []);

  const handleDisable = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('focus-mode:disable');
  }, []);

  // ============================================
  // DRAG & DROP FICHIERS
  // ============================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsFileHover(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsFileHover(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileHover(false);
    
    const files = Array.from(e.dataTransfer.files).map(file => ({
      path: (file as any).path || file.name,
      name: file.name,
      type: file.type,
    }));
    
    if (files.length === 0) return;
    
    setState('sending');
    
    try {
      const result = await electronAPIRef.current?.invoke('focus-mode:upload-files', files);
      if (result?.success) {
        setState('success');
        setTimeout(() => setState('idle'), 2000);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    } catch (error) {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, []);

  // ============================================
  // HELPERS VISUELS
  // ============================================

  const getBubbleFilter = () => {
    if (!isOnline) return 'grayscale(1) opacity(0.5)';
    
    switch (state) {
      case 'sending': return 'brightness(0.9)';
      case 'success': return 'brightness(1.1)';
      case 'error': return 'saturate(1.5) hue-rotate(10deg)';
      default: return 'none';
    }
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        background: 'transparent',
        pointerEvents: 'auto' 
      }}
    >
      <div className="relative">
        {/* ====== HALO EXTÉRIEUR (animations de feedback) ====== */}
        <motion.div
          animate={haloControls}
          className="absolute inset-0 rounded-full"
          style={{
            background: isFileHover 
              ? 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)'
              : state === 'success'
              ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)'
              : state === 'error'
              ? 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 70%)',
            scale: 1.4,
            opacity: 0.6,
            filter: 'blur(20px)',
          }}
        />

        {/* ====== BULLE PRINCIPALE ====== */}
        <motion.div
          ref={bubbleRef}
          animate={bubbleControls}
          whileHover={!isDragging && !showMenu ? { 
            scale: 1.02,
            transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
          } : {}}
          className="relative flex items-center justify-center cursor-pointer select-none"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 2px 8px rgba(0, 0, 0, 0.04),
              0 8px 24px rgba(0, 0, 0, 0.08),
              0 0 0 1px rgba(0, 0, 0, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.8)
            `,
            filter: getBubbleFilter(),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            userSelect: 'none',
            // @ts-ignore - WebkitAppRegion is a valid CSS property for Electron
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Cercle intérieur subtil */}
          <div
            className="absolute inset-[6px] rounded-full"
            style={{
              background: state === 'sending'
                ? 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)'
                : state === 'success'
                ? 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)'
                : state === 'error'
                ? 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)'
                : 'transparent',
              transition: 'background 0.3s ease',
            }}
          />

          {/* Logo */}
          <motion.div
            animate={logoControls}
            className="relative z-10 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              marginTop: 2, // Décale légèrement vers le bas
              color: state === 'sending' 
                ? '#3b82f6'
                : state === 'success'
                ? '#22c55e'
                : state === 'error'
                ? '#ef4444'
                : '#1f2937',
            }}
          >
            {state === 'sending' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="flex items-center justify-center"
              >
                <NotionClipperLogo size={30} />
              </motion.div>
            ) : (
              <NotionClipperLogo size={30} />
            )}
          </motion.div>

          {/* Indicateur offline */}
          {!isOnline && (
            <motion.div
              animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [0.9, 1, 0.9] 
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-400 rounded-full border-2 border-white shadow-sm"
            />
          )}

          {/* Overlay drop fichier */}
          <AnimatePresence>
            {isFileHover && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(147,51,234,0.95))',
                  border: '2px dashed white',
                }}
              >
                <Upload className="text-white" size={20} strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ====== MENU LIQUIDE / BULLES SATELLITES ====== */}
        <AnimatePresence>
          {showMenu && (
            <>
              {/* Bulle 1 : Voir l'application */}
              <motion.button
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: -70,
                  y: -10,
                }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.05 
                }}
                onClick={handleShowMain}
                className="absolute top-1/2 left-1/2 w-11 h-11 rounded-full flex items-center justify-center
                           hover:scale-110 transition-transform"
                style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
                title="Voir l'application"
              >
                <Eye size={18} className="text-gray-700" strokeWidth={2} />
              </motion.button>

              {/* Bulle 2 : Configuration */}
              <motion.button
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: -50,
                  y: -50,
                }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.1 
                }}
                onClick={handleOpenConfig}
                className="absolute top-1/2 left-1/2 w-11 h-11 rounded-full flex items-center justify-center
                           hover:scale-110 transition-transform"
                style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
                title="Configuration"
              >
                <Settings size={18} className="text-gray-700" strokeWidth={2} />
              </motion.button>

              {/* Bulle 3 : Désactiver */}
              <motion.button
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: -10,
                  y: -70,
                }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.15 
                }}
                onClick={handleDisable}
                className="absolute top-1/2 left-1/2 w-11 h-11 rounded-full flex items-center justify-center
                           hover:scale-110 transition-transform"
                style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
                title="Désactiver le Mode Focus"
              >
                <Minimize2 size={18} className="text-red-500" strokeWidth={2} />
              </motion.button>

              {/* Label de la page (apparaît au-dessus) */}
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: -80 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium
                           whitespace-nowrap"
                style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  color: '#1f2937',
                }}
              >
                {pageTitle}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Overlay transparent pour fermer le menu */}
      {showMenu && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setShowMenu(false)}
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
});

FloatingBubble.displayName = 'FloatingBubble';

export default FloatingBubble;