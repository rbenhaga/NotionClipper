// apps/notion-clipper-app/src/react/src/bubble-main.tsx
import React, { StrictMode, useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingBubble } from '@notion-clipper/ui';
import './styles/bubble.css';

// ============================================
// 🎯 BUBBLE APP
// ============================================

const BubbleApp: React.FC = () => {
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

    // Vérifier l'état périodiquement (fallback)
    stateCheckInterval.current = window.setInterval(loadInitialState, 5000);

    // Écouter les changements de connexion
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (stateCheckInterval.current) {
        clearInterval(stateCheckInterval.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // CHARGEMENT DE L'ÉTAT
  // ============================================

  const loadInitialState = useCallback(async () => {
    try {
      const electronAPI = electronAPIRef.current;
      if (!electronAPI?.invoke) {
        console.warn('[BubbleApp] Electron API not available');
        return;
      }

      const response = await electronAPI.invoke('focus-mode:get-state');
      
      if (response?.success && response?.state) {
        console.log('[BubbleApp] State loaded:', response.state);
      }
    } catch (error) {
      console.error('[BubbleApp] Error loading state:', error);
    }
  }, []);

  // ============================================
  // AFFICHAGE DE L'ÉTAT DE CONNEXION
  // ============================================

  useEffect(() => {
    if (!isOnline) {
      console.log('[BubbleApp] Offline - showing offline state');
      electronAPIRef.current?.invoke('bubble:state-change', 'offline');
    }
  }, [isOnline]);

  // ============================================
  // RENDU
  // ============================================

  return (
    <FloatingBubble 
      isOnline={isOnline}
    />
  );
};

// ============================================
// 🚀 MONTAGE DE L'APPLICATION
// ============================================

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  root.render(
    <StrictMode>
      <BubbleApp />
    </StrictMode>
  );
  
  console.log('[BubbleApp] ✅ Application mounted');
} else {
  console.error('[BubbleApp] ❌ Root container not found');
}