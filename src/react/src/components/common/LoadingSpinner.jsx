// src/react/src/components/common/LoadingSpinner.jsx
import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'medium', color = 'blue' }) {
  const sizes = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const colors = {
    blue: 'border-blue-600',
    gray: 'border-notion-gray-600',
    white: 'border-white'
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`
          ${sizes[size]}
          border-2 
          ${colors[color]} 
          border-t-transparent 
          rounded-full
        `}
      />
    </div>
  );
}