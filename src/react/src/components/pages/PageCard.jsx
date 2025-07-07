import React from 'react';
import { motion } from 'framer-motion';
import { Star, FileText } from 'lucide-react';
import { getPageIcon } from '../../utils/helpers';

function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, multiSelectMode }) {
  const handleClick = (e) => {
    // Éviter le double-clic sur la checkbox
    if (e.target.type !== 'checkbox') {
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
      <div className={`flex items-center gap-3 p-3 ${multiSelectMode ? 'pl-10' : ''}`}>
        {/* Checkbox absolue pour éviter le conflit */}
        {multiSelectMode && (
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15 }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onClick(page);
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 \
                           focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
                           cursor-pointer"
              />
            </motion.div>
          </div>
        )}

        {/* Icône avec espace suffisant */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
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
          <h3 className="text-sm font-medium text-notion-gray-900 truncate">
            {page.title || 'Sans titre'}
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
            e.stopPropagation();
            onToggleFavorite(page.id);
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

export default PageCard;