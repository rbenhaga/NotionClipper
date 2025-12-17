/**
 * TOC Preset Service
 * 
 * Manages saving, loading, and applying TOC presets for multi-page section selection.
 * Uses IStorage interface for persistence (electron-store in desktop app).
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import type { IStorage } from '../interfaces/storage.interface';
import type { 
  TOCPreset, 
  PageSectionSelection, 
  PageInfo 
} from '../types/toc.types';

/** Storage key for TOC presets */
const TOC_PRESETS_KEY = 'toc.presets';

/** Result of applying a preset */
export interface ApplyPresetResult {
  /** Successfully applied selections */
  appliedSelections: PageSectionSelection[];
  /** Pages that were skipped (not in current selection) */
  skippedPages: Array<{ pageId: string; pageTitle: string }>;
  /** Total pages in the preset */
  totalPresetPages: number;
  /** Pages that were matched and applied */
  matchedPagesCount: number;
}

/**
 * TOC Preset Service
 * 
 * Provides CRUD operations for TOC presets with storage abstraction.
 */
export class TOCPresetService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate a unique preset ID
   */
  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Save a new preset with the current selections
   * 
   * Requirements: 14.1
   * 
   * @param name - User-provided preset name
   * @param selections - Current page selections to save
   * @returns The created preset
   */
  async savePreset(
    name: string, 
    selections: Map<string, PageSectionSelection>
  ): Promise<TOCPreset> {
    const now = Date.now();
    
    const preset: TOCPreset = {
      id: this.generateId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      pageSelections: Array.from(selections.values()).map(sel => ({
        pageId: sel.pageId,
        pageTitle: sel.pageTitle,
        blockId: sel.blockId,
        headingText: sel.headingText,
      })),
    };

    // Load existing presets and add the new one
    const existingPresets = await this.loadPresets();
    existingPresets.push(preset);
    
    // Persist to storage
    await this.storage.set(TOC_PRESETS_KEY, existingPresets);
    
    return preset;
  }


  /**
   * Load all saved presets
   * 
   * Requirements: 14.2
   * 
   * @returns Array of all saved presets, sorted by updatedAt descending
   */
  async loadPresets(): Promise<TOCPreset[]> {
    const presets = await this.storage.get<TOCPreset[]>(TOC_PRESETS_KEY);
    
    if (!presets || !Array.isArray(presets)) {
      return [];
    }
    
    // Sort by updatedAt descending (most recent first)
    return presets.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get a single preset by ID
   * 
   * @param presetId - The preset ID to find
   * @returns The preset if found, null otherwise
   */
  async getPreset(presetId: string): Promise<TOCPreset | null> {
    const presets = await this.loadPresets();
    return presets.find(p => p.id === presetId) || null;
  }

  /**
   * Apply a preset to the current page selection
   * 
   * Requirements: 14.3, 14.4
   * 
   * Only applies selections for pages that are currently selected.
   * Pages in the preset that are not in the current selection are skipped.
   * 
   * @param presetId - The preset ID to apply
   * @param currentPages - Currently selected pages
   * @returns Result containing applied selections and skipped pages
   */
  async applyPreset(
    presetId: string, 
    currentPages: PageInfo[]
  ): Promise<ApplyPresetResult> {
    const preset = await this.getPreset(presetId);
    
    if (!preset) {
      return {
        appliedSelections: [],
        skippedPages: [],
        totalPresetPages: 0,
        matchedPagesCount: 0,
      };
    }

    const currentPageIds = new Set(currentPages.map(p => p.id));
    const appliedSelections: PageSectionSelection[] = [];
    const skippedPages: Array<{ pageId: string; pageTitle: string }> = [];

    for (const presetSelection of preset.pageSelections) {
      if (currentPageIds.has(presetSelection.pageId)) {
        // Page is in current selection - apply the preset selection
        appliedSelections.push({
          pageId: presetSelection.pageId,
          pageTitle: presetSelection.pageTitle,
          blockId: presetSelection.blockId,
          headingText: presetSelection.headingText,
          headingLevel: null, // Will be resolved when structure is loaded
          confidence: 100, // Preset selections have full confidence
        });
      } else {
        // Page not in current selection - skip it
        skippedPages.push({
          pageId: presetSelection.pageId,
          pageTitle: presetSelection.pageTitle,
        });
      }
    }

    return {
      appliedSelections,
      skippedPages,
      totalPresetPages: preset.pageSelections.length,
      matchedPagesCount: appliedSelections.length,
    };
  }

  /**
   * Update an existing preset
   * 
   * @param presetId - The preset ID to update
   * @param updates - Partial updates to apply
   * @returns The updated preset, or null if not found
   */
  async updatePreset(
    presetId: string, 
    updates: Partial<Pick<TOCPreset, 'name' | 'pageSelections'>>
  ): Promise<TOCPreset | null> {
    const presets = await this.loadPresets();
    const index = presets.findIndex(p => p.id === presetId);
    
    if (index === -1) {
      return null;
    }

    const updatedPreset: TOCPreset = {
      ...presets[index],
      ...updates,
      updatedAt: Date.now(),
    };

    presets[index] = updatedPreset;
    await this.storage.set(TOC_PRESETS_KEY, presets);
    
    return updatedPreset;
  }

  /**
   * Delete a preset
   * 
   * Requirements: 14.5
   * 
   * @param presetId - The preset ID to delete
   * @returns true if deleted, false if not found
   */
  async deletePreset(presetId: string): Promise<boolean> {
    const presets = await this.loadPresets();
    const initialLength = presets.length;
    
    const filteredPresets = presets.filter(p => p.id !== presetId);
    
    if (filteredPresets.length === initialLength) {
      return false; // Preset not found
    }

    await this.storage.set(TOC_PRESETS_KEY, filteredPresets);
    return true;
  }

  /**
   * Check if a preset name already exists
   * 
   * @param name - The name to check
   * @param excludeId - Optional preset ID to exclude from check (for updates)
   * @returns true if name exists
   */
  async presetNameExists(name: string, excludeId?: string): Promise<boolean> {
    const presets = await this.loadPresets();
    const normalizedName = name.trim().toLowerCase();
    
    return presets.some(
      p => p.name.toLowerCase() === normalizedName && p.id !== excludeId
    );
  }

  /**
   * Clear all presets
   * 
   * @returns Number of presets deleted
   */
  async clearAllPresets(): Promise<number> {
    const presets = await this.loadPresets();
    const count = presets.length;
    
    await this.storage.set(TOC_PRESETS_KEY, []);
    
    return count;
  }
}

/** Singleton instance - must be initialized with storage adapter */
let tocPresetServiceInstance: TOCPresetService | null = null;

/**
 * Initialize the TOC Preset Service with a storage adapter
 * 
 * @param storage - Storage adapter (e.g., ElectronStorageAdapter)
 * @returns The initialized service instance
 */
export function initializeTOCPresetService(storage: IStorage): TOCPresetService {
  tocPresetServiceInstance = new TOCPresetService(storage);
  return tocPresetServiceInstance;
}

/**
 * Get the TOC Preset Service instance
 * 
 * @throws Error if service not initialized
 * @returns The service instance
 */
export function getTOCPresetService(): TOCPresetService {
  if (!tocPresetServiceInstance) {
    throw new Error('TOCPresetService not initialized. Call initializeTOCPresetService first.');
  }
  return tocPresetServiceInstance;
}
