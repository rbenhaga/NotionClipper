// packages/ui/src/components/common/NotificationManager.tsx
// Design Notion/Apple Authentique - Minimaliste et élégant

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Notification } from '../../hooks/ui/useNotifications';
import { useEffect, useState } from 'react';

interface NotificationManagerProps {
    notifications: Notification[];
    onClose: (id: string) => void;
}

/**
 * Gestionnaire de notifications toast - Style Notion/Apple Authentique
 * ✨ Design minimaliste sans fioritures
 * ✨ Taille compacte et élégante
 * ✨ Animations subtiles
 */
export function NotificationManager({
    notifications = [],
    onClose
}: NotificationManagerProps) {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getTypeConfig = (type: Notification['type']) => {
        const configs = {
            success: {
                icon: <CheckCircle2 size={16} strokeWidth={2} />,
                iconColor: 'text-emerald-600 dark:text-emerald-500'
            },
            error: {
                icon: <XCircle size={16} strokeWidth={2} />,
                iconColor: 'text-red-600 dark:text-red-500'
            },
            warning: {
                icon: <AlertTriangle size={16} strokeWidth={2} />,
                iconColor: 'text-amber-600 dark:text-amber-500'
            },
            info: {
                icon: <Info size={16} strokeWidth={2} />,
                iconColor: 'text-blue-600 dark:text-blue-500'
            }
        };

        return configs[type as keyof typeof configs] || configs.info;
    };

    const getContainerPosition = () => {
        if (windowWidth < 600) {
            return 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none';
        } else {
            return 'fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
        }
    };

    return (
        <div className={getContainerPosition()}>
            <AnimatePresence mode="popLayout">
                {safeNotifications.map((notification, index) => {
                    const typeConfig = getTypeConfig(notification.type);

                    return (
                        <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{
                                opacity: 0,
                                scale: 0.95,
                                transition: { duration: 0.15 }
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 30,
                                delay: index * 0.03
                            }}
                            className="
                                w-[320px]
                                pointer-events-auto
                                bg-white dark:bg-[#2a2a2a]
                                border border-gray-200 dark:border-gray-700
                                rounded-xl
                                shadow-lg
                                hover:shadow-xl
                                transition-shadow duration-200
                            "
                        >
                            <div className="flex items-center gap-3 px-3 py-3">
                                {/* Icône simple */}
                                <div className={`flex-shrink-0 ${typeConfig.iconColor}`}>
                                    {typeConfig.icon}
                                </div>

                                {/* Message */}
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 leading-snug">
                                        {notification.message}
                                    </p>
                                </div>

                                {/* Bouton fermer */}
                                <button
                                    onClick={() => onClose(notification.id)}
                                    className="
                                        flex-shrink-0
                                        p-1
                                        hover:bg-gray-100 dark:hover:bg-gray-700
                                        rounded-md
                                        transition-colors duration-150
                                    "
                                >
                                    <X
                                        size={14}
                                        className="text-gray-400 dark:text-gray-500"
                                        strokeWidth={2}
                                    />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}