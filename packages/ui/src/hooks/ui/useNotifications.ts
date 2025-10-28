import { useState, useCallback } from 'react';

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

/**
 * Hook pour gérer les notifications toast
 * Génère automatiquement des IDs uniques et auto-fermeture après 3s
 */
export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
        const id = `notification-${Date.now()}-${Math.random()}`;
        const newNotification: Notification = { id, type, message };

        setNotifications(prev => [...prev, newNotification]);

        // Auto-fermeture après 3 secondes
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    const closeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return {
        notifications,
        showNotification,
        closeNotification
    };
}