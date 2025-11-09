// PageCard.tsx - Design System Notion/Apple ultra épuré
import { memo, useState } from 'react';
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
    <div
      className={`
        relative rounded-xl cursor-pointer transition-all duration-200
        h-16 flex items-center group
        ${isSelected
          ? 'bg-gray-50 dark:bg-gray-800/50 border-2 border-purple-500 dark:border-purple-400' 
          : 'bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center px-4 w-full h-full">
        {/* Icône minimaliste */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          {(() => {
            const icon = getPageIcon(page);
            if (icon.type === 'emoji') {
              return <span className="text-base leading-none">{icon.value}</span>;
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
            return <FileText size={16} className="text-gray-400 dark:text-gray-500" strokeWidth={2} />;
          })()}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`text-[14px] font-medium truncate ${
                isSelected 
                  ? 'text-gray-900 dark:text-gray-100' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}
              title={page.title || 'Sans titre'}
            >
              {page.title || 'Sans titre'}
            </h3>

            {/* Badges ultra subtils */}
            {(page.type === 'database' || page.type === 'data_source') && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium flex-shrink-0 flex items-center gap-1">
                <Database size={9} strokeWidth={2} />
                DB
              </span>
            )}

            {(page.parent?.type === 'database_id' || page.parent?.type === 'data_source_id') &&
              page.type !== 'database' && page.type !== 'data_source' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium flex-shrink-0 flex items-center gap-1">
                  <Database size={8} strokeWidth={2} />
                  Link
                </span>
              )}
          </div>

          {/* Métadonnées minimalistes */}
          <div className="flex items-center gap-2">
            {page.parent_title && (
              <p
                className="text-[12px] truncate text-gray-500 dark:text-gray-400"
                title={page.parent_title}
              >
                {page.parent_title}
              </p>
            )}
            {page.parent_title && page.last_edited_time && (
              <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
            )}
            {page.last_edited_time && (
              <p
                className="text-[12px] text-gray-400 dark:text-gray-500 flex-shrink-0"
                title={`Dernière modification: ${new Date(page.last_edited_time).toLocaleString('fr-FR')}`}
              >
                {(() => {
                  const date = new Date(page.last_edited_time);
                  const now = new Date();
                  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

                  if (hours < 1) return 'maintenant';
                  if (hours < 24) return `${hours}h`;
                  if (hours < 48) return 'hier';
                  if (hours < 168) return `${Math.floor(hours / 24)}j`;
                  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Bouton favori ultra subtil */}
        <button
          onClick={handleFavoriteClick}
          className={`favorite-button p-1.5 rounded-lg flex-shrink-0 transition-all duration-200 ${
            isFavorite 
              ? 'opacity-100 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
              : isHovered 
                ? 'opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700' 
                : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Star
            size={14}
            className={isFavorite ? "text-yellow-500 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"}
            fill={isFavorite ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
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