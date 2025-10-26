import React, { ReactNode } from 'react';

interface LoadingProgress {
  current: number;
  total: number;
  message: string;
}

interface LayoutProps {
  children: ReactNode;
  loading?: boolean;
  
  // Connexion
  isOnline?: boolean;
  isBackendConnected?: boolean;
  
  // Sidebar
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  
  // Config
  config?: any;
  onOpenConfig?: () => void;
  
  // Preview
  showPreview?: boolean;
  onTogglePreview?: () => void;
  
  // Notifications
  hasNewPages?: boolean;
  
  // Loading
  loadingProgress?: LoadingProgress;
  
  // Window controls (pour Electron uniquement)
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/**
 * Layout Component - Conteneur principal simple
 * Le header est géré séparément via le composant Header
 */
export function Layout({
  children,
  loading = false
}: LayoutProps) {
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-[#191919] font-sans app-window transition-colors duration-200">
        <div className="app-content h-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-[#191919] font-sans flex flex-col app-window transition-colors duration-200">
      <div className="app-content h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}