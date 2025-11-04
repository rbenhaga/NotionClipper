import { StrictMode, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingBubble } from '@notion-clipper/ui';
import './index.css'; // Styles Tailwind
import './styles/bubble.css'; // Styles spécifiques à la bulle

/**
 * Application Bubble - Wrapper optimisé pour éviter les re-renders
 */
const BubbleApp: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [pageTitle, setPageTitle] = useState('Page');
  const [clipCount, setClipCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  
  // 🔧 FIX: Utiliser useRef pour éviter les re-créations
  const electronAPIRef = useRef((window as any).electronAPI);
  const loadingRef = useRef(false);

  // 🔧 FIX: Mémoriser les props pour éviter les re-renders inutiles
  const bubbleProps = useMemo(() => ({
    isActive,
    pageTitle,
    clipCount,
    isOnline
  }), [isActive, pageTitle, clipCount, isOnline]);

  // ============================================
  // CHARGER L'ÉTAT INITIAL (optimisé)
  // ============================================
  useEffect(() => {
    if (loadingRef.current) return;
    
    const loadInitialState = async () => {
      loadingRef.current = true;
      try {
        const stateResult = await electronAPIRef.current?.focusMode.getState();
        if (stateResult?.success && stateResult.state) {
          const state = stateResult.state;
          setIsActive(state.enabled);
          setPageTitle(state.activePageTitle || 'Page');
          setClipCount(state.clipsSentCount || 0);
        }
      } catch (error) {
        console.error('Error loading initial state:', error);
      } finally {
        loadingRef.current = false;
      }
    };

    loadInitialState();
  }, []);

  // ============================================
  // ÉCOUTER LES ÉVÉNEMENTS ELECTRON (optimisé)
  // ============================================
  
  // 🔧 FIX: Callbacks mémorisés pour éviter les re-renders
  const handleCounterUpdate = useCallback((_: any, count: number) => {
    setClipCount(prevCount => prevCount !== count ? count : prevCount);
  }, []);

  const handleStateChange = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      const stateResult = await electronAPIRef.current?.focusMode.getState();
      if (stateResult?.success && stateResult.state) {
        const state = stateResult.state;
        setIsActive(prevActive => prevActive !== state.enabled ? state.enabled : prevActive);
        setPageTitle(prevTitle => prevTitle !== (state.activePageTitle || 'Page') ? (state.activePageTitle || 'Page') : prevTitle);
        setClipCount(prevCount => prevCount !== (state.clipsSentCount || 0) ? (state.clipsSentCount || 0) : prevCount);
      }
    } catch (error) {
      console.error('Error updating state:', error);
    }
  }, []);

  const handleOnlineStatus = useCallback(() => {
    setIsOnline(prevOnline => prevOnline !== navigator.onLine ? navigator.onLine : prevOnline);
  }, []);

  useEffect(() => {
    const electronAPI = electronAPIRef.current;
    if (!electronAPI) return;

    // Enregistrer les listeners
    electronAPI.on('bubble:update-counter', handleCounterUpdate);
    electronAPI.on('focus-mode:enabled', handleStateChange);
    electronAPI.on('focus-mode:disabled', handleStateChange);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      electronAPI.removeListener('bubble:update-counter', handleCounterUpdate);
      electronAPI.removeListener('focus-mode:enabled', handleStateChange);
      electronAPI.removeListener('focus-mode:disabled', handleStateChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [handleCounterUpdate, handleStateChange, handleOnlineStatus]);

  return (
    <FloatingBubble {...bubbleProps} />
  );
};

// ============================================
// INITIALISATION
// ============================================
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <BubbleApp />
    </StrictMode>
  );
} else {
  console.error('Root container not found');
}

export default BubbleApp;