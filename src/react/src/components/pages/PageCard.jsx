import React, { memo } from 'react';
import { Star, FileText } from 'lucide-react';
import { getPageIcon } from '../../utils/helpers';

function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, multiSelectMode }) {
  return (
    <div 
      className={`page-item ${isSelected ? 'selected' : ''}`}
      onClick={() => !multiSelectMode && onClick(page)}
    >
      {multiSelectMode && (
        <input
          type="checkbox"
          className="page-checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onClick(page);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      <div className="page-icon">
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
      
      <div className="page-content">
        <span className="page-title">{page.title || 'Sans titre'}</span>
        {page.type === 'database' && (
          <span className="page-type-badge database">Database</span>
        )}
        {page.parent_title && (
          <span className="text-xs text-notion-gray-500 truncate block">
            {page.parent_title}
          </span>
        )}
      </div>
      
      <div className={`page-actions ${isFavorite ? 'visible' : ''}`}>
        <button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(page.id);
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>
      </div>
    </div>
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