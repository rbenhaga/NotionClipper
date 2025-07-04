// src/react/src/components/common/Notification.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';

export default function Notification({ notification }) {
  if (!notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-4 right-4 px-4 py-3 rounded-notion flex items-center gap-3 shadow-lg z-50 ${
          notification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : notification.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}
        initial={{ x: 400, opacity: 0, scale: 0.9 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 400, opacity: 0, scale: 0.9 }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 300,
          duration: 0.3
        }}
      >
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {notification.type === 'success' ? (
            <CheckCircle size={18} />
          ) : notification.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Zap size={18} />
          )}
        </motion.div>
        <span className="text-sm font-medium">{notification.message}</span>
      </motion.div>
    </AnimatePresence>
  );
}