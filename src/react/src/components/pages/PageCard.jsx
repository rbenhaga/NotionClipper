import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, FileText, Database } from 'lucide-react';
import { getPageIcon } from '../../utils/helpers';

function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, multiSelectMode }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (e.target.type !== 'checkbox' && e.target.tagName !== 'INPUT') {
      onClick(page);
    }
  };

  return (
    <motion.div
      className={`
        relative rounded-notion cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-blue-50 border-2 border-blue-400 shadow-sm' 
          : 'bg-white hover:bg-notion-gray-50 border border-notion-gray-200'
        }
      `}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center p-3">
        {/* Checkbox mieux intégrée */}
        {multiSelectMode && (
          <div
            className="flex-shrink-0 mr-3 flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onClick(page);
              }}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

        {/* Icône avec espace suffisant */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-3">
          {(() => {
            const icon = getPageIcon(page);
            if (icon.type === 'emoji') {
              return <span className="text-sm leading-none">{icon.value}</span>;
            }
            if (icon.type === 'url') {
              return <img src={icon.value} alt="" className="w-4 h-4 rounded object-cover" onError={e => (e.target.style.display = 'none')} />;
            }
            return <FileText size={14} className="text-notion-gray-400" />;
          })()}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-notion-gray-900 truncate flex items-center gap-2">
            <span className="truncate">{page.title || 'Sans titre'}</span>
            {page.type === 'database' && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0 flex items-center gap-1"
                title="Base de données Notion"
              >
                <Database size={10} />
                DB
              </span>
            )}
            {page.parent?.type === 'database_id' && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex-shrink-0 flex items-center gap-1"
                title="Entrée de base de données - Propriétés dynamiques disponibles"
              >
                <Database size={8} />
                Link
              </span>
            )}
          </h3>
          {page.parent_title && (
            <p className="text-xs text-notion-gray-500 truncate">
              {page.parent_title}
            </p>
          )}
        </div>

        {/* Favori */}
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(page.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="p-1 rounded hover:bg-notion-gray-100 flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Star
            size={14}
            className={isFavorite ? "text-yellow-500" : "text-notion-gray-300"}
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default memo(PageCard, (prevProps, nextProps) => {
  return (
    prevProps.page.id === nextProps.page.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.multiSelectMode === nextProps.multiSelectMode &&
    prevProps.page.title === nextProps.page.title &&
    prevProps.page.last_edited_time === nextProps.page.last_edited_time
  );
});