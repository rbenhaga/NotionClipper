/**
 * Sidebar Component - Design System V2
 * Utilise les tokens sidebar pour une hiérarchie visuelle claire
 */

import { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionAside } from '../common/MotionWrapper';

interface SidebarProps {
  children: ReactNode;
  isOpen?: boolean;
  width?: 'default' | 'compact';
}

export function Sidebar({ 
  children, 
  isOpen = true, 
  width = 'default'
}: SidebarProps) {
  const widthClass = width === 'compact' ? 'w-64' : 'w-80';
  const translateX = width === 'compact' ? -256 : -320;
  
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <MotionAside
          className={`
            ${widthClass} 
            ds-sidebar
            relative flex flex-col flex-shrink-0
          `}
          style={{
            background: 'var(--ds-sidebar-bg)',
            borderRight: '1px solid var(--ds-sidebar-border)'
          }}
          initial={{ x: translateX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: translateX, opacity: 0 }}
          transition={{ 
            duration: 0.28, 
            ease: [0.32, 0.72, 0, 1]
          }}
        >
          {/* Noise texture overlay - subtle depth */}
          <div 
            className="absolute inset-0 opacity-[0.012] dark:opacity-[0.025] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
            }}
          />
          
          {/* Subtle gradient accent - très léger */}
          <div 
            className="absolute top-0 left-0 right-0 h-24 pointer-events-none" 
            style={{
              background: 'linear-gradient(to bottom, var(--ds-primary-subtle), transparent)'
            }}
          />
          
          {/* Content */}
          <div className="relative flex flex-col h-full z-10">
            {children}
          </div>
        </MotionAside>
      )}
    </AnimatePresence>
  );
}
