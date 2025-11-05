// apps/notion-clipper-app/src/react/src/bubble-main.tsx
import React, { StrictMode, useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingBubble } from '@notion-clipper/ui';
import './styles/bubble.css';

// ============================================
// 🎯 BUBBLE APP
// ============================================

const BubbleApp: React.FC = () => {
  // État minimal et optimisé
  const [isActive, setIsActive] = useState(false);
  const [pageTitle, setPageTitle] = useState('Page');
  const [clipCount, setClipCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const electronAPIRef = useRef<any>(null);
  const stateCheckInterval = useRef<number>();

  // ============================================
  // INITIALISATION
  // ============================================

  useEffect(() => {
    console.log('[BubbleApp] Initializing...');
    
    if (typeof window !== 'undefined') {
      electronAPIRef.current = (window as any).electronAPI;
    }

    // Charger l'état initial
    loadInitialState();

    // Vérifier l'état périodiquement (fallback si événements manqués)
    stateCheckInterval.current = setInterval(loadInitialState, 5000);

    return () => {
      if (stateCheckInterval.current) {
        clearInterval(stateCheckInterval.current);
      }
    };
  }, []);

  // ============================================
  // CHARGEMENT DE L'ÉTAT
  // ============================================

  const loadInitialState = useCallback(async () => {
    try {
      const result = await electronAPIRef.current?.invoke('focus-mode:get-state');
      if (result?.success && result.state) {
        const { enabled, activePageTitle, clipsSentCount } = result.state;
        
        setIsActive(enabled || false);
        setPageTitle(activePageTitle || 'Page');
        setClipCount(clipsSentCount || 0);
      }
    } catch (error) {
      console.error('[BubbleApp] Error loading state:', error);
    }
  }, []);

  // ============================================
  // ÉVÉNEMENTS ELECTRON
  // ============================================

  useEffect(() => {
    const electronAPI = electronAPIRef.current;
    if (!electronAPI) return;

    // Mise à jour du compteur
    const handleCounterUpdate = (_: any, count: number) => {
      if (typeof count === 'number') {
        setClipCount(count);
      }
    };

    // Focus mode activé/désactivé
    const handleFocusEnabled = async () => {
      await loadInitialState();
    };

    const handleFocusDisabled = () => {
      setIsActive(false);
      setClipCount(0);
    };

    // État en ligne/hors ligne
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Enregistrer les listeners
    electronAPI.on('bubble:update-counter', handleCounterUpdate);
    electronAPI.on('focus-mode:enabled', handleFocusEnabled);
    electronAPI.on('focus-mode:disabled', handleFocusDisabled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      electronAPI.removeListener('bubble:update-counter', handleCounterUpdate);
      electronAPI.removeListener('focus-mode:enabled', handleFocusEnabled);
      electronAPI.removeListener('focus-mode:disabled', handleFocusDisabled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadInitialState]);

  // ============================================
  // RENDU
  // ============================================

  console.log('[BubbleApp] Rendering with state:', { isActive, pageTitle, clipCount, isOnline });

  return (
    <div 
      className="bubble-app"
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      <FloatingBubble
        isActive={isActive}
        pageTitle={pageTitle}
        clipCount={clipCount}
        isOnline={isOnline}
      />
    </div>
  );
};

// ============================================
// 🚀 INITIALISATION
// ============================================

const container = document.getElementById('root');
if (container) {
  console.log('[BubbleApp] Mounting to root...');
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <BubbleApp />
    </StrictMode>
  );
  console.log('[BubbleApp] ✅ Mounted successfully');
} else {
  console.error('[BubbleApp] ❌ Root container not found!');
}

export default BubbleApp;