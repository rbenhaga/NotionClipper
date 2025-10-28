// packages/ui/src/components/history/HistoryCard.tsx
// Design Notion/Apple moderne et élégant

import { motion } from 'framer-motion';
import {
    FileText,
    Image,
    Film,
    Code,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RotateCcw,
    Trash2,
    ExternalLink,
    Clock
} from 'lucide-react';
import type { HistoryEntry } from '@notion-clipper/core-shared';

interface HistoryCardProps {
    entry: HistoryEntry;
    onRetry?: (entry: HistoryEntry) => void;
    onDelete?: (id: string) => void;
    onViewInNotion?: (pageId: string) => void;
}

export function HistoryCard({
    entry,
    onRetry,
    onDelete,
    onViewInNotion
}: HistoryCardProps) {
    const getTypeIcon = () => {
        const iconClass = "w-4 h-4";
        switch (entry.type) {
            case 'image': return <Image className={iconClass} strokeWidth={2} />;
            case 'markdown': return <Code className={iconClass} strokeWidth={2} />;
            case 'html': return <Code className={iconClass} strokeWidth={2} />;
            case 'file': return <Film className={iconClass} strokeWidth={2} />;
            default: return <FileText className={iconClass} strokeWidth={2} />;
        }
    };

    const getStatusConfig = () => {
        switch (entry.status) {
            case 'success':
                return {
                    icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2} />,
                    iconColor: 'text-emerald-600 dark:text-emerald-400',
                    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
                    borderColor: 'border-emerald-200 dark:border-emerald-500/30',
                    accentColor: 'bg-emerald-500'
                };
            case 'failed':
                return {
                    icon: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
                    iconColor: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-500/10',
                    borderColor: 'border-red-200 dark:border-red-500/30',
                    accentColor: 'bg-red-500'
                };
            case 'sending':
            case 'pending':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />,
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
                    borderColor: 'border-blue-200 dark:border-blue-500/30',
                    accentColor: 'bg-blue-500'
                };
            case 'retrying':
                return {
                    icon: <RotateCcw className="w-4 h-4 animate-spin" strokeWidth={2} />,
                    iconColor: 'text-amber-600 dark:text-amber-400',
                    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
                    borderColor: 'border-amber-200 dark:border-amber-500/30',
                    accentColor: 'bg-amber-500'
                };
            default:
                return {
                    icon: <Clock className="w-4 h-4" strokeWidth={2} />,
                    iconColor: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-500/10',
                    borderColor: 'border-gray-200 dark:border-gray-500/30',
                    accentColor: 'bg-gray-500'
                };
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'À l\'instant';
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `Il y a ${minutes} min`;
        }
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Il y a ${hours}h`;
        }

        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const statusConfig = getStatusConfig();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
                group relative overflow-hidden
                bg-white dark:bg-gray-800/50
                border ${statusConfig.borderColor}
                rounded-xl
                hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20
                transition-all duration-200
            `}
        >
            {/* Barre d'accentuation latérale */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.accentColor}`} />

            <div className="p-4 pl-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        {/* Page info */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{entry.page.icon}</span>
                            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {entry.page.title}
                            </h3>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-[12px] text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                                {getTypeIcon()}
                                <span className="capitalize">{entry.type}</span>
                            </div>
                            <span>•</span>
                            <span>{formatDate(entry.timestamp)}</span>
                            {entry.duration && (
                                <>
                                    <span>•</span>
                                    <span>{entry.duration}ms</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 
                        ${statusConfig.bgColor} 
                        rounded-lg
                        transition-colors
                    `}>
                        <span className={statusConfig.iconColor}>
                            {statusConfig.icon}
                        </span>
                    </div>
                </div>

                {/* Content preview */}
                <p className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed mb-3">
                    {entry.content.preview}
                </p>

                {/* File metadata */}
                {entry.content.metadata && (entry.content.metadata.fileName || entry.content.metadata.fileSize) && (
                    <div className="flex items-center gap-3 mb-3">
                        {entry.content.metadata.fileName && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700/50 text-[11px] text-gray-700 dark:text-gray-300 rounded-md font-medium">
                                📎 {entry.content.metadata.fileName}
                            </span>
                        )}
                        {entry.content.metadata.fileSize && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {(entry.content.metadata.fileSize / 1024).toFixed(1)} KB
                            </span>
                        )}
                    </div>
                )}

                {/* Error message */}
                {entry.error && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                        <p className="text-[12px] text-red-700 dark:text-red-400 leading-relaxed">
                            {entry.error}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                    {entry.status === 'success' && onViewInNotion && (
                        <button
                            onClick={() => onViewInNotion(entry.page.id)}
                            className="
                                flex items-center gap-1.5 px-3 py-1.5
                                text-[12px] font-medium
                                text-gray-700 dark:text-gray-300
                                bg-gray-100 dark:bg-gray-700/50
                                hover:bg-gray-200 dark:hover:bg-gray-700
                                rounded-lg
                                transition-all duration-200
                            "
                        >
                            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Voir dans Notion</span>
                        </button>
                    )}

                    {entry.status === 'failed' && onRetry && (
                        <button
                            onClick={() => onRetry(entry)}
                            className="
                                flex items-center gap-1.5 px-3 py-1.5
                                text-[12px] font-medium
                                text-white
                                bg-gradient-to-r from-blue-600 to-blue-500
                                hover:from-blue-700 hover:to-blue-600
                                rounded-lg
                                shadow-sm
                                transition-all duration-200
                            "
                        >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Réessayer</span>
                        </button>
                    )}

                    {onDelete && (
                        <button
                            onClick={() => onDelete(entry.id)}
                            className="
                                ml-auto
                                flex items-center gap-1.5 px-3 py-1.5
                                text-[12px] font-medium
                                text-red-600 dark:text-red-400
                                hover:bg-red-50 dark:hover:bg-red-500/10
                                rounded-lg
                                transition-all duration-200
                            "
                        >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Supprimer</span>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}