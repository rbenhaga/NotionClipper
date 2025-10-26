import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, FileText, Database, Check } from 'lucide-react';
import { getPageIcon } from '../../utils/helpers';

interface PageCardProps {
  page: {
    id: string;
    title: string;
    icon?: any;
    type?: string;
    parent?: any;
    parent_title?: string;
    last_edited_time?: string;
  };
  onClick: (page: any, event?: React.MouseEvent) => void;
  isFavorite: boolean;
  onToggleFavorite: (pageId: string) => void;
  isSelected: boolean;
  multiSelectMode?: boolean;
}

/**
 * Carte de page Notion avec:
 * - Icône/emoji
 * - Badges pour database et liens de database
 * - Bouton favori
 * - Checkbox en mode multi-select
 * - Tooltips natifs
 * - Animations
 */
const PageCardComponent = function PageCard({
  page,
  onClick,
  isFavorite,
  onToggleFavorite,
  isSelected,
  multiSelectMode = false
}: PageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.favorite-button')) {
      return;
    }
    // Passer l'événement pour détecter Ctrl/Cmd
    onClick(page, e);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[FAVORITE] Toggling favorite for page:', page?.id, 'page:', page);
    if (page?.id) {
      onToggleFavorite(page.id);
    } else {
      console.error('[FAVORITE] Page or page.id is undefined:', page);
    }
  };

  return (
    <motion.div
      className={`
        relative rounded-lg cursor-pointer transition-all duration-200
        ${isSelected
          ? 'bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 shadow-sm'
          : multiSelectMode
            ? 'bg-white dark:bg-[#202020] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            : 'bg-white dark:bg-[#202020] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700'
        }
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center p-3">
        {/* Icône */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-3">
          {(() => {
            const icon = getPageIcon(page);
            if (icon.type === 'emoji') {
              return <span className="text-sm leading-none">{icon.value}</span>;
            }
            if (icon.type === 'url') {
              return (
                <img
                  src={icon.value}
                  alt=""
                  className="w-4 h-4 rounded object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              );
            }
            return <FileText size={14} className="text-gray-400 dark:text-gray-500" />;
          })()}
        </div>

        {/* Contenu avec tooltips */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-medium truncate flex items-center gap-2 ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
              }`}
            title={page.title || 'Sans titre'}
          >
            <span className="truncate">{page.title || 'Sans titre'}</span>

            {/* Badge Database */}
            {(page.type === 'database' || page.type === 'data_source') && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex-shrink-0 flex items-center gap-1"
                title="Base de données Notion"
              >
                <Database size={10} />
                DB
              </span>
            )}

            {/* Badge Database Link */}
            {(page.parent?.type === 'database_id' || page.parent?.type === 'data_source_id') && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex-shrink-0 flex items-center gap-1"
                title="Entrée de base de données - Propriétés dynamiques disponibles"
              >
                <Database size={8} />
                Link
              </span>
            )}
          </h3>

          {/* Parent title et date de dernière modification */}
          <div className="flex items-center justify-between">
            {page.parent_title && (
              <p
                className={`text-xs truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                title={page.parent_title}
              >
                {page.parent_title}
              </p>
            )}
            {page.last_edited_time && (
              <p
                className={`text-xs ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} flex-shrink-0`}
                title={`Dernière modification: ${new Date(page.last_edited_time).toLocaleString('fr-FR')}`}
              >
                {(() => {
                  const date = new Date(page.last_edited_time);
                  const now = new Date();
                  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
                  
                  if (hours < 1) return 'Il y a moins d\'1h';
                  if (hours < 24) return `Il y a ${hours}h`;
                  if (hours < 48) return 'Hier';
                  if (hours < 168) return `Il y a ${Math.floor(hours / 24)} jours`;
                  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Bouton favori */}
        <button
          onClick={handleFavoriteClick}
          className={`favorite-button p-2 -m-1 rounded-lg flex-shrink-0 transition-colors ${isHovered || isFavorite ? 'opacity-100' : 'opacity-70 hover:opacity-100'
            } hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          <Star
            size={14}
            className={isFavorite ? "text-yellow-500 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"}
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </button>
      </div>
    </motion.div>
  );
};

// Memo avec comparateur personnalisé pour optimiser les re-renders
export const PageCard = memo(PageCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.page.id === nextProps.page.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.multiSelectMode === nextProps.multiSelectMode &&
    prevProps.page.title === nextProps.page.title &&
    prevProps.page.last_edited_time === nextProps.page.last_edited_time
  );
});