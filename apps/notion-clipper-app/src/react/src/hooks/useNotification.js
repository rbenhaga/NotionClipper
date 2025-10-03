// src/react/src/hooks/useNotification.js
import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotification({ id, message, type });

    if (duration > 0) {
      setTimeout(() => {
        setNotification(current => current?.id === id ? null : current);
      }, duration);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
}