import React from 'react';
import { AnimatePresence } from 'framer-motion';
import Notification from './Notification';

export default function NotificationManager({ notifications, onClose }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      <AnimatePresence>
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => onClose(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
} 