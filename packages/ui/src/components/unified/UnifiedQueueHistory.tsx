// packages/ui/src/components/unified/UnifiedQueueHistory.tsx
import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Clock, CheckCircle2, XCircle, Wifi, WifiOff,
  RotateCcw, Trash2, Search, ArrowRight
} from 'lucide-react';
<<<<<<< HEAD
import { useTranslation } from '@notion-clipper/i18n';
=======
import { useTranslation, type TranslationKey, type InterpolationParams } from '@notion-clipper/i18n';
>>>>>>> 9ebcadf7cd75188ae3779c2dd9c8a36213b7da5a

export interface UnifiedEntry {
  id: string;
  type: 'queue' | 'history';
  status: 'pending' | 'sending' | 'success' | 'error' | 'offline';
  timestamp: number;
  content: {
    text?: string;
    type: 'text' | 'image' | 'file';
    preview?: string;
  };
  destination: {
    pageId: string;
    pageTitle: string;
    sectionId?: string;
    sectionTitle?: string;
  };
  error?: string;
  retryCount?: number;
  isOffline?: boolean;
}



interface UnifiedQueueHistoryProps {
  entries: UnifiedEntry[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onClear?: () => void;
  isOnline: boolean;
  className?: string;
}

function EntryCard({
  entry,
  onRetry,
  onDelete,
  isOnline,
  t
}: {
  entry: UnifiedEntry;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isOnline: boolean;
  t: (key: TranslationKey, params?: InterpolationParams) => string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusConfig = () => {
    switch (entry.status) {
      case 'pending':
        return {
          icon: <Clock size={16} className="text-amber-600 dark:text-amber-500" strokeWidth={2} />,
          iconBg: 'bg-amber-50 dark:bg-amber-950/30',
          label: t('common.waitingToSend'),
          labelColor: 'text-amber-700 dark:text-amber-400'
        };
      case 'sending':
        return {
          icon: <div className="w-3.5 h-3.5 border-2 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />,
          iconBg: 'bg-blue-50 dark:bg-blue-950/30',
          label: t('common.sendingInProgress'),
          labelColor: 'text-blue-700 dark:text-blue-400'
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-500" strokeWidth={2} />,
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
          label: t('common.sentSuccessfully'),
          labelColor: 'text-emerald-700 dark:text-emerald-400'
        };
      case 'error':
        return {
          icon: <XCircle size={16} className="text-red-600 dark:text-red-500" strokeWidth={2} />,
          iconBg: 'bg-red-50 dark:bg-red-950/30',
          label: t('common.errorOccurred'),
          labelColor: 'text-red-700 dark:text-red-400'
        };
      default:
        return {
          icon: <Clock size={16} className="text-white-600 dark:text-white-500" strokeWidth={2} />,
          iconBg: 'bg-white-50 dark:bg-white-950/30',
          label: t('common.waitingToSend'),
          labelColor: 'text-white-700 dark:text-white-400'
        };
    }
  };

  const config = getStatusConfig();
  const canRetry = entry.status === 'error' || (entry.status === 'pending' && entry.isOffline && isOnline);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return `${diffMins}${t('common.minutes')}`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}${t('common.hours')}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      <div className="relative flex items-start gap-3 p-3 rounded-lg hover:bg-white-50 dark:hover:bg-white/[0.02] transition-colors duration-200">
        {/* Status indicator */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-md ${config.iconBg} flex items-center justify-center mt-0.5`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-[15px] text-white-900 dark:text-white-100 leading-snug line-clamp-2 flex-1">
              {typeof entry.content.text === 'string' ? entry.content.text : t('common.contentWithoutTextLabel')}
            </p>
            <span className="text-[13px] text-white-500 dark:text-white-500 flex-shrink-0">
              {formatTime(entry.timestamp)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-white-600 dark:text-white-400 mb-1">
            <span className="truncate">{entry.destination.pageTitle}</span>
            {entry.destination.sectionTitle && (
              <>
                <ArrowRight size={12} strokeWidth={2} className="flex-shrink-0 text-white-400" />
                <span className="truncate">{entry.destination.sectionTitle}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-medium ${config.labelColor}`}>
              {config.label}
            </span>
          </div>

          {entry.error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/30">
              <p className="text-[13px] text-red-700 dark:text-red-400 leading-relaxed">
                {entry.error}
              </p>
            </div>
          )}
        </div>

