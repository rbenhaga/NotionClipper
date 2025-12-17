/**
 * PageCard - Design System Notion/Apple
 * Sélection style Notion: fond teinté + trait gauche
 * Support densité: comfortable (64px) / compact (44px)
 */

import { memo, useState } from 'react';
import { Star, FileText, Database } from 'lucide-react';
import { getPageIcon } from '../../utils/helpers';
import { useTranslation } from '@notion-clipper/i18n';
import { useDensityOptional } from '../../contexts/DensityContext';

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
  const { t, locale } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const densityContext = useDensityOptional();
  const isCompact = densityContext?.isCompact ?? false;

  // Map i18n locale to BCP-47 locale format
  const dateLocale = locale === 'en' ? 'en-US' :
                     locale === 'fr' ? 'fr-FR' :
                     locale === 'es' ? 'es-ES' :
                     locale === 'de' ? 'de-DE' :
                     locale === 'pt' ? 'pt-BR' :
                     locale === 'ja' ? 'ja-JP' :
                     locale === 'ko' ? 'ko-KR' : 'en-US';

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

  // Format relative time
  const getRelativeTime = () => {
    if (!page.last_edited_time) return null;
    const date = new Date(page.last_edited_time);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (hours < 1) return t('common.now');
    if (hours < 24) return `${hours}h`;
    if (hours < 48) return t('common.yesterday');
    if (hours < 168) return `${Math.floor(hours / 24)}j`;
    return date.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={`
        ds-list-item group
        ${isCompact ? 'density-compact' : ''}
        ${isSelected ? 'is-selected' : ''}
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(page);
        }
      }}
    >
      {/* Icône */}
      <div className={`
        flex-shrink-0 flex items-center justify-center rounded-lg border transition-all
        ${isCompact ? 'w-7 h-7 mr-2.5' : 'w-8 h-8 mr-3'}
        ${isSelected 
          ? 'bg-[var(--ds-primary-subtle)] border-[var(--ds-primary)]/20' 
          : 'bg-[var(--ds-bg-muted)] border-[var(--ds-border-subtle)] group-hover:bg-[var(--ds-primary-subtle)] group-hover:border-[var(--ds-primary)]/10'
        }
      `}>
        {(() => {
          const icon = getPageIcon(page);
          if (icon.type === 'emoji') {
            return <span className={isCompact ? 'text-sm' : 'text-base'}>{icon.value}</span>;
          }
          if (icon.type === 'url') {
            return (
              <img
                src={icon.value}
                alt=""
                className={`rounded object-cover ${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            );
          }
          return <FileText size={isCompact ? 14 : 16} className="text-[var(--ds-fg-subtle)]" strokeWidth={2} />;
        })()}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={`font-medium truncate text-[var(--ds-fg)] ${isCompact ? 'text-[13px]' : 'text-[14px]'}`}
            title={page.title || t('common.untitled')}
          >
            {page.title || t('common.untitled')}
          </h3>

          {/* Badges */}
          {(page.type === 'database' || page.type === 'data_source') && (
            <span className="ds-badge ds-badge-primary flex-shrink-0">
              <Database size={8} strokeWidth={2.5} />
              DB
            </span>
          )}

          {(page.parent?.type === 'database_id' || page.parent?.type === 'data_source_id') &&
            page.type !== 'database' && page.type !== 'data_source' && (
              <span className="ds-badge ds-badge-success flex-shrink-0">
                <Database size={8} strokeWidth={2.5} />
                Link
              </span>
            )}
        </div>

        {/* Métadonnées - masquées en mode compact */}
        {!isCompact && (
          <div className="flex items-center gap-2 mt-0.5">
            {page.parent_title && (
              <p
                className="text-[12px] truncate text-[var(--ds-fg-muted)]"
                title={page.parent_title}
              >
                {page.parent_title}
              </p>
            )}
            {page.parent_title && page.last_edited_time && (
              <span className="text-[var(--ds-fg-subtle)] text-[10px]">•</span>
            )}
            {page.last_edited_time && (
              <p
                className="text-[12px] text-[var(--ds-fg-subtle)] flex-shrink-0"
                title={`${t('common.lastModified')}: ${new Date(page.last_edited_time).toLocaleString(dateLocale)}`}
              >
                {getRelativeTime()}
              </p>
            )}
          </div>
        )}

        {/* En mode compact: timestamp en tooltip via title */}
        {isCompact && page.last_edited_time && (
          <p
            className="text-[11px] text-[var(--ds-fg-subtle)] truncate"
            title={`${page.parent_title ? page.parent_title + ' • ' : ''}${t('common.lastModified')}: ${new Date(page.last_edited_time).toLocaleString(dateLocale)}`}
          >
            {page.parent_title || getRelativeTime()}
          </p>
        )}
      </div>

      {/* Bouton favori */}
      <button
        onClick={handleFavoriteClick}
        className={`
          favorite-button flex-shrink-0 rounded-md transition-all
          ${isCompact ? 'p-1' : 'p-1.5'}
          ${isFavorite 
            ? 'opacity-100 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' 
            : isHovered 
              ? 'opacity-100 hover:bg-[var(--ds-primary-subtle)]' 
              : 'opacity-0 group-hover:opacity-100'
          }
        `}
        aria-label={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
      >
        <Star
          size={isCompact ? 12 : 14}
          className={isFavorite ? "text-amber-500 dark:text-amber-400" : "text-[var(--ds-fg-subtle)] group-hover:text-[var(--ds-primary)]"}
          fill={isFavorite ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      </button>
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
