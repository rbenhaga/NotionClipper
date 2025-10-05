import React, { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
  children: ReactNode;
  isOpen?: boolean;
  width?: 'default' | 'compact'; // default = 320px, compact = 256px
}

/**
 * Sidebar latérale avec animation slide
 * Contient la liste des pages et la recherche
 * 
 * RESPONSIVE:
 * - default (w-80 = 320px) pour app Electron 900px+
 * - compact (w-64 = 256px) pour extension Chrome 700px
 */
export function Sidebar({ children, isOpen = true, width = 'default' }: SidebarProps) {
  const widthClass = width === 'compact' ? 'w-64' : 'w-80'; // 256px vs 320px
  const translateX = width === 'compact' ? -256 : -320;
  
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          className={`${widthClass} bg-white border-r border-gray-200 flex flex-col flex-shrink-0`}
          initial={{ x: translateX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: translateX, opacity: 0 }}
          transition={{ 
            duration: 0.3, 
            ease: [0.4, 0.0, 0.2, 1]
          }}
        >
          {children}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}