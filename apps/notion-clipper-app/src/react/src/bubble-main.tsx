// apps/notion-clipper-app/src/react/src/bubble-main.tsx
import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingBubble } from '@notion-clipper/ui';

// Styles de base injectés directement
document.body.style.cssText = `
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: transparent;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
`;

document.documentElement.style.cssText = `
  margin: 0;
  padding: 0;
`;

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.cssText = `
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
}

const BubbleApp: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [pageTitle, setPageTitle] = useState('Page');
  const [clipCount, setClipCount] = useState(0);

  useEffect(() => {
    // Charger l'état initial
    const loadInitialState = async () => {
      try {
        const result = await window.electronAPI?.invoke('focus-mode:get-state');
        if (result?.success && result.state) {
          setIsActive(result.state.enabled);
          setPageTitle(result.state.activePageTitle || 'Page');
          setClipCount(result.state.clipsSentCount || 0);
        }
      } catch (error) {
        console.error('Error loading initial state:', error);
      }
    };

    loadInitialState();

    // Écouter les mises à jour du compteur
    const handleCounterUpdate = (_: any, count: number) => {
      setClipCount(count);
    };

    // Écouter les changements d'état
    const handleStateChange = async () => {
      try {
        const result = await window.electronAPI?.invoke('focus-mode:get-state');
        if (result?.success && result.state) {
          setIsActive(result.state.enabled);
          setPageTitle(result.state.activePageTitle || 'Page');
          setClipCount(result.state.clipsSentCount || 0);
        }
      } catch (error) {
        console.error('Error updating state:', error);
      }
    };

    window.electronAPI?.on('bubble:update-counter', handleCounterUpdate);
    window.electronAPI?.on('focus-mode:enabled', handleStateChange);
    window.electronAPI?.on('focus-mode:disabled', handleStateChange);

    return () => {
      window.electronAPI?.removeListener('bubble:update-counter', handleCounterUpdate);
      window.electronAPI?.removeListener('focus-mode:enabled', handleStateChange);
      window.electronAPI?.removeListener('focus-mode:disabled', handleStateChange);
    };
  }, []);

  return (
    <FloatingBubble
      isActive={isActive}
      pageTitle={pageTitle}
      clipCount={clipCount}
    />
  );
};

// Initialiser l'application React
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

// Export par défaut pour l'import dynamique
export default BubbleApp;