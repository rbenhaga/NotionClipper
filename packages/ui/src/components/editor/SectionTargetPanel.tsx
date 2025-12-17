/**
 * 🎯 SectionTargetPanel - Panel ancré pour sélection de section
 * Design: Panel à droite, pas de modal flottante
 * Règle: Un seul scroll (le panel), pas de scroll imbriqué
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { 
  X, 
  ChevronRight, 
  ChevronDown,
  FileText,
  Hash,
  Loader2
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

interface Section {
  blockId: string;
  headingText: string;
  level: number; // 1, 2, 3 pour h1, h2, h3
  children?: Section[];
}

interface SectionTargetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle: string;
  selectedSection?: { blockId: string; headingText: string } | null;
  onSectionSelect: (blockId: string, headingText: string) => void;
  onClearSection: () => void;
}

export function SectionTargetPanel({
  isOpen,
  onClose,
  pageId,
  pageTitle,
  selectedSection,
  onSectionSelect,
  onClearSection
}: SectionTargetPanelProps) {
  const { t } = useTranslation();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Fetch sections from page
  const fetchSections = useCallback(async () => {
    if (!pageId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // @ts-ignore - Electron API
      const result = await window.electronAPI?.getPageSections?.(pageId);
      if (result?.sections) {
        setSections(result.sections);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('[SectionTargetPanel] Error fetching sections:', err);
      setError(t('common.errorLoadingSections'));
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [pageId, t]);

  useEffect(() => {
    if (isOpen && pageId) {
      fetchSections();
    }
  }, [isOpen, pageId, fetchSections]);

  const toggleExpanded = (blockId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const handleSelect = (blockId: string, headingText: string) => {
    onSectionSelect(blockId, headingText);
  };

  const renderSection = (section: Section, depth: number = 0) => {
    const isSelected = selectedSection?.blockId === section.blockId;
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = expandedSections.has(section.blockId);
    
    return (
      <div key={section.blockId}>
        <button
          onClick={() => handleSelect(section.blockId, section.headingText)}
          className={`
            w-full flex items-center gap-2 px-3 py-2 text-left text-sm
            rounded-lg transition-all duration-150
            ${isSelected 
              ? 'bg-[var(--ds-primary-subtle)] text-[var(--ds-primary)]' 
              : 'hover:bg-[var(--ds-bg-muted)] text-[var(--ds-fg)]'
            }
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {/* Expand/collapse for nested */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(section.blockId);
              }}
              className="p-0.5 hover:bg-[var(--ds-bg-muted)] rounded"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-[var(--ds-fg-subtle)]" />
              ) : (
                <ChevronRight size={14} className="text-[var(--ds-fg-subtle)]" />
              )}
            </button>
          )}
          
          {/* Heading icon based on level */}
          <Hash 
            size={14} 
            className={isSelected ? 'text-[var(--ds-primary)]' : 'text-[var(--ds-fg-subtle)]'} 
          />
          
          {/* Heading text */}
          <span className="truncate flex-1 font-medium">
            {section.headingText || t('common.untitled')}
          </span>
          
          {/* Level indicator */}
          <span className="text-[10px] text-[var(--ds-fg-subtle)] font-mono">
            H{section.level}
          </span>
        </button>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {section.children!.map(child => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="ds-panel ds-panel-md flex-shrink-0 overflow-hidden"
        >
          {/* Header */}
          <div className="ds-panel-header">
            <div className="flex-1 min-w-0">
              <h3 className="ds-panel-title truncate">
                {t('common.selectSection')}
              </h3>
              <p className="text-[11px] text-[var(--ds-fg-subtle)] truncate mt-0.5">
                {pageTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Content - Single scroll zone */}
          <div className="ds-panel-content ds-scrollbar">
            {/* Selected section indicator */}
            {selectedSection && (
              <div className="mb-4 p-3 bg-[var(--ds-primary-subtle)] rounded-lg border border-[var(--ds-primary)]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash size={14} className="text-[var(--ds-primary)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--ds-primary)] truncate">
                      {selectedSection.headingText}
                    </span>
                  </div>
                  <button
                    onClick={onClearSection}
                    className="text-[var(--ds-primary)] hover:text-[var(--ds-primary-hover)] text-xs font-medium"
                  >
                    {t('common.clear')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--ds-primary)] mb-3" />
                <p className="text-sm text-[var(--ds-fg-muted)]">
                  {t('common.loadingSections')}
                </p>
              </div>
            )}
            
            {/* Error state */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--ds-error-subtle)] flex items-center justify-center mb-3">
                  <X size={20} className="text-[var(--ds-error)]" />
                </div>
                <p className="text-sm text-[var(--ds-fg-muted)]">{error}</p>
                <button
                  onClick={fetchSections}
                  className="ds-btn ds-btn-secondary ds-btn-sm mt-4"
                >
                  {t('common.retry')}
                </button>
              </div>
            )}
            
            {/* Empty state */}
            {!loading && !error && sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--ds-bg-muted)] flex items-center justify-center mb-3">
                  <FileText size={20} className="text-[var(--ds-fg-subtle)]" />
                </div>
                <p className="text-sm text-[var(--ds-fg-muted)]">
                  {t('common.noSectionsFound')}
                </p>
                <p className="text-xs text-[var(--ds-fg-subtle)] mt-1">
                  {t('common.addHeadingsToPage')}
                </p>
              </div>
            )}
            
            {/* Sections list */}
            {!loading && !error && sections.length > 0 && (
              <div className="space-y-1">
                {/* Option: Insert at top */}
                <button
                  onClick={() => handleSelect('', t('common.topOfPage'))}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                    rounded-lg transition-all duration-150
                    ${!selectedSection 
                      ? 'bg-[var(--ds-primary-subtle)] text-[var(--ds-primary)]' 
                      : 'hover:bg-[var(--ds-bg-muted)] text-[var(--ds-fg)]'
                    }
                  `}
                >
                  <FileText size={14} className={!selectedSection ? 'text-[var(--ds-primary)]' : 'text-[var(--ds-fg-subtle)]'} />
                  <span className="font-medium">{t('common.topOfPage')}</span>
                </button>
                
                {/* Sections */}
                {sections.map(section => renderSection(section))}
              </div>
            )}
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
