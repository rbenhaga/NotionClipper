// packages/ui/src/components/queue/QueueCard.tsx
import { motion } from 'framer-motion';
import {
    FileText,
    Image as ImageIcon,
    Code,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Trash2,
    Calendar
} from 'lucide-react';
import type { QueueEntry } from '@notion-clipper/core-shared';
// Removed date-fns dependency - using native date formatting

interface QueueCardProps {
    entry: QueueEntry;
    onRetry: () => void;
    onRemove: () => void;
}

const statusConfig = {
    queued: {
        icon: Clock,
        label: 'En attente',
        color: 'blue',
        bg: 'from-blue-50 to-blue-100/50',
        border: 'border-blue-200/50',
        text: 'text-blue-700',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
    },
    processing: {
        icon: Loader2,
        label: 'En cours',
        color: 'yellow',
        bg: 'from-yellow-50 to-yellow-100/50',
        border: 'border-yellow-200/50',
        text: 'text-yellow-700',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600'
    },
    retrying: {
        icon: RefreshCw,
        label: 'Nouvelle tentative',
        color: 'orange',
        bg: 'from-orange-50 to-orange-100/50',
        border: 'border-orange-200/50',
        text: 'text-orange-700',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    failed: {
        icon: AlertCircle,
        label: 'Échec',
        color: 'red',
        bg: 'from-red-50 to-red-100/50',
        border: 'border-red-200/50',
        text: 'text-red-700',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600'
    },
    completed: {
        icon: CheckCircle2,
        label: 'Terminé',
        color: 'green',
        bg: 'from-emerald-50 to-emerald-100/50',
        border: 'border-emerald-200/50',
        text: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600'
    }
};

const contentTypeIcons: Record<string, any> = {
    text: FileText,
    html: Code,
    markdown: FileText,
    image: ImageIcon,
    default: FileText
};

export function QueueCard({ entry, onRetry, onRemove }: QueueCardProps) {
    const status = statusConfig[entry.status] || statusConfig.queued;
    const StatusIcon = status.icon;

    // Safe access to payload properties - determine content type from content
    const determineContentType = (content: any): string => {
        if (!content) return 'text';
        if (typeof content === 'string') {
            if (content.includes('<html') || content.includes('<!DOCTYPE')) return 'html';
            if (content.includes('# ') || content.includes('## ')) return 'markdown';
            return 'text';
        }
        if (content.type === 'image' || content.data) return 'image';
        return 'text';
    };

    const contentType = determineContentType(entry.payload?.content);
    const ContentIcon = contentTypeIcons[contentType] || contentTypeIcons.default;

    // Format time without date-fns
    const formatTimeAgo = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes} min`;
        if (hours < 24) return `Il y a ${hours}h`;
        return `Il y a ${days}j`;
    };

    const timeAgo = formatTimeAgo(entry.createdAt || Date.now());

    return (
        <motion.div
            layout
            className={`
        relative overflow-hidden rounded-xl border
        bg-gradient-to-br ${status.bg} ${status.border}
        shadow-sm hover:shadow-md transition-shadow
      `}
        >
            {/* Header */}
            <div className="p-3 border-b border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Content Type Icon */}
                        <div className="w-10 h-10 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-200/30 dark:border-gray-700/30">
                            <ContentIcon size={18} className="text-gray-600 dark:text-gray-400" />
                        </div>

                        {/* Content Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate mb-0.5">
                                {contentType === 'text' && 'Texte capturé'}
                                {contentType === 'html' && 'HTML capturé'}
                                {contentType === 'markdown' && 'Markdown capturé'}
                                {contentType === 'image' && 'Image capturée'}
                                {!['text', 'html', 'markdown', 'image'].includes(contentType) && 'Contenu capturé'}
                            </h4>

                            {/* Preview Text */}
                            {contentType !== 'image' && entry.payload?.content && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                    {typeof entry.payload.content === 'string'
                                        ? entry.payload.content.substring(0, 100) + (entry.payload.content.length > 100 ? '...' : '')
                                        : ''}
                                </p>
                            )}

                            {/* Target Page */}
                            {entry.payload?.pageId && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        Page: {entry.payload.pageId.slice(0, 8)}...
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            ${status.iconBg} border ${status.border}
            flex-shrink-0
          `}>
                        <StatusIcon
                            size={14}
                            className={`${status.iconColor} ${entry.status === 'processing' ? 'animate-spin' : ''
                                } ${entry.status === 'retrying' ? 'animate-spin' : ''
                                }`}
                        />
                        <span className={`text-xs font-medium ${status.text}`}>
                            {status.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={12} />
                    <span>{timeAgo}</span>

                    {entry.attempts && entry.attempts > 1 && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                                {entry.attempts} tentative{entry.attempts > 1 ? 's' : ''}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Retry Button (only for failed) */}
                    {entry.status === 'failed' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onRetry}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
                            title="Réessayer"
                        >
                            <RefreshCw size={14} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </motion.button>
                    )}

                    {/* Remove Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onRemove}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                        title="Supprimer"
                    >
                        <Trash2 size={14} className="text-gray-400 dark:text-gray-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                    </motion.button>
                </div>
            </div>

            {/* Error Message (if failed) */}
            {entry.status === 'failed' && entry.error && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden"
                >
                    <div className="px-3 py-2 bg-red-50/50 dark:bg-red-900/20 border-t border-red-100/50 dark:border-red-800/50">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={12} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                                {entry.error}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Progress Bar (only for processing) */}
            {entry.status === 'processing' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
            )}
        </motion.div>
    );
}