import React from 'react';
import { Sparkles } from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
}

// ========================================
// LOGO PRINCIPAL - Sparkles avec dégradé
// ========================================
export const ClipperProLogo: React.FC<IconProps> = ({ size = 32, className }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    {/* Définition du dégradé SVG */}
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id={`sparklesGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" /> {/* Purple-500 */}
          <stop offset="100%" stopColor="#6366f1" /> {/* Indigo-500 */}
        </linearGradient>
      </defs>
    </svg>

    {/* Icône Sparkles avec dégradé - Lucide React centre automatiquement */}
    <Sparkles
      size={size}
      strokeWidth={2}
      style={{
        stroke: `url(#sparklesGradient-${size})`,
        filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.2))'
      }}
    />
  </div>
);

// ========================================
// ICÔNE TRAY - Version SIMPLIFIÉE pour 16x16 (plus visible)
// ========================================
export const TrayIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id={`trayGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* Version ultra-simplifiée : juste l'étoile principale + stroke épais */}
    <g transform="translate(8, 8) scale(0.7) translate(-12, -12)">
      {/* Étoile principale REMPLIE au lieu de stroke pour plus de visibilité */}
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="url(#trayGradient-${size})"
        stroke="url(#trayGradient-${size})"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      {/* Petites étoiles SUPPRIMÉES pour 16x16 - trop de détails */}
    </g>
  </svg>
);

// ========================================
// ICÔNE TRAY MONOCHROME - Version simplifiée pour macOS
// ========================================
export const TrayIconMono: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    className={className}
  >
    {/* Version ultra-simplifiée monochrome */}
    <g transform="translate(8, 8) scale(0.7) translate(-12, -12)">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
    </g>
  </svg>
);

// ========================================
// ICÔNE APP TASKBAR - Sparkles pour barre des tâches
// ========================================
export const TaskbarIcon: React.FC<IconProps> = ({ size = 32, className }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id={`taskbarGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* Fond arrondi avec dégradé */}
    <rect width="32" height="32" rx="7" fill={`url(#taskbarGradient-${size})`} />
    {/* translate(16,16) scale(0.833) translate(-12,-12) */}
    <g transform="translate(16, 16) scale(0.833) translate(-12, -12)">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      <path d="M20 3v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 5h-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 17v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 18H3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

// ========================================
// ICÔNES EXTENSION - SVG propres avec centrage parfait
// ========================================
export const ExtensionIcon16: React.FC<IconProps> = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    width={16}
    height={16}
    className={className}
  >
    <defs>
      <linearGradient id="extensionGradient16" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* translate(8,8) scale(0.5) translate(-12,-12) */}
    <g transform="translate(8, 8) scale(0.5) translate(-12, -12)">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="none"
        stroke="url(#extensionGradient16)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      <path d="M20 3v4" stroke="url(#extensionGradient16)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 5h-4" stroke="url(#extensionGradient16)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 17v2" stroke="url(#extensionGradient16)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 18H3" stroke="url(#extensionGradient16)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const ExtensionIcon32: React.FC<IconProps> = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    width={32}
    height={32}
    className={className}
  >
    <defs>
      <linearGradient id="extensionGradient32" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* translate(16,16) scale(0.833) translate(-12,-12) */}
    <g transform="translate(16, 16) scale(0.833) translate(-12, -12)">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="none"
        stroke="url(#extensionGradient32)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      <path d="M20 3v4" stroke="url(#extensionGradient32)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 5h-4" stroke="url(#extensionGradient32)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 17v2" stroke="url(#extensionGradient32)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 18H3" stroke="url(#extensionGradient32)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const ExtensionIcon48: React.FC<IconProps> = ({ className }) => (
  <svg
    viewBox="0 0 48 48"
    width={48}
    height={48}
    className={className}
  >
    <defs>
      <linearGradient id="extensionGradient48" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* translate(24,24) scale(1.5) translate(-12,-12) */}
    <g transform="translate(24, 24) scale(1.5) translate(-12, -12)">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="none"
        stroke="url(#extensionGradient48)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      <path d="M20 3v4" stroke="url(#extensionGradient48)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 5h-4" stroke="url(#extensionGradient48)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 17v2" stroke="url(#extensionGradient48)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 18H3" stroke="url(#extensionGradient48)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const ExtensionIcon128: React.FC<IconProps> = ({ className }) => (
  <svg
    viewBox="0 0 128 128"
    width={128}
    height={128}
    className={className}
  >
    <defs>
      <linearGradient id="extensionGradient128" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* translate(64,64) scale(4.5) translate(-12,-12) */}
    <g transform="translate(64, 64) scale(4.5) translate(-12, -12)">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        fill="none"
        stroke="url(#extensionGradient128)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />
      <path d="M20 3v4" stroke="url(#extensionGradient128)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 5h-4" stroke="url(#extensionGradient128)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 17v2" stroke="url(#extensionGradient128)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 18H3" stroke="url(#extensionGradient128)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

// Export par défaut pour compatibilité
export default {
  ClipperProLogo,
  TrayIcon,
  TrayIconMono,
  TaskbarIcon,
  ExtensionIcon16,
  ExtensionIcon32,
  ExtensionIcon48,
  ExtensionIcon128
};