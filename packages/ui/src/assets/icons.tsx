import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

// ========================================
// LOGO PRINCIPAL - Style Notion
// ========================================
export const NotionClipperLogo: React.FC<IconProps> = ({ size = 32, className }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9333EA" /> {/* Purple-700 */}
        <stop offset="50%" stopColor="#7C3AED" /> {/* Violet-700 */}
        <stop offset="100%" stopColor="#2563EB" /> {/* Blue-600 */}
      </linearGradient>
    </defs>
    {/* Fond avec coins arrondis style Notion */}
    <rect width="32" height="32" rx="7" fill="url(#logoGradient)" />
    
    {/* Design inspiré de Notion : Pages empilées avec clip */}
    <g transform="translate(6, 6)">
      {/* Page arrière */}
      <rect x="2" y="2" width="14" height="16" rx="1" fill="white" fillOpacity="0.3" />
      {/* Page principale */}
      <rect x="4" y="0" width="14" height="16" rx="1" fill="white" fillOpacity="0.9" />
      {/* Lignes de texte */}
      <rect x="6" y="3" width="8" height="1.5" rx="0.5" fill="url(#logoGradient)" fillOpacity="0.7" />
      <rect x="6" y="6" width="10" height="1.5" rx="0.5" fill="url(#logoGradient)" fillOpacity="0.5" />
      <rect x="6" y="9" width="6" height="1.5" rx="0.5" fill="url(#logoGradient)" fillOpacity="0.3" />
      {/* Clip/Bookmark en haut à droite */}
      <path
        d="M14 0 L18 0 L18 7 L16 5 L14 7 Z"
        fill="#FCD34D"
        stroke="white"
        strokeWidth="0.5"
      />
    </g>
  </svg>
);

// ========================================
// ICÔNE TRAY - Version colorée pour System Tray
// ========================================
export const TrayIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id="trayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9333EA" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    {/* Version simplifiée du logo pour petite taille */}
    <rect width="16" height="16" rx="3" fill="url(#trayGrad)" />
    <g transform="translate(3, 3)">
      <rect x="1" y="1" width="7" height="8" rx="0.5" fill="white" fillOpacity="0.4" />
      <rect x="2" y="0" width="7" height="8" rx="0.5" fill="white" fillOpacity="0.9" />
      <path d="M7 0 L9 0 L9 3.5 L8 2.5 L7 3.5 Z" fill="#FCD34D" />
    </g>
  </svg>
);

// ========================================
// ICÔNE TRAY MONOCHROME - Pour macOS
// ========================================
export const TrayIconMono: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    className={className}
  >
    <g fill="currentColor">
      <rect x="3" y="4" width="8" height="9" rx="1" fillOpacity="0.4" />
      <rect x="5" y="3" width="8" height="9" rx="1" />
      <path d="M11 3 L13 3 L13 6.5 L12 5.5 L11 6.5 Z" />
    </g>
  </svg>
);

// ========================================
// ICÔNE APP TASKBAR - Pour barre des tâches
// ========================================
export const TaskbarIcon: React.FC<IconProps> = ({ size = 32, className }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id="taskbarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9333EA" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="7" fill="url(#taskbarGrad)" />
    <g transform="translate(6, 6)">
      <rect x="2" y="2" width="14" height="16" rx="1" fill="white" fillOpacity="0.3" />
      <rect x="4" y="0" width="14" height="16" rx="1" fill="white" fillOpacity="0.95" />
      <path d="M14 0 L18 0 L18 7 L16 5 L14 7 Z" fill="#FCD34D" />
    </g>
  </svg>
);

// ========================================
// ICÔNES EXTENSION - Différentes tailles
// ========================================
export const ExtensionIcon16: React.FC<IconProps> = ({ className }) => (
  <NotionClipperLogo size={16} className={className} />
);

export const ExtensionIcon32: React.FC<IconProps> = ({ className }) => (
  <NotionClipperLogo size={32} className={className} />
);

export const ExtensionIcon48: React.FC<IconProps> = ({ className }) => (
  <NotionClipperLogo size={48} className={className} />
);

export const ExtensionIcon128: React.FC<IconProps> = ({ className }) => (
  <NotionClipperLogo size={128} className={className} />
);

// Export par défaut pour compatibilité
export default {
  NotionClipperLogo,
  TrayIcon,
  TrayIconMono,
  TaskbarIcon,
  ExtensionIcon16,
  ExtensionIcon32,
  ExtensionIcon48,
  ExtensionIcon128
};