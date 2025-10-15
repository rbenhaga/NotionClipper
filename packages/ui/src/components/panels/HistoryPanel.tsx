// packages/ui/src/components/panels/HistoryPanel.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Trash2,
  X
} from 'lucide-react';
import type { HistoryEntry, HistoryStats, HistoryFilter } from '@notion-clipper/core-shared';
import { HistoryCard } from '../history/HistoryCard';

interface HistoryPanelProps {
  onClose: () => void;
  onRetry?: (entry: HistoryEntry) => void;
  onDelete?: (id: string) => void;
  getHistory: (filter?: HistoryFilter) => Promise<HistoryEntry[]>;
  getStats: () => Promise<HistoryStats>;
}

export function HistoryPanel({
  onClose,
  onRetry,
  onDelete,
  getHistory,
  getStats
}: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        getHistory(filter),
        getStats()
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    setFilter({ ...filter, search: value || undefined });
  };

  // Handle filter change
  const handleFilterChange = (newFilter: Partial<HistoryFilter>) => {
    setFilter({ ...filter, ...newFilter });
  };

  // Handle retry
  const handleRetry = async (entry: HistoryEntry) => {
    if (onRetry) {
      await onRetry(entry);
      loadData(); // Refresh data
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (onDelete) {
      await onDelete(id);
      setHistory(prev => prev.filter(e => e.id !== id));
      loadData(); // Refresh stats
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Clock size={20} />
          <h2 className="text-lg font-semibold">Historique</h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 border-b">
          <StatCard
            label="Total"
            value={stats.total}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="Réussi"
            value={stats.success}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            label="Échoué"
            value={stats.failed}
            icon={XCircle}
            color="red"
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher dans l'historique..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={14} />
            Filtres
          </button>
          
          {Object.keys(filter).length > 0 && (
            <button
              onClick={() => {
                setFilter({});
                setSearch('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <div className="flex flex-wrap gap-1">
                  {['success', 'failed', 'pending'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        const currentStatus = filter.status || [];
                        const newStatus = currentStatus.includes(status as HistoryEntry['status'])
                          ? currentStatus.filter((s: HistoryEntry['status']) => s !== status)
                          : [...currentStatus, status as HistoryEntry['status']];
                        handleFilterChange({ 
                          status: newStatus.length > 0 ? newStatus : undefined 
                        });
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        (filter.status || []).includes(status as any)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'success' ? 'Réussi' : 
                       status === 'failed' ? 'Échoué' : 'En attente'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex flex-wrap gap-1">
                  {['text', 'image', 'file', 'markdown'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const currentType = filter.type || [];
                        const newType = currentType.includes(type as HistoryEntry['type'])
                          ? currentType.filter((t: HistoryEntry['type']) => t !== type)
                          : [...currentType, type as HistoryEntry['type']];
                        handleFilterChange({ 
                          type: newType.length > 0 ? newType : undefined 
                        });
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        (filter.type || []).includes(type as any)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Clock size={48} className="mb-4 opacity-50" />
            <p>Aucun historique</p>
            {Object.keys(filter).length > 0 && (
              <p className="text-sm mt-2">Essayez de modifier les filtres</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 p-4">
            <AnimatePresence>
              {history.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  onRetry={handleRetry}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-emerald-600 bg-emerald-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <div className="text-center">
      <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center mx-auto mb-1`}>
        <Icon size={16} />
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}