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
  };
  onClick: (page: any) => void;
  isFavorite: boolean;
  onToggleFavorite: (pageId: string) => void;
  isSelected: boolean;
  multiSelectMode?: boolean;
}

export const PageCard = memo(function PageCard({ 
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
    onClick(page);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(page.id);
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
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center p-3">
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

        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-3">
          {(() => {
            const icon = getPageIcon(page);
            if (icon.type === 'emoji') {
              return <span className="text-sm leading-none">{icon.value}</span>;
            }
            if (icon.type === 'url') {
              return <img src={icon.value} alt="" className="w-4 h-4 rounded object-cover" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />;
            }
            return <FileText size={14} className="text-gray-400" />;
          })()}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium truncate flex items-center gap-2 ${
            isSelected ? 'text-blue-700' : 'text-gray-900'
          }`}>
            {page.title || 'Sans titre'}
            {page.type === 'database' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                <Database size={10} className="mr-0.5" />
                DB
              </span>
            )}
          </h3>
        </div>

        <button
          onClick={handleFavoriteClick}
          className="favorite-button flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors ml-2"
        >
          <Star
            size={14}
            className={`transition-all ${
              isFavorite
                ? 'text-yellow-500 fill-yellow-500'
                : isHovered
                  ? 'text-gray-500'
                  : 'text-gray-400'
            }`}
          />
        </button>
      </div>
    </motion.div>
  );
});