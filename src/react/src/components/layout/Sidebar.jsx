import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ children }) {
  return (
    <motion.aside
      className="w-80 bg-white border-r border-notion-gray-200 flex flex-col"
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.aside>
  );
} 