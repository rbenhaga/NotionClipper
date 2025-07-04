// src/react/src/components/common/ConnectivityStatus.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RotateCcw } from 'lucide-react';

export default function ConnectivityStatus({ isOnline, isBackendConnected }) {
  if (isOnline && isBackendConnected) return null;

  return (
    <motion.div
      className="fixed bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-notion p-3 flex items-center gap-3 z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
    >
      <WifiOff size={18} className="text-red-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          {!isOnline ? 'Pas de connexion Internet' : 'Backend Notion déconnecté'}
        </p>
        <p className="text-xs text-red-600">
          {!isOnline ? 'Vérifiez votre connexion réseau' : 'Le serveur Python ne répond pas'}
        </p>
      </div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <RotateCcw size={16} className="text-red-600" />
      </motion.div>
    </motion.div>
  );
}