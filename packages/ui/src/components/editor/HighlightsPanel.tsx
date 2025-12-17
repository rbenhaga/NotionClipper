/**
 * HighlightsPanel Component
 * Gestion des highlights/surlignages de texte
 * Design minimaliste style Notion avec i18n complet
 */

import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { 
  Highlighter, Search, Trash2, Copy, ExternalLink,
  Tag, Clock, Filter
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

export interface Highlight {
  id: string;
  text: string;
  color: HighlightColor;
  sourceUrl?: string;
  sourceTitle?: string;
  note?: string;
  tags?: string[];
  createdAt: Date;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export interface HighlightsPanelProps {
  highlights: Highlight[];
  onAddHighlight?: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  onDeleteHighlight?: (id: string) => void;
  onUpdateHighlight?: (id: string, updates: Partial<Highlight>) => void;
  onCopyHighlight?: (highlight: Highlight) => void;
  onInsertHighlight?: (highlight: Highlight) => void;
  className?: string;
}

const colorClasses: Record<HighlightColor, { bg: string; border: string; text: string }> = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-300'
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300'
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-700 dark:text-pink-300'
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-700 dark:text-purple-300'
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-700 dark:text-orange-300'
  }
};

const colorDots: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400'
};

export function HighlightsPanel({
  highlights,
  onDeleteHighlight,
  onUpdateHighlight,
  onCopyHighlight,
  onInsertHighlight,
  className = ''
}: HighlightsPanelProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  // Traductions avec fallbacks (cast pour contourner le typage strict)
  const tr = t as (key: string, options?: any) => string;
  const texts = {
    title: tr('highlights.title', 'Highlights'),
    items: tr('highlights.items', 'éléments'),
    searchPlaceholder: tr('highlights.searchPlaceholder', 'Rechercher...'),
    all: tr('highlights.all', 'Tous'),
    noHighlights: tr('highlights.noHighlights', 'Aucun highlight'),
    noResults: tr('highlights.noResults', 'Aucun résultat'),
    startHighlighting: tr('highlights.startHighlighting', 'Surlignez du texte pour commencer'),
    justNow: tr('highlights.justNow', "À l'instant"),
  };

  // Filtrer les highlights
  const filteredHighlights = useMemo(() => {
    let filtered = highlights;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.text.toLowerCase().includes(query) ||
        h.note?.toLowerCase().includes(query) ||
        h.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (selectedColor) {
      filtered = filtered.filter(h => h.color === selectedColor);
    }
    
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [highlights, searchQuery, selectedColor]);

  // Grouper par date
  const groupedHighlights = useMemo(() => {
    const groups: { [key: string]: Highlight[] } = {};
    
    filteredHighlights.forEach(highlight => {
      const date = highlight.createdAt.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(highlight);
    });
    
    return groups;
  }, [filteredHighlights]);

  // Formater la date relative
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return texts.justNow;
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Highlighter size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {texts.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {highlights.length} {texts.items}
            </p>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={texts.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>

        {/* Filtres couleur */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-gray-400" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedColor(null)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                !selectedColor
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {texts.all}
            </button>
            {(Object.keys(colorDots) as HighlightColor[]).map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500'
                    : 'hover:scale-110'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${colorDots[color]}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des highlights */}
      <div className="max-h-96 overflow-y-auto">
        {Object.keys(groupedHighlights).length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Highlighter size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? texts.noResults : texts.noHighlights}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {texts.startHighlighting}
            </p>
          </div>
        ) : (
          Object.entries(groupedHighlights).map(([date, items]) => (
            <div key={date} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
              {/* Date header */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {date}
                </span>
              </div>
              
              {/* Highlights du jour */}
              <div className="p-2">
                {items.map((highlight) => (
                  <HighlightItem
                    key={highlight.id}
                    highlight={highlight}
                    isExpanded={expandedId === highlight.id}
                    showColorPicker={showColorPicker === highlight.id}
                    onToggleExpand={() => setExpandedId(expandedId === highlight.id ? null : highlight.id)}
                    onToggleColorPicker={() => setShowColorPicker(showColorPicker === highlight.id ? null : highlight.id)}
                    onCloseColorPicker={() => setShowColorPicker(null)}
                    onChangeColor={(color) => {
                      onUpdateHighlight?.(highlight.id, { color });
                      setShowColorPicker(null);
                    }}
                    onCopy={() => onCopyHighlight?.(highlight)}
                    onInsert={() => onInsertHighlight?.(highlight)}
                    onDelete={() => onDeleteHighlight?.(highlight.id)}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Composant highlight individuel
function HighlightItem({
  highlight,
  isExpanded,
  showColorPicker,
  onToggleExpand,
  onToggleColorPicker,
  onCloseColorPicker,
  onChangeColor,
  onCopy,
  onInsert,
  onDelete,
  formatRelativeTime
}: {
  highlight: Highlight;
  isExpanded: boolean;
  showColorPicker: boolean;
  onToggleExpand: () => void;
  onToggleColorPicker: () => void;
  onCloseColorPicker: () => void;
  onChangeColor: (color: HighlightColor) => void;
  onCopy: () => void;
  onInsert: () => void;
  onDelete: () => void;
  formatRelativeTime: (date: Date) => string;
}) {
  const colors = colorClasses[highlight.color];

  return (
    <MotionDiv
      layout
      className={`group rounded-lg border ${colors.border} ${colors.bg} p-3 mb-2 last:mb-0 transition-all hover:shadow-sm`}
    >
      {/* Texte du highlight */}
      <div 
        className={`text-sm ${colors.text} cursor-pointer ${
          isExpanded ? '' : 'line-clamp-2'
        }`}
        onClick={onToggleExpand}
      >
        "{highlight.text}"
      </div>

      {/* Métadonnées */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock size={10} />
          <span>{formatRelativeTime(highlight.createdAt)}</span>
          
          {highlight.sourceTitle && (
            <>
              <span>•</span>
              <span className="truncate max-w-[100px]">{highlight.sourceTitle}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Color picker */}
          <div className="relative">
            <button
              onClick={onToggleColorPicker}
              className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
            >
              <div className={`w-3 h-3 rounded-full ${colorDots[highlight.color]}`} />
            </button>
            
            <AnimatePresence>
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onCloseColorPicker} />
                  <MotionDiv
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 bottom-full mb-1 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl flex gap-1"
                  >
                    {(Object.keys(colorDots) as HighlightColor[]).map((color) => (
                      <button
                        key={color}
                        onClick={() => onChangeColor(color)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110 ${
                          highlight.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${colorDots[color]}`} />
                      </button>
                    ))}
                  </MotionDiv>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Copy */}
          <button
            onClick={onCopy}
            className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Copier"
          >
            <Copy size={12} />
          </button>

          {/* Insert */}
          <button
            onClick={onInsert}
            className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            title="Insérer"
          >
            <ExternalLink size={12} />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Supprimer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Note (si expandé) */}
      <AnimatePresence>
        {isExpanded && highlight.note && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50"
          >
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              {highlight.note}
            </p>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Tags */}
      {highlight.tags && highlight.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {highlight.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-white/50 dark:bg-black/20 rounded text-gray-600 dark:text-gray-400"
            >
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </MotionDiv>
  );
}