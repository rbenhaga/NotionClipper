// src/react/src/components/common/NotificationManager.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

function NotificationManager({ notifications, onClose }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-blue-600" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mb-3"
          >
            <div
              className={`
                px-4 py-3 rounded-notion shadow-notion-lg 
                flex items-start gap-3 min-w-[320px] max-w-md
                border ${getStyles(notification.type)}
              `}
            >
              {getIcon(notification.type)}
              <p className="flex-1 text-sm font-medium">
                {notification.message}
              </p>
              <button
                onClick={() => onClose(notification.id)}
                className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default NotificationManager;