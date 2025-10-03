// src/react/src/hooks/useNotifications.js
import { useState, useCallback } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  // Afficher une notification
  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-fermeture après 4 secondes
    setTimeout(() => {
      closeNotification(id);
    }, 4000);

    return id;
  }, []);

  // Fermer une notification
  const closeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Fermer toutes les notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    closeNotification,
    clearAllNotifications
  };
}