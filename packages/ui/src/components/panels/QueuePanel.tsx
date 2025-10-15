// packages/ui/src/components/panels/QueuePanel.tsx
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks,
  Clock,
  Loader,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
  Minimize2
} from 'lucide-react';
import type { QueueEntry, QueueStats } from '@notion-clipper/core-shared';
import { QueueCard } from '../queue/QueueCard';

interface QueuePanelProps {
  queue: QueueEntry[];
  stats: QueueStats;
  onClose: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  isOnline: boolean;
}

export function QueuePanel({
  queue,
  stats,
  onClose,
  onRetry,
  onRemove,
  onClear,
  isOnline
}: QueuePanelProps) {
  return (
    <>
      {/* Backdrop avec blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
      />

      {/* Drawer flottant */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 flex flex-col z-50 overflow-hidden"
      >
        {/* Header avec glassmorphism */}
        <div className="px-5 py-4 border-b border-gray-100/50 backdrop-blur-xl bg-white/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <ListChecks size={20} className="text-white" />
                </div>
                {stats.queued > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg"
                  >
                    {stats.queued}
                  </motion.span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">File d'attente</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-xs text-gray-500 font-medium">
                    {isOnline ? 'En ligne' : 'Hors ligne'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {queue.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClear}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Vider
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </motion.button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Attente', value: stats.queued, color: 'blue', icon: Clock },
              { label: 'Traitement', value: stats.processing, color: 'yellow', icon: Loader },
              { label: 'Retry', value: stats.retrying, color: 'orange', icon: AlertTriangle },
              { label: 'Échecs', value: stats.failed, color: 'red', icon: X }
            ].map(({ label, value, color, icon: Icon }) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`
                  relative overflow-hidden rounded-xl p-3 text-center
                  bg-gradient-to-br
                  ${color === 'blue' && 'from-blue-50 to-blue-100/50 border border-blue-200/30'}
                  ${color === 'yellow' && 'from-yellow-50 to-yellow-100/50 border border-yellow-200/30'}
                  ${color === 'orange' && 'from-orange-50 to-orange-100/50 border border-orange-200/30'}
                  ${color === 'red' && 'from-red-50 to-red-100/50 border border-red-200/30'}
                  shadow-sm
                `}
              >
                <div className={`
                  text-2xl font-bold mb-0.5
                  ${color === 'blue' && 'text-blue-600'}
                  ${color === 'yellow' && 'text-yellow-600'}
                  ${color === 'orange' && 'text-orange-600'}
                  ${color === 'red' && 'text-red-600'}
                `}>
                  {value}
                </div>
                <div className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">
                  {label}
                </div>
                <Icon
                  size={24}
                  className={`
                    absolute -bottom-1 -right-1 opacity-10
                    ${color === 'blue' && 'text-blue-600'}
                    ${color === 'yellow' && 'text-yellow-600'}
                    ${color === 'orange' && 'text-orange-600'}
                    ${color === 'red' && 'text-red-600'}
                  `}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Offline Warning */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-5 mt-4 p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-900 mb-0.5">Mode hors ligne</p>
                    <p className="text-xs text-orange-700/80 leading-relaxed">
                      Les éléments seront synchronisés automatiquement lors de la reconnexion
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {queue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-gray-400 p-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-inner">
                <ListChecks size={40} className="opacity-30" />
              </div>
              <p className="text-center font-medium text-gray-900 mb-1">Tout est à jour</p>
              <p className="text-xs text-center text-gray-500 max-w-[200px]">
                Les envois en attente ou hors ligne apparaîtront ici
              </p>
            </motion.div>
          ) : (
            <div className="p-5 space-y-3">
              <AnimatePresence mode="popLayout">
                {queue.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 100 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  >
                    <QueueCard
                      entry={entry}
                      onRetry={() => onRetry(entry.id)}
                      onRemove={() => onRemove(entry.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Processing Indicator */}
        <AnimatePresence>
          {stats.processing > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100/50 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Loader size={16} className="text-blue-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Synchronisation en cours
                  </p>
                  <p className="text-xs text-blue-700/70">
                    {stats.processing} élément{stats.processing > 1 ? 's' : ''} en traitement
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}