// PageCard.tsx - Redesign ultra premium Notion/Apple
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, FileText, Database } from 'lucide-react';
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
    onClick(page, e);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (page?.id) {
      onToggleFavorite(page.id);
    }
  };

  return (
    <motion.div
      className={`
        relative rounded-xl cursor-pointer transition-all duration-200
        h-[72px] flex items-center group
        ${isSelected
          ? 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-700/50 shadow-sm'
          : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient subtil au hover */}
      {isHovered && !isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
      )}

      <div className="flex items-center px-4 w-full h-full relative z-10">
        {/* Icône avec background */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
          {(() => {
            const icon = getPageIcon(page);
            if (icon.type === 'emoji') {
              return <span className="text-lg leading-none">{icon.value}</span>;
            }
            if (icon.type === 'url') {
              return (
                <img
                  src={icon.value}
                  alt=""
                  className="w-5 h-5 rounded object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              );
            }
            return <FileText size={18} className="text-gray-400 dark:text-gray-500" strokeWidth={2} />;
          })()}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`text-[14px] font-medium truncate ${
                isSelected 
                  ? 'text-purple-900 dark:text-purple-200' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}
              title={page.title || 'Sans titre'}
            >
              {page.title || 'Sans titre'}
            </h3>

            {/* Badges avec couleurs */}
            {(page.type === 'database' || page.type === 'data_source') && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-medium flex-shrink-0 flex items-center gap-1 shadow-sm">
                <Database size={10} strokeWidth={2.5} />
                DB
              </span>
            )}

            {(page.parent?.type === 'database_id' || page.parent?.type === 'data_source_id') &&
              page.type !== 'database' && page.type !== 'data_source' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium flex-shrink-0 flex items-center gap-1 shadow-sm">
                  <Database size={8} strokeWidth={2.5} />
                  Link
                </span>
              )}
          </div>

          {/* Métadonnées */}
          <div className="flex items-center gap-2">
            {page.parent_title && (
              <p
                className={`text-[12px] truncate ${
                  isSelected 
                    ? 'text-purple-700 dark:text-purple-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                title={page.parent_title}
              >
                {page.parent_title}
              </p>
            )}
            {page.parent_title && page.last_edited_time && (
              <span className="text-gray-300 dark:text-gray-600">•</span>
            )}
            {page.last_edited_time && (
              <p
                className={`text-[12px] ${
                  isSelected 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-gray-400 dark:text-gray-500'
                } flex-shrink-0`}
                title={`Dernière modification: ${new Date(page.last_edited_time).toLocaleString('fr-FR')}`}
              >
                {(() => {
                  const date = new Date(page.last_edited_time);
                  const now = new Date();
                  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

                  if (hours < 1) return 'À l\'instant';
                  if (hours < 24) return `${hours}h`;
                  if (hours < 48) return 'Hier';
                  if (hours < 168) return `${Math.floor(hours / 24)}j`;
                  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Bouton favori */}
        <button
          onClick={handleFavoriteClick}
          className={`favorite-button p-2 rounded-lg flex-shrink-0 transition-all duration-200 ${
            isFavorite 
              ? 'opacity-100 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
              : isHovered 
                ? 'opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700' 
                : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Star
            size={16}
            className={isFavorite ? "text-yellow-500 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"}
            fill={isFavorite ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>
      </div>
    </motion.div>
  );
};

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