// packages/ui/src/components/history/HistoryCard.tsx
import { motion } from 'framer-motion';
import {
    FileText,
    Image,
    Film,
    Code,
    CheckCircle,
    XCircle,
    Loader,
    RotateCw,
    Trash2,
    ExternalLink
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
        switch (entry.type) {
            case 'image': return <Image size={16} />;
            case 'markdown': return <Code size={16} />;
            case 'html': return <Code size={16} />;
            case 'file': return <Film size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const getStatusIcon = () => {
        switch (entry.status) {
            case 'success':
                return <CheckCircle size={16} className="text-emerald-500" />;
            case 'failed':
                return <XCircle size={16} className="text-red-500" />;
            case 'sending':
            case 'pending':
                return <Loader size={16} className="text-blue-500 animate-spin" />;
            case 'retrying':
                return <RotateCw size={16} className="text-yellow-500 animate-spin" />;
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (entry.status) {
            case 'success': return 'bg-emerald-50 border-emerald-200';
            case 'failed': return 'bg-red-50 border-red-200';
            case 'sending':
            case 'pending': return 'bg-blue-50 border-blue-200';
            case 'retrying': return 'bg-yellow-50 border-yellow-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 1 minute
        if (diff < 60000) return 'À l\'instant';

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }

        // Less than 1 day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
        }

        // Format date
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className={`
        p-4 border-l-4 ${getStatusColor()}
        hover:shadow-md transition-shadow
        dark:bg-gray-800/50
      `}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="text-gray-600 dark:text-gray-400">
                        {getTypeIcon()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {entry.page.icon} {entry.page.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(entry.timestamp)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                </div>
            </div>

            {/* Content preview */}
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                {entry.content.preview}
            </p>

            {/* Metadata */}
            {entry.content.metadata && (
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {entry.content.metadata.fileName && (
                        <span>📎 {entry.content.metadata.fileName}</span>
                    )}
                    {entry.content.metadata.fileSize && (
                        <span>{(entry.content.metadata.fileSize / 1024).toFixed(1)} KB</span>
                    )}
                    {entry.duration && (
                        <span>⏱️ {entry.duration}ms</span>
                    )}
                </div>
            )}

            {/* Error message */}
            {entry.error && (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400 mb-3">
                    {entry.error}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                {entry.status === 'success' && onViewInNotion && (
                    <button
                        onClick={() => onViewInNotion(entry.page.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                    >
                        <ExternalLink size={12} />
                        <span>Voir dans Notion</span>
                    </button>
                )}

                {entry.status === 'failed' && onRetry && (
                    <button
                        onClick={() => onRetry(entry)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                    >
                        <RotateCw size={12} />
                        <span>Réessayer</span>
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    >
                        <Trash2 size={12} />
                        <span>Supprimer</span>
                    </button>
                )}
            </div>
        </motion.div>
    );
}