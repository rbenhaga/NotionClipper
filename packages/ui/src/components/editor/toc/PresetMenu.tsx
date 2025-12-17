/**
 * PresetMenu - Dropdown menu for TOC preset management
 * 
 * Provides a dropdown menu for loading, saving, and managing TOC presets.
 * Includes preset list, save dialog, delete confirmation, and export/import buttons.
 * 
 * @module PresetMenu
 * 
 * Requirements: 14.1, 14.2, 14.5, 15.1, 15.3
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  BookmarkPlus,
  ChevronDown,
  Clock,
  Download,
  FileText,
  MoreHorizontal,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';
import type { TOCPreset, PageSectionSelection } from '@notion-clipper/core-shared';

/**
 * Props for the PresetMenu component
 */
export interface PresetMenuProps {
  /** List of saved presets */
  presets: TOCPreset[];
  /** Current selections (for saving) */
  currentSelections: Map<string, PageSectionSelection>;
  /** Callback when a preset is selected to apply */
  onApplyPreset: (presetId: string) => void;
  /** Callback when saving a new preset */
  onSavePreset: (name: string) => void;
  /** Callback when deleting a preset */
  onDeletePreset: (presetId: string) => void;
  /** Callback when exporting configuration */
  onExport: () => void;
  /** Callback when importing configuration */
  onImport: () => void;
  /** Whether presets are loading */
  loading?: boolean;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Format a timestamp to a readable date string
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}


/**
 * Save Preset Dialog component
 */
interface SavePresetDialogProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
  existingNames: string[];
}

const SavePresetDialog: React.FC<SavePresetDialogProps> = ({
  isOpen,
  onSave,
  onClose,
  existingNames,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Please enter a preset name');
      return;
    }

    if (existingNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A preset with this name already exists');
      return;
    }

    onSave(trimmedName);
    onClose();
  }, [name, existingNames, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Save size={16} strokeWidth={2} className="text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Save Preset
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Preset Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Meeting Notes Template"
              className={`
                w-full px-3 py-2 text-sm rounded-lg border transition-colors
                bg-white dark:bg-gray-700
                text-gray-800 dark:text-gray-200
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                ${error 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-200 dark:border-gray-600'
                }
              `}
              maxLength={50}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                ${name.trim()
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Save size={12} strokeWidth={2} />
              Save
            </button>
          </div>
        </form>
      </MotionDiv>
    </div>
  );
};


/**
 * Delete Confirmation Dialog component
 */
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  presetName: string;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  presetName,
  onConfirm,
  onClose,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Trash2 size={16} strokeWidth={2} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Delete Preset
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the preset{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              "{presetName}"
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                       bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <Trash2 size={12} strokeWidth={2} />
            Delete
          </button>
        </div>
      </MotionDiv>
    </div>
  );
};


/**
 * PresetMenu component for managing TOC presets
 * 
 * Features:
 * - Dropdown menu with saved presets (Req 14.2)
 * - Save Preset button with name input dialog (Req 14.1)
 * - Delete preset with confirmation (Req 14.5)
 * - Export/Import buttons (Req 15.1, 15.3)
 * 
 * @example
 * ```tsx
 * <PresetMenu
 *   presets={presets}
 *   currentSelections={tocState.selections}
 *   onApplyPreset={(id) => applyPreset(id)}
 *   onSavePreset={(name) => savePreset(name)}
 *   onDeletePreset={(id) => deletePreset(id)}
 *   onExport={() => exportConfig()}
 *   onImport={() => importConfig()}
 * />
 * ```
 */
export function PresetMenu({
  presets,
  currentSelections,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onExport,
  onImport,
  loading = false,
  className = '',
}: PresetMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [deletePreset, setDeletePreset] = useState<TOCPreset | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleApplyPreset = useCallback((presetId: string) => {
    onApplyPreset(presetId);
    setIsOpen(false);
  }, [onApplyPreset]);

  const handleSaveClick = useCallback(() => {
    setShowSaveDialog(true);
    setIsOpen(false);
  }, []);

  const handleDeleteClick = useCallback((preset: TOCPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletePreset(preset);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletePreset) {
      onDeletePreset(deletePreset.id);
    }
  }, [deletePreset, onDeletePreset]);

  const handleExport = useCallback(() => {
    onExport();
    setIsOpen(false);
  }, [onExport]);

  const handleImport = useCallback(() => {
    onImport();
    setIsOpen(false);
  }, [onImport]);

  const existingNames = presets.map((p) => p.name);
  const hasSelections = currentSelections.size > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={loading}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
          dark:focus:ring-offset-gray-800
          ${isOpen
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50 border border-gray-200/50 dark:border-gray-600/30'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Preset menu"
      >
        <BookmarkPlus size={14} strokeWidth={2} />
        <span>Presets</span>
        <ChevronDown 
          size={12} 
          strokeWidth={2} 
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            ref={menuRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl 
                       shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            role="menu"
          >
            {/* Save Preset button (Req 14.1) */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700/50">
              <button
                onClick={handleSaveClick}
                disabled={!hasSelections}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg
                  transition-colors
                  ${hasSelections
                    ? 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }
                `}
                role="menuitem"
              >
                <Save size={14} strokeWidth={2} />
                <span>Save Current as Preset</span>
              </button>
            </div>

            {/* Preset list (Req 14.2) */}
            <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {presets.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <BookmarkPlus 
                    size={24} 
                    strokeWidth={1.5} 
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-2" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No saved presets
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Save your current selections as a preset
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="group flex items-center gap-2 px-2 py-2 rounded-lg
                                 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => handleApplyPreset(preset.id)}
                      role="menuitem"
                    >
                      <FileText 
                        size={14} 
                        strokeWidth={2} 
                        className="flex-shrink-0 text-gray-400 dark:text-gray-500" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={10} strokeWidth={2} />
                          {formatDate(preset.updatedAt)}
                          <span className="mx-1">•</span>
                          {preset.pageSelections.length} pages
                        </p>
                      </div>
                      {/* Delete button (Req 14.5) */}
                      <button
                        onClick={(e) => handleDeleteClick(preset, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md
                                   text-gray-400 hover:text-red-500 dark:hover:text-red-400
                                   hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                        aria-label={`Delete preset ${preset.name}`}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export/Import buttons (Req 15.1, 15.3) */}
            <div className="p-2 border-t border-gray-100 dark:border-gray-700/50 flex gap-1">
              <button
                onClick={handleExport}
                disabled={!hasSelections}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium rounded-lg
                  transition-colors
                  ${hasSelections
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }
                `}
                role="menuitem"
              >
                <Download size={12} strokeWidth={2} />
                Export
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium rounded-lg
                           text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                role="menuitem"
              >
                <Upload size={12} strokeWidth={2} />
                Import
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Save Preset Dialog (Req 14.1) */}
      <AnimatePresence>
        {showSaveDialog && (
          <SavePresetDialog
            isOpen={showSaveDialog}
            onSave={onSavePreset}
            onClose={() => setShowSaveDialog(false)}
            existingNames={existingNames}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog (Req 14.5) */}
      <AnimatePresence>
        {deletePreset && (
          <DeleteConfirmDialog
            isOpen={!!deletePreset}
            presetName={deletePreset.name}
            onConfirm={handleConfirmDelete}
            onClose={() => setDeletePreset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PresetMenu;
