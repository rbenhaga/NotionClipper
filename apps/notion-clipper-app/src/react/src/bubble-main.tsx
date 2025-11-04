import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingBubble } from '@notion-clipper/ui';
import './index.css'; // Styles Tailwind
import './styles/bubble.css'; // Styles spécifiques à la bulle

/**
 * Application Bubble - Wrapper pour synchroniser l'état
 */
const BubbleApp: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [pageTitle, setPageTitle] = useState('Page');
  const [clipCount, setClipCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // ============================================
  // CHARGER L'ÉTAT INITIAL
  // ============================================
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const stateResult = await (window as any).electronAPI?.focusMode.getState();
        if (stateResult?.success && stateResult.state) {
          const state = stateResult.state;
          setIsActive(state.enabled);
          setPageTitle(state.activePageTitle || 'Page');
          setClipCount(state.clipsSentCount || 0);
        }
      } catch (error) {
        console.error('Error loading initial state:', error);
      }
    };

    loadInitialState();
  }, []);

  // ============================================
  // ÉCOUTER LES ÉVÉNEMENTS ELECTRON
  // ============================================
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    // Mise à jour du compteur
    const handleCounterUpdate = (_: any, count: number) => {
      setClipCount(count);
    };

    // Changement d'état du Mode Focus
    const handleStateChange = async () => {
      try {
        const stateResult = await electronAPI.focusMode.getState();
        if (stateResult?.success && stateResult.state) {
          const state = stateResult.state;
          setIsActive(state.enabled);
          setPageTitle(state.activePageTitle || 'Page');
          setClipCount(state.clipsSentCount || 0);
        }
      } catch (error) {
        console.error('Error updating state:', error);
      }
    };

    // Status réseau
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

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
  }, []);

  return (
    <FloatingBubble
      isActive={isActive}
      pageTitle={pageTitle}
      clipCount={clipCount}
      isOnline={isOnline}
    />
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