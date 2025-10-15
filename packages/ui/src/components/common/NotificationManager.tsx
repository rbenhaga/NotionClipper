// packages/ui/src/components/common/NotificationManager.tsx - VERSION CORRIGÉE
// React import removed - not needed with modern React
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Notification } from '../../hooks/useNotifications';

interface NotificationManagerProps {
    notifications: Notification[];
    onClose: (id: string) => void;
}

/**
 * Gestionnaire de notifications toast - VERSION CORRIGÉE
 * ✅ Protection contre undefined
 * ✅ Validation des props
 */
export function NotificationManager({ notifications = [], onClose }: NotificationManagerProps) {
    // ✅ Protection contre undefined - Si notifications est null/undefined, utiliser tableau vide
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle size={18} className="text-green-600" />;
            case 'error':
                return <XCircle size={18} className="text-red-600" />;
            case 'warning':
                return <AlertTriangle size={18} className="text-orange-600" />;
            case 'info':
            default:
                return <Info size={18} className="text-blue-600" />;
        }
    };

    const getBackgroundColor = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-orange-50 border-orange-200';
            case 'info':
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {safeNotifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 100, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`
                            flex items-start gap-3 p-3 pr-10 rounded-lg border shadow-lg
                            min-w-[300px] max-w-[400px] pointer-events-auto
                            ${getBackgroundColor(notification.type)}
                        `}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notification.type)}
                        </div>
                        <p className="flex-1 text-sm text-gray-800">
                            {notification.message}
                        </p>
                        <button
                            onClick={() => onClose(notification.id)}
                            className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded transition-colors"
                        >
                            <X size={14} className="text-gray-600" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}