        {/* Actions - subtle appearance on hover */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {canRetry && (
            <button
              onClick={() => onRetry(entry.id)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white-100 dark:hover:bg-white/5 transition-colors"
              title={t('common.retryAction')}
            >
              <RotateCcw size={14} className="text-white-600 dark:text-white-400" strokeWidth={2} />
            </button>
          )}

          <button
            onClick={() => onDelete(entry.id)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white-100 dark:hover:bg-white/5 transition-colors"
            title={t('common.deleteAction')}
          >
            <Trash2 size={14} className="text-white-600 dark:text-white-400" strokeWidth={2} />
          </button>
        </div>
      </div>
    </MotionDiv>
  );
}

export function UnifiedQueueHistory({
  entries,
  onRetry,
  onDelete,
  onClear,
  isOnline,
  className = ''
}: UnifiedQueueHistoryProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'pending' | 'success' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (filter !== 'all') {
      filtered = filtered.filter(entry => entry.status === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.content.text?.toLowerCase().includes(query) ||
        entry.destination.pageTitle.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, filter, searchQuery]);

  const stats = useMemo(() => {
    return {
      pending: entries.filter(e => e.status === 'pending').length,
      success: entries.filter(e => e.status === 'success').length,
      error: entries.filter(e => e.status === 'error').length,
      total: entries.length
    };
  }, [entries]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Stats - minimal */}
          <div className="flex items-center gap-2 text-[13px] text-white-600 dark:text-white-400">
            {stats.pending > 0 && <span>{stats.pending} {t('common.waitingToSend').toLowerCase()}</span>}
            {stats.error > 0 && <span>• {t('common.errors', { count: stats.error })}</span>}
          </div>
        </div>

        {onClear && stats.total > 0 && (
          <button
            onClick={onClear}
            className="text-[13px] text-white-600 dark:text-white-400 hover:text-white-900 dark:hover:text-white-200 font-medium transition-colors"
          >
            {t('common.clearAll')}
          </button>
        )}
      </div>

      {/* Search and filter - minimal */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white-400" strokeWidth={2} />
          <input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[15px] rounded-lg bg-white dark:bg-[#1a1a1a] border border-white-200 dark:border-white-800 text-white-900 dark:text-white-100 placeholder-white-400 dark:placeholder-white-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-2 text-[14px] rounded-lg bg-white dark:bg-[#1a1a1a] border border-white-200 dark:border-white-800 text-white-900 dark:text-white-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
        >
          <option value="all">{t('common.allItems')}</option>
          <option value="pending">{t('common.waitingToSend')}</option>
          <option value="success">{t('common.successfulItems')}</option>
          <option value="error">{t('common.errorItems')}</option>
        </select>
      </div>

      {/* List - clean and minimal */}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onRetry={onRetry}
                onDelete={onDelete}
                isOnline={isOnline}
                t={t}
              />
            ))
          ) : (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-center py-16"
            >
              <div className="w-12 h-12 bg-white-100 dark:bg-white-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock size={20} className="text-white-400 dark:text-white-600" strokeWidth={2} />
              </div>
              <p className="text-[15px] text-white-900 dark:text-white-100 font-medium mb-1">
                {t('common.noActivity')}
              </p>
              <p className="text-[13px] text-white-600 dark:text-white-400">
                {searchQuery || filter !== 'all'
                  ? t('common.noResults')
                  : t('common.noActivityYet')
                }
              </p>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}