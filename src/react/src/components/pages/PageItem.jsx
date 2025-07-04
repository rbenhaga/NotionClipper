import React from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle } from 'lucide-react';

function renderPageIcon(icon) {
  if (!icon) return <div className="w-4 h-4 bg-gray-200 rounded" />;
  // Emoji string
  if (typeof icon === 'string') {
    // Si c'est un emoji unicode
    if (icon.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]/u.test(icon)) {
      return <span className="text-sm leading-none">{icon}</span>;
    }
    // Si c'est une URL d'image
    if (icon.startsWith('http')) {
      return <img src={icon} alt="" className="w-4 h-4 rounded object-cover" onError={e => (e.target.style.display = 'none')} />;
    }
    // Sinon, fallback
    return <div className="w-4 h-4 bg-gray-200 rounded" />;
  }
  // Objet Notion API
  if (typeof icon === 'object') {
    if (icon.type === 'emoji' && icon.emoji) {
      return <span className="text-sm leading-none">{icon.emoji}</span>;
    }
    if (icon.type === 'external' && icon.external?.url) {
      return <img src={icon.external.url} alt="" className="w-4 h-4 rounded object-cover" onError={e => (e.target.style.display = 'none')} />;
    }
    if (icon.type === 'file' && icon.file?.url) {
      return <img src={icon.file.url} alt="" className="w-4 h-4 rounded object-cover" onError={e => (e.target.style.display = 'none')} />;
    }
  }
  // Fallback
  return <div className="w-4 h-4 bg-gray-200 rounded" />;
}

export default function PageItem({ 
  page, 
  isSelected, 
  onClick, 
  multiSelectMode,
  isFavorite,
  onToggleFavorite 
}) {
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite?.(page.id);
  };

  return (
    <motion.div
      className={`relative p-3 mx-2 mb-1 rounded-lg transition-all cursor-pointer ${
        isSelected 
          ? 'bg-blue-50 border border-blue-200' 
          : 'hover:bg-notion-gray-50'
      }`}
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {multiSelectMode && (
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
            isSelected 
              ? 'bg-blue-600 border-blue-600' 
              : 'border-gray-300'
          }`}>
            {isSelected && <CheckCircle size={12} className="text-white" />}
          </div>
        )}

        {/* Icône de la page */}
        <div className="flex-shrink-0">
          {renderPageIcon(page.icon)}
        </div>

        {/* Titre */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-notion-gray-800 truncate">
            {page.title || 'Sans titre'}
          </h4>
          {page.lastEditedTime && (
            <p className="text-xs text-notion-gray-500">
              Modifié {new Date(page.lastEditedTime).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Favori */}
        <button
          onClick={handleFavoriteClick}
          className="p-1 hover:bg-notion-gray-100 rounded transition-colors"
        >
          <Star 
            size={14} 
            className={isFavorite ? 'text-yellow-500 fill-current' : 'text-notion-gray-400'}
          />
        </button>
      </div>
    </motion.div>
  );
}