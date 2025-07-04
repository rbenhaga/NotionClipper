import React from 'react';
import { motion } from 'framer-motion';
import { 
  Star, Database, Calendar, FileText, Code, Hash,
  CheckSquare, Quote, Bookmark, Globe, Folder
} from 'lucide-react';

// Fonction pour obtenir l'icône appropriée avec emojis Notion
function getPageIcon(page) {
  if (!page) return null;

  if (page.icon) {
    if (typeof page.icon === 'string') {
      // Emoji
      if (page.icon.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]/u.test(page.icon)) {
        return <span className="text-sm leading-none">{page.icon}</span>;
      }
      // URL
      if (page.icon.startsWith('http')) {
        return <img src={page.icon} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
    }

    if (typeof page.icon === 'object') {
      if (page.icon.type === 'emoji' && page.icon.emoji) {
        return <span className="text-sm leading-none">{page.icon.emoji}</span>;
      }
      if (page.icon.type === 'external' && page.icon.external?.url) {
        return <img src={page.icon.external.url} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
      if (page.icon.type === 'file' && page.icon.file?.url) {
        return <img src={page.icon.file.url} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
    }
  }

  // Icônes par défaut basées sur le titre
  const title = page.title?.toLowerCase() || '';

  if (title.includes('database') || title.includes('table') || title.includes('bdd'))
    return <Database size={14} className="text-blue-600" />;
  if (title.includes('calendar') || title.includes('calendrier'))
    return <Calendar size={14} className="text-green-600" />;
  if (title.includes('kanban') || title.includes('task') || title.includes('todo') || title.includes('tâche'))
    return <CheckSquare size={14} className="text-purple-600" />;
  if (title.includes('code') || title.includes('dev') || title.includes('programming'))
    return <Code size={14} className="text-gray-600" />;
  if (title.includes('quote') || title.includes('citation'))
    return <Quote size={14} className="text-orange-600" />;

  // Icône par défaut
  return <FileText size={14} className="text-notion-gray-400" />;
}

// Composant de page avec sélection multiple - amélioré pour la fluidité
function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, multiSelectMode }) {
  const handleClick = () => {
    onClick(page);
  };

  return (
    <motion.div
      className={`relative p-3 rounded-notion transition-all cursor-pointer ${
        isSelected 
          ? 'bg-blue-50 border-blue-300' 
          : 'bg-white hover:bg-notion-gray-50 border-notion-gray-200'
      } border`}
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
          {getPageIcon(page)}
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

export default PageCard;