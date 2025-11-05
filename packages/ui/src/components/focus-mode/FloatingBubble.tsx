// packages/ui/src/components/focus-mode/FloatingBubble.tsx
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Eye, Settings, Minimize2, Upload } from 'lucide-react';


// Logo SVG violet sans étoiles pour la bulle
const BubbleLogo: React.FC<{ size?: number; className?: string }> = ({ 
  size = 30, 
  className = '' 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id={`bubbleLogoGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    {/* Logo Notion Clipper - Étoile stylisée principale seulement */}
    <path
      d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill={`url(#bubbleLogoGradient-${size})`}
      stroke={`url(#bubbleLogoGradient-${size})`}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type BubbleState = 'idle' | 'sending' | 'success' | 'error' | 'offline';

export interface FloatingBubbleProps {
  isOnline?: boolean;
}



// ============================================
// 🎯 COMPOSANT PRINCIPAL
// ============================================

export const FloatingBubble = memo<FloatingBubbleProps>(({
  isOnline = true,
}) => {
  // État
  const [state, setState] = useState<BubbleState>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileHover, setIsFileHover] = useState(false);
  
  // Refs
  const bubbleRef = useRef<HTMLDivElement>(null);
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
      console.log('[FloatingBubble] Component mounted, electronAPI available:', !!electronAPIRef.current);
      
      // Ajouter un raccourci pour ouvrir les DevTools (F12)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F12') {
          console.log('[FloatingBubble] F12 pressed - DevTools should open');
        }
        if (e.key === 'Escape') {
          console.log('[FloatingBubble] Escape pressed - closing menu');
          if (showMenu) {
            setShowMenu(false);
            electronAPIRef.current?.invoke('bubble:close-menu');
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showMenu]);

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

    const handleMenuOpened = () => {
      console.log('[FloatingBubble] Menu opened event received');
      setShowMenu(true);
    };

    const handleMenuClosed = () => {
      console.log('[FloatingBubble] Menu closed event received');
      setShowMenu(false);
    };

    // Event listeners
    electronAPI.on('bubble:state-change', handleStateChange);
    electronAPI.on('bubble:drag-state', handleDragState);
    electronAPI.on('bubble:clip-sent', () => handleStateChange(null, 'success'));
    electronAPI.on('bubble:menu-opened', handleMenuOpened);
    electronAPI.on('bubble:menu-closed', handleMenuClosed);

    return () => {
      electronAPI.removeListener('bubble:state-change', handleStateChange);
      electronAPI.removeListener('bubble:drag-state', handleDragState);
      electronAPI.removeListener('bubble:clip-sent', handleStateChange);
      electronAPI.removeListener('bubble:menu-opened', handleMenuOpened);
      electronAPI.removeListener('bubble:menu-closed', handleMenuClosed);
    };
  }, [bubbleControls, logoControls, haloControls]);

  // ============================================
  // DRAG & DROP
  // ============================================

  const [hasDragged, setHasDragged] = useState(false);
  const dragStartTimeRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (showMenu) return;
    
    console.log('[FloatingBubble] Mouse down detected');
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    dragStartTimeRef.current = Date.now();
    
    const handleMouseMoveStart = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);
      
      // Commencer le drag si on bouge de plus de 5px
      if (!hasMoved && (deltaX > 5 || deltaY > 5)) {
        hasMoved = true;
        setIsDragging(true);
        setHasDragged(true);
        console.log('[FloatingBubble] Starting drag');
        electronAPIRef.current?.invoke('bubble:drag-start', {
          x: moveEvent.screenX,
          y: moveEvent.screenY
        });
      }
    };
    
    const handleMouseUpStart = () => {
      console.log('[FloatingBubble] Mouse up, hasMoved:', hasMoved);
      window.removeEventListener('mousemove', handleMouseMoveStart);
      window.removeEventListener('mouseup', handleMouseUpStart);
      
      // Réinitialiser hasDragged après un délai plus long pour empêcher le clic
      if (hasMoved) {
        setTimeout(() => setHasDragged(false), 300);
      }
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
  // MENU CONTEXTUEL (Clic simple et clic droit)
  // ============================================

  const handleMenuToggle = useCallback(async () => {
    console.log('[FloatingBubble] Toggling menu, current state:', showMenu);
    const newShowMenu = !showMenu;
    setShowMenu(newShowMenu);
    
    try {
      if (newShowMenu) {
        console.log('[FloatingBubble] Opening menu');
        await electronAPIRef.current?.invoke('bubble:open-menu');
      } else {
        console.log('[FloatingBubble] Closing menu');
        await electronAPIRef.current?.invoke('bubble:close-menu');
      }
    } catch (error) {
      console.error('[FloatingBubble] Error toggling menu:', error);
    }
  }, [showMenu]);



  const handleQuickSend = useCallback(async () => {
    setState('sending');
    
    try {
      const result = await electronAPIRef.current?.focusMode?.quickSend();
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
  // CLIC SIMPLE
  // ============================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Empêcher le clic si on vient de faire un drag ou si on est en train de drag
    if (isDragging || hasDragged) {
      console.log('[FloatingBubble] Click ignored - was dragging');
      return;
    }
    
    // Empêcher le clic si le mousedown était récent (probable drag)
    const timeSinceMouseDown = Date.now() - dragStartTimeRef.current;
    if (timeSinceMouseDown > 200) {
      console.log('[FloatingBubble] Click ignored - too long since mousedown');
      return;
    }
    
    console.log('[FloatingBubble] Click detected, electronAPI available:', !!electronAPIRef.current);
    console.log('[FloatingBubble] Current showMenu state:', showMenu);
    handleMenuToggle();
  }, [isDragging, hasDragged, showMenu, handleMenuToggle]);

  // Actions menu
  const handleShowMain = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('bubble:close-menu');
    await electronAPIRef.current?.invoke('window:show-main');
  }, []);

  const handleOpenConfig = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('bubble:close-menu');
    // TODO: Implémenter l'ouverture de la config
    console.log('Open config - à implémenter');
  }, []);

  const handleDisable = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('bubble:close-menu');
    await electronAPIRef.current?.invoke('focus-mode:disable');
  }, []);

  const handleQuickSendFromMenu = useCallback(async () => {
    setShowMenu(false);
    await electronAPIRef.current?.invoke('bubble:close-menu');
    handleQuickSend();
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
      const result = await electronAPIRef.current?.focusMode?.uploadFiles(files);
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
        pointerEvents: 'auto',
        width: '160px',
        height: '160px'
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
          onMouseDown={(e) => {
            console.log('[FloatingBubble] MouseDown event');
            handleMouseDown(e);
          }}
          onClick={(e) => {
            console.log('[FloatingBubble] Click event');
            handleClick(e);
          }}
          onContextMenu={(e) => {
            console.log('[FloatingBubble] Context menu event');
            e.preventDefault(); // Empêcher le menu contextuel par défaut
          }}
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
                : '#8b5cf6', // Violet pour le logo par défaut
            }}
          >
            {state === 'sending' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="flex items-center justify-center"
              >
                <BubbleLogo size={30} />
              </motion.div>
            ) : (
              <BubbleLogo size={30} />
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
        <AnimatePresence mode="wait">
          {showMenu && (
            <>
              {/* Bulle 1 : Voir l'application - Position: gauche */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.02 
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShowMain();
                }}
                className="absolute rounded-full flex items-center justify-center
                           hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(calc(-50% - 42px), -50%)', // Positionnement précis à gauche
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  pointerEvents: 'auto',
                  zIndex: 1000,
                }}
                title="Voir l'application principale"
              >
                <Eye size={14} className="text-slate-600 group-hover:text-blue-600 transition-colors" strokeWidth={2} />
              </motion.button>

              {/* Bulle 2 : Configuration - Position: haut-gauche */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.04 
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenConfig();
                }}
                className="absolute rounded-full flex items-center justify-center
                           hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(calc(-50% - 30px), calc(-50% - 30px))', // Position diagonale haut-gauche
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  pointerEvents: 'auto',
                  zIndex: 1000,
                }}
                title="Ouvrir les paramètres"
              >
                <Settings size={14} className="text-slate-600 group-hover:text-purple-600 transition-colors" strokeWidth={2} />
              </motion.button>

              {/* Bulle 3 : Envoi rapide - Position: haut */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.06 
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuickSendFromMenu();
                }}
                className="absolute rounded-full flex items-center justify-center
                           hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, calc(-50% - 42px))', // Position au-dessus
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.9))',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2), 0 2px 4px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.3)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  pointerEvents: 'auto',
                  zIndex: 1000,
                }}
                title="Envoyer le contenu actuel vers Notion"
              >
                <Upload size={14} className="text-white group-hover:scale-110 transition-transform" strokeWidth={2} />
              </motion.button>

              {/* Bulle 4 : Désactiver - Position: haut-droite */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.08 
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDisable();
                }}
                className="absolute rounded-full flex items-center justify-center
                           hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(calc(-50% + 30px), calc(-50% - 30px))', // Position diagonale haut-droite
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  pointerEvents: 'auto',
                  zIndex: 1000,
                }}
                title="Désactiver le Mode Focus"
              >
                <Minimize2 size={14} className="text-slate-600 group-hover:text-red-500 transition-colors" strokeWidth={2} />
              </motion.button>

              {/* Bulle 5 : Droite */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.1 
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(false);
                  electronAPIRef.current?.invoke('bubble:close-menu');
                }}
                className="absolute rounded-full flex items-center justify-center
                           hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(calc(-50% + 42px), -50%)', // Position à droite
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  pointerEvents: 'auto',
                  zIndex: 1000,
                }}
                title="Fermer le menu"
              >
                <Minimize2 size={14} className="text-slate-600 group-hover:text-gray-400 transition-colors" strokeWidth={2} />
              </motion.button>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Zone de clic pour fermer le menu */}
      {showMenu && (
        <div
          className="fixed inset-0 -z-10"
          onClick={async (e) => {
            // Vérifier si le clic est en dehors de la zone de la bulle
            const rect = bubbleRef.current?.getBoundingClientRect();
            if (rect) {
              const clickX = e.clientX;
              const clickY = e.clientY;
              const isOutside = clickX < rect.left - 60 || clickX > rect.right + 60 || 
                               clickY < rect.top - 60 || clickY > rect.bottom + 60;
              
              if (isOutside) {
                setShowMenu(false);
                await electronAPIRef.current?.invoke('bubble:close-menu');
              }
            }
          }}
          style={{ 
            background: 'transparent', 
            pointerEvents: 'auto'
          }}
        />
      )}
    </div>
  );
});

FloatingBubble.displayName = 'FloatingBubble';

export default FloatingBubble;