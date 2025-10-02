import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, FileText, Database, Check } from 'lucide-react';
import { getPageIcon } from '../../utils/helpers';

function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, multiSelectMode }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = (e) => {
    e.stopPropagation();
    onClick(page);
  };

  return (
    <motion.div
      className={`
        relative rounded-lg cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-blue-50/50 border border-blue-200 shadow-sm' 
          : multiSelectMode
            ? 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
            : 'bg-white hover:bg-gray-50 border border-gray-200'
        }
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center p-3">
        {/* Indicateur de sélection subtil style Notion */}
        {multiSelectMode && (
          <div className="flex-shrink-0 mr-2.5 flex items-center">
            <div 
              className={`
                w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                ${isSelected 
                  ? 'bg-blue-500 border-blue-500' 
                  : isHovered 
                    ? 'border-gray-400 bg-white' 
                    : 'border-gray-300 bg-white'
                }
              `}
            >
              {isSelected && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </div>
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
            return <FileText size={14} className="text-gray-400" />;
          })()}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium truncate flex items-center gap-2 ${
            isSelected ? 'text-blue-900' : 'text-gray-900'
          }`}>
            <span className="truncate">{page.title || 'Sans titre'}</span>
            {page.type === 'database' && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex-shrink-0 flex items-center gap-1"
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
            <p className={`text-xs truncate ${
              isSelected ? 'text-blue-700' : 'text-gray-500'
            }`}>
              {page.parent_title}
            </p>
          )}
        </div>

        {/* Favori avec hitbox plus grande */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(page.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={`p-2 -m-1 rounded-lg flex-shrink-0 transition-colors ${
            isHovered || isFavorite ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          } hover:bg-gray-100`}
        >
          <Star
            size={14}
            className={isFavorite ? "text-yellow-500" : "text-gray-400"}
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </button>
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