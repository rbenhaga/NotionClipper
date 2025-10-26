// packages/ui/src/components/common/NotificationManager.tsx - PERFECT NOTION/APPLE DESIGN
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Notification } from '../../hooks/useNotifications';
import { useEffect, useState } from 'react';

interface NotificationManagerProps {
    notifications: Notification[];
    onClose: (id: string) => void;
    isMinimalist?: boolean;
}

/**
 * Gestionnaire de notifications toast - PERFECT NOTION/APPLE DESIGN
 * ✅ Design ultra-épuré et élégant
 * ✅ Centrage parfait du texte et de l'icône
 * ✅ Adaptatif selon le mode
 */
export function NotificationManager({ notifications = [], onClose, isMinimalist = false }: NotificationManagerProps) {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getIcon = (type: Notification['type']) => {
        const iconSize = isMinimalist ? 14 : 16;

        const iconProps = {
            size: iconSize,
            strokeWidth: 2,
            className: "flex-shrink-0"
        };

        switch (type) {
            case 'success':
                return <CheckCircle {...iconProps} className={`${iconProps.className} text-green-600 dark:text-green-400`} />;
            case 'error':
                return <XCircle {...iconProps} className={`${iconProps.className} text-red-600 dark:text-red-400`} />;
            case 'warning':
                return <AlertTriangle {...iconProps} className={`${iconProps.className} text-orange-600 dark:text-orange-400`} />;
            case 'info':
            default:
                return <Info {...iconProps} className={`${iconProps.className} text-blue-600 dark:text-blue-400`} />;
        }
    };

    // ✅ Position adaptative
    const getContainerPosition = () => {
        if (isMinimalist) {
            return 'fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none';
        } else if (windowWidth < 600) {
            return 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none';
        } else {
            return 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
        }
    };

    // ✅ Taille adaptative
    const getNotificationWidth = () => {
        if (isMinimalist) {
            return 'w-[280px]';
        } else if (windowWidth < 600) {
            return 'w-[300px]';
        } else {
            return 'w-[360px]';
        }
    };

    const getTextSize = () => isMinimalist ? 'text-[12px]' : 'text-[13px]';

    return (
        <div className={getContainerPosition()}>
            <AnimatePresence mode="popLayout">
                {safeNotifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                        transition={{ 
                            type: 'spring', 
                            stiffness: 500, 
                            damping: 35
                        }}
                        className={`
                            ${getNotificationWidth()}
                            pointer-events-auto
                            bg-white dark:bg-[#1e1e1e]
                            border border-gray-200 dark:border-gray-700
                            rounded-xl
                            shadow-lg shadow-black/5 dark:shadow-black/30
                            hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40
                            transition-shadow duration-200
                            relative
                        `}
                    >
                        <div className="flex items-center gap-3 p-3 pr-10">
                            {/* Icône */}
                            <div className="flex items-center justify-center flex-shrink-0">
                                {getIcon(notification.type)}
                            </div>
                            
                            {/* Message - Centré verticalement */}
                            <div className="flex-1 flex items-center min-w-0">
                                <p className={`${getTextSize()} font-medium text-gray-900 dark:text-gray-100 leading-snug`}>
                                    {notification.message}
                                </p>
                            </div>
                        </div>

                        {/* Bouton fermer */}
                        <button
                            onClick={() => onClose(notification.id)}
                            className="absolute top-2.5 right-2.5 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all duration-150 active:scale-90"
                        >
                            <X size={14} className="text-gray-400 dark:text-gray-500" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}