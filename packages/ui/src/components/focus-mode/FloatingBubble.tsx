import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Check,
    X,
    Loader2,
    Settings,
    Eye,
    WifiOff,
    ChevronDown,
    Minimize2
} from 'lucide-react';

interface FloatingBubbleProps {
    isActive: boolean;
    pageTitle: string;
    clipCount: number;
    isOnline: boolean;
}

type BubbleState = 'active' | 'sending' | 'success' | 'error';

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
    isActive,
    pageTitle,
    clipCount,
    isOnline
}) => {
    const [state, setState] = useState<BubbleState>('active');
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    // Log de debug simplifié
    useEffect(() => {
        console.log('[FloatingBubble] State updated:', { state, isActive, clipCount });
    }, [state, isActive, clipCount]);

    // Icône selon l'état
    const getStateIcon = () => {
        const iconStyle = {
            width: '16px',
            height: '16px',
            color: 'white',
            zIndex: 10
        };
        
        switch (state) {
            case 'sending':
                return <Loader2 style={iconStyle} className="animate-spin" />;
            case 'success':
                return <Check style={iconStyle} />;
            case 'error':
                return <X style={iconStyle} />;
            default:
                return <Zap style={iconStyle} />;
        }
    };

    // Écouter les événements Electron pour les changements d'état
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;

        const handleStateUpdate = (_: any, newState: BubbleState) => {
            setState(newState);

            // Auto-reset après success/error
            if (newState === 'success' || newState === 'error') {
                setTimeout(() => setState('active'), 2000);
            }
        };

        electronAPI.on('bubble:state-update', handleStateUpdate);

        return () => {
            electronAPI.removeListener('bubble:state-update', handleStateUpdate);
        };
    }, []);

    // Handlers pour le drag
    const handleMouseDown = (e: React.MouseEvent) => {
        if (showMenu) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const newDragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setDragOffset(newDragOffset);
        setIsDragging(true);

        // Notifier Electron du début du drag avec les coordonnées globales
        (window as any).electronAPI?.invoke('bubble:drag-start', {
            x: e.screenX - newDragOffset.x,
            y: e.screenY - newDragOffset.y
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        // Utiliser les coordonnées d'écran pour éviter les problèmes de conversion
        const newX = e.screenX - dragOffset.x;
        const newY = e.screenY - dragOffset.y;

        // Notifier Electron du mouvement
        (window as any).electronAPI?.invoke('bubble:drag-move', { x: newX, y: newY });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;

        setIsDragging(false);

        // Notifier Electron de la fin du drag
        (window as any).electronAPI?.invoke('bubble:drag-end');
    };

    // Attacher les événements globaux pour le drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // Actions du menu
    const handleQuickSend = async () => {
        setShowMenu(false);
        setState('sending');

        try {
            const result = await (window as any).electronAPI?.invoke('focus-mode:quick-send');
            if (result?.success) {
                setState('success');
                // Animation de feedback
                const bubbleElement = document.querySelector('.bubble-main');
                if (bubbleElement) {
                    bubbleElement.classList.add('bubble-clip-sent');
                    setTimeout(() => {
                        bubbleElement.classList.remove('bubble-clip-sent');
                    }, 600);
                }
            } else {
                setState('error');
            }
        } catch (error) {
            setState('error');
        }
    };

    const handleShowMain = async () => {
        setShowMenu(false);
        await (window as any).electronAPI?.invoke('window:show-main');
    };

    const handleOpenConfig = async () => {
        setShowMenu(false);
        await (window as any).electronAPI?.invoke('window:open-config');
    };

    const handleDisableFocus = async () => {
        setShowMenu(false);
        await (window as any).electronAPI?.invoke('focus-mode:disable');
    };



    // Toujours afficher la bulle si elle est créée, même si le focus mode n'est pas actif
    // (la logique d'affichage/masquage est gérée par Electron)
    // if (!isActive) return null;

    return (
        <div className="floating-bubble-container">
            <div className="floating-bubble-wrapper" style={{ top: '20px', right: '20px' }}>
                {/* Bulle principale */}
                <motion.div
                    className={`
            bubble-main
            ${state === 'sending' ? 'sending' : ''}
            ${state === 'success' ? 'success' : ''}
            ${state === 'error' ? 'error' : ''}
            ${isDragging ? 'dragging' : ''}
          `}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: state === 'sending' 
                            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                            : state === 'success'
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : state === 'error'
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)',
                        cursor: 'move',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                    onMouseDown={handleMouseDown}
                    onClick={() => !isDragging && setShowMenu(!showMenu)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        rotate: state === 'sending' ? 360 : 0,
                    }}
                    transition={{
                        rotate: {
                            duration: 1,
                            repeat: state === 'sending' ? Infinity : 0,
                            ease: "linear"
                        }
                    }}
                >
                    {getStateIcon()}

                    {/* Indicateur hors ligne */}
                    {!isOnline && (
                        <div className="bubble-offline-indicator">
                            <WifiOff className="w-2 h-2 text-white" />
                        </div>
                    )}

                    {/* Compteur de clips */}
                    {clipCount > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bubble-counter"
                        >
                            <span>{clipCount}</span>
                        </motion.div>
                    )}

                    {/* Indicateur de menu */}
                    <motion.div
                        className={`bubble-menu-indicator ${showMenu ? 'open' : ''}`}
                        animate={{ rotate: showMenu ? 180 : 0 }}
                    >
                        <ChevronDown className="w-2 h-2 text-white" />
                    </motion.div>
                </motion.div>

                {/* Menu contextuel */}
                <AnimatePresence>
                    {showMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute top-20 right-0 w-64 rounded-xl shadow-2xl overflow-hidden"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            {/* Header du menu */}
                            <div className="bubble-menu-header p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap className="w-4 h-4" />
                                    <span className="font-semibold">Mode Focus</span>
                                </div>
                                <p className="text-sm opacity-90 truncate">{pageTitle}</p>
                                <p className="text-xs opacity-75">{clipCount} clip(s) envoyé(s)</p>
                            </div>

                            {/* Actions du menu */}
                            <div className="p-2">
                                <button
                                    onClick={handleQuickSend}
                                    className="bubble-menu-button w-full flex items-center gap-3 p-3 rounded-lg text-left"
                                >
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <div className="font-medium">Quick Send</div>
                                        <div className="text-sm opacity-70">Envoyer le presse-papiers</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleShowMain}
                                    className="bubble-menu-button w-full flex items-center gap-3 p-3 rounded-lg text-left"
                                >
                                    <Eye className="w-4 h-4 text-green-500" />
                                    <div>
                                        <div className="font-medium">Ouvrir l'app</div>
                                        <div className="text-sm opacity-70">Afficher la fenêtre principale</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleOpenConfig}
                                    className="bubble-menu-button w-full flex items-center gap-3 p-3 rounded-lg text-left"
                                >
                                    <Settings className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <div className="font-medium">Configuration</div>
                                        <div className="text-sm opacity-70">Paramètres de l'app</div>
                                    </div>
                                </button>

                                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                                <button
                                    onClick={handleDisableFocus}
                                    className="bubble-menu-button danger w-full flex items-center gap-3 p-3 rounded-lg text-left"
                                >
                                    <Minimize2 className="w-4 h-4 text-red-500" />
                                    <div>
                                        <div className="font-medium text-red-600">Désactiver</div>
                                        <div className="text-sm opacity-70">Quitter le Mode Focus</div>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

        {/* Overlay pour fermer le menu */}
        {showMenu && (
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  );
};