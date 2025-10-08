import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function BackendConnectionGuard({ 
  isConnected, 
  isConnecting, 
  error, 
  retryCount, 
  onRetry,
  children 
}) {
  if (isConnected) {
    return children;
  }

  return (
    <div className="h-screen bg-notion-gray-50 flex items-center justify-center p-8">
      <motion.div
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center">
          <AnimatePresence mode="wait">
            {isConnecting ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-6"
              >
                <div className="relative inline-flex items-center justify-center">
                  <Wifi className="w-16 h-16 text-blue-500" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-16 h-16 text-blue-300 opacity-50" />
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-6"
              >
                <WifiOff className="w-16 h-16 text-red-500 mx-auto" />
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="text-xl font-semibold mb-2">
            {isConnecting ? 'Connexion au backend...' : 'Backend déconnecté'}
          </h2>
          
          {error && (
            <p className="text-sm text-gray-600 mb-4">{error}</p>
          )}

          {isConnecting && retryCount > 0 && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(retryCount / 10) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {!isConnecting && (
            <div className="mt-6">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                Réessayer
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}