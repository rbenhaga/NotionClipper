// packages/ui/src/components/queue/QueueCard.tsx
import { motion } from 'framer-motion';
import {
  Clock,
  Loader,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import type { QueueEntry } from '@notion-clipper/core-shared';

interface QueueCardProps {
  entry: QueueEntry;
  onRetry: () => void;
  onRemove: () => void;
}

export function QueueCard({ entry, onRetry, onRemove }: QueueCardProps) {
  const getStatusConfig = () => {
    switch (entry.status) {
      case 'queued':
        return {
          icon: <Clock size={16} />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'En attente'
        };
      case 'processing':
        return {
          icon: <Loader size={16} className="animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          label: 'En cours'
        };
      case 'retrying':
        return {
          icon: <RotateCw size={16} className="animate-spin" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          label: 'Nouvelle tentative'
        };
      case 'failed':
        return {
          icon: <AlertTriangle size={16} />,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          label: 'Échoué'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={16} />,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-100',
          label: 'Terminé'
        };
      default:
        return {
          icon: <Clock size={16} />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Inconnu'
        };
    }
  };

  const getPriorityBadge = () => {
    if (entry.priority === 'high') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          Priorité haute
        </span>
      );
    }
    if (entry.priority === 'low') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Priorité basse
        </span>
      );
    }
    return null;
  };

  const formatNextRetry = () => {
    if (!entry.nextRetry) return null;
    
    const now = Date.now();
    const diff = entry.nextRetry - now;
    
    if (diff <= 0) return 'Bientôt';
    
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `Dans ${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    return `Dans ${minutes}min`;
  };

  const config = getStatusConfig();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`${config.color}`}>
            {config.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {entry.payload.pageId.substring(0, 8)}...
            </p>
            <p className="text-xs text-gray-500">
              Tentative {entry.attempts}/{entry.maxAttempts}
            </p>
          </div>
        </div>
        
        <button
          onClick={onRemove}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color} rounded-full`}>
          {config.label}
        </span>
        {getPriorityBadge()}
      </div>

      {/* Next retry */}
      {entry.status === 'retrying' && entry.nextRetry && (
        <p className="text-xs text-gray-600 mb-2">
          Prochaine tentative : {formatNextRetry()}
        </p>
      )}

      {/* Error */}
      {entry.error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mb-2">
          {entry.error}
        </div>
      )}

      {/* Actions */}
      {entry.status === 'failed' && (
        <button
          onClick={onRetry}
          className="w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
        >
          <RotateCw size={12} />
          <span>Réessayer maintenant</span>
        </button>
      )}
    </motion.div>
  );
}