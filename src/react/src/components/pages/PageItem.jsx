// src/react/src/components/pages/PageItem.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Star, Database, FileText } from 'lucide-react';
import { getPageIcon as getPageIconUtil } from '../../utils/helpers';

export default function PageItem({
  page,
  isSelected,
  isFavorite,
  multiSelectMode,
  onClick,
  onToggleFavorite
}) {
  // Obtenir l'icône de la page
  const renderPageIcon = () => {
    const iconData = getPageIconUtil(page);
    
    if (iconData.type === 'emoji') {
      return <span className="text-sm leading-none">{iconData.value}</span>;
    }
    
    if (iconData.type === 'url') {
      return (
        <img 
          src={iconData.value} 
          alt="" 
          className="w-4 h-4 rounded object-cover" 
          onError={(e) => e.target.style.display = 'none'} 
        />
      );
    }
    
    // Icône par défaut basée sur le type
    if (page.parent_type === 'database') {
      return <Database size={14} className="text-blue-600" />;
    }
    
    return <FileText size={14} className="text-notion-gray-500" />;
  };

  const handleClick = (e) => {
    e.preventDefault();
    onClick();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        relative mb-2 p-3 rounded-lg cursor-pointer transition-all page-card
        ${isSelected 
          ? 'bg-blue-50 border-blue-300' 
          : 'bg-white hover:bg-notion-gray-50 border-notion-gray-200'
        } border
      `}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        {multiSelectMode && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} // Géré par onClick du parent
              onClick={e => e.stopPropagation()} // Éviter double toggle
              className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
            />
          </div>
        )}

        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {renderPageIcon()}
        </div>

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

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(page.id);
          }}
          className="p-1 rounded hover:bg-notion-gray-100"
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