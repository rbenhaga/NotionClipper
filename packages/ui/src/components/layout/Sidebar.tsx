import React, { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
  children: ReactNode;
  isOpen?: boolean;
}

/**
 * Sidebar latérale avec animation slide
 * Contient la liste des pages et la recherche
 */
export function Sidebar({ children, isOpen = true }: SidebarProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          className="w-80 bg-white border-r border-gray-200 flex flex-col"
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
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