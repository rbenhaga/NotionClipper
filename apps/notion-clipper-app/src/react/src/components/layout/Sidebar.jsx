import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Sidebar({ children, isOpen = true }) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          className="w-80 bg-white border-r border-notion-gray-200 flex flex-col"
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ 
            duration: 0.3, 
            ease: [0.4, 0.0, 0.2, 1] // Courbe d'easing Material Design
          }}
        >
          {children}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}