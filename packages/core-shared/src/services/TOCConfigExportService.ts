/**
 * TOC Configuration Export/Import Service
 * 
 * Handles exporting and importing TOC configurations for sharing between users.
 * Supports version validation and synonym merging on import.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import type { 
  TOCExportConfig, 
  PageSectionSelection 
} from '../types/toc.types';

/** Current configuration version */
export const TOC_CONFIG_VERSION = '1.0.0';

/** Minimum supported version for import */
export const TOC_CONFIG_MIN_VERSION = '1.0.0';

/** Maximum supported version for import */
export const TOC_CONFIG_MAX_VERSION = '1.0.0';

/** Result of importing a configuration */
export interface ImportConfigResult {
  /** Whether the import was successful */
  success: boolean;
  /** Imported selections (if successful) */
  selections?: PageSectionSelection[];
  /** Merged custom synonyms (if successful) */
  mergedSynonyms?: Record<string, string[]>;
  /** Error message (if failed) */
  error?: string;
  /** Version compatibility info */
  versionInfo?: {
    importedVersion: string;
    currentVersion: string;
    isCompatible: boolean;
  };
}

/** Options for exporting configuration */
export interface ExportConfigOptions {
  /** Include custom synonyms in export */
  includeCustomSynonyms?: boolean;
}

/**
 * Parse a semantic version string into components
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);
  
  if (!parsed1 || !parsed2) return 0;
  
  if (parsed1.major !== parsed2.major) {
    return parsed1.major < parsed2.major ? -1 : 1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor < parsed2.minor ? -1 : 1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch < parsed2.patch ? -1 : 1;
  }
  return 0;
}

/**
 * Check if a version is within the supported range
 */
function isVersionCompatible(version: string): boolean {
  const minCompare = compareVersions(version, TOC_CONFIG_MIN_VERSION);
  const maxCompare = compareVersions(version, TOC_CONFIG_MAX_VERSION);
  
  return minCompare >= 0 && maxCompare <= 0;
}

/**
 * Validate that an object is a valid PageSectionSelection
 */
function isValidSelection(obj: unknown): obj is PageSectionSelection {
  if (!obj || typeof obj !== 'object') return false;
  
  const sel = obj as Record<string, unknown>;
  
  return (
    typeof sel.pageId === 'string' &&
    typeof sel.pageTitle === 'string' &&
    (sel.blockId === null || typeof sel.blockId === 'string') &&
    (sel.headingText === null || typeof sel.headingText === 'string') &&
    (sel.headingLevel === null || [1, 2, 3].includes(sel.headingLevel as number)) &&
    typeof sel.confidence === 'number'
  );
}

/**
 * Validate that an object is a valid TOCExportConfig
 */
function isValidExportConfig(obj: unknown): obj is TOCExportConfig {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  // Check required fields
  if (typeof config.version !== 'string') return false;
  if (typeof config.exportedAt !== 'number') return false;
  if (!Array.isArray(config.selections)) return false;
  
  // Validate all selections
  for (const sel of config.selections) {
    if (!isValidSelection(sel)) return false;
  }
  
  // Validate customSynonyms if present
  if (config.customSynonyms !== undefined) {
    if (typeof config.customSynonyms !== 'object' || config.customSynonyms === null) {
      return false;
    }
    
    const synonyms = config.customSynonyms as Record<string, unknown>;
    for (const [key, value] of Object.entries(synonyms)) {
      if (typeof key !== 'string') return false;
      if (!Array.isArray(value)) return false;
      if (!value.every(v => typeof v === 'string')) return false;
    }
  }
  
  return true;
}

/**
 * Merge custom synonyms from import with existing dictionary
 * 
 * Requirements: 15.5
 * 
 * @param existing - Existing synonym dictionary
 * @param imported - Imported custom synonyms
 * @returns Merged synonym dictionary
 */
export function mergeSynonyms(
  existing: Record<string, string[]>,
  imported: Record<string, string[]>
): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...existing };
  
  for (const [key, values] of Object.entries(imported)) {
    const normalizedKey = key.toLowerCase().trim();
    
    if (merged[normalizedKey]) {
      // Merge values, avoiding duplicates
      const existingSet = new Set(merged[normalizedKey].map(v => v.toLowerCase()));
      const newValues = values.filter(v => !existingSet.has(v.toLowerCase()));
      merged[normalizedKey] = [...merged[normalizedKey], ...newValues];
    } else {
      // Add new synonym group
      merged[normalizedKey] = [...values];
    }
  }
  
  return merged;
}

/**
 * Export current TOC configuration to a JSON object
 * 
 * Requirements: 15.1, 15.2
 * 
 * @param selections - Current page selections
 * @param customSynonyms - Optional custom synonyms to include
 * @param options - Export options
 * @returns TOCExportConfig object
 */
export function exportConfig(
  selections: Map<string, PageSectionSelection> | PageSectionSelection[],
  customSynonyms?: Record<string, string[]>,
  options: ExportConfigOptions = {}
): TOCExportConfig {
  const { includeCustomSynonyms = true } = options;
  
  // Convert Map to array if needed
  const selectionsArray = selections instanceof Map 
    ? Array.from(selections.values())
    : selections;
  
  const config: TOCExportConfig = {
    version: TOC_CONFIG_VERSION,
    exportedAt: Date.now(),
    selections: selectionsArray.map(sel => ({
      pageId: sel.pageId,
      pageTitle: sel.pageTitle,
      blockId: sel.blockId,
      headingText: sel.headingText,
      headingLevel: sel.headingLevel,
      confidence: sel.confidence,
    })),
  };
  
  if (includeCustomSynonyms && customSynonyms && Object.keys(customSynonyms).length > 0) {
    config.customSynonyms = customSynonyms;
  }
  
  return config;
}

/**
 * Export configuration to a JSON string
 * 
 * @param selections - Current page selections
 * @param customSynonyms - Optional custom synonyms to include
 * @param options - Export options
 * @returns JSON string of the configuration
 */
export function exportConfigToJson(
  selections: Map<string, PageSectionSelection> | PageSectionSelection[],
  customSynonyms?: Record<string, string[]>,
  options: ExportConfigOptions = {}
): string {
  const config = exportConfig(selections, customSynonyms, options);
  return JSON.stringify(config, null, 2);
}

/**
 * Import TOC configuration from a JSON object or string
 * 
 * Requirements: 15.3, 15.4, 15.5
 * 
 * @param configInput - Configuration object or JSON string
 * @param existingSynonyms - Existing synonym dictionary to merge with
 * @returns Import result with selections and merged synonyms
 */
export function importConfig(
  configInput: unknown,
  existingSynonyms: Record<string, string[]> = {}
): ImportConfigResult {
  // Parse JSON string if needed
  let config: unknown;
  
  if (typeof configInput === 'string') {
    try {
      config = JSON.parse(configInput);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON format. Please provide a valid configuration file.',
      };
    }
  } else {
    config = configInput;
  }
  
  // Validate structure
  if (!isValidExportConfig(config)) {
    return {
      success: false,
      error: 'Invalid configuration format. The file does not contain valid TOC configuration data.',
    };
  }
  
  // Check version compatibility
  const isCompatible = isVersionCompatible(config.version);
  const versionInfo = {
    importedVersion: config.version,
    currentVersion: TOC_CONFIG_VERSION,
    isCompatible,
  };
  
  if (!isCompatible) {
    return {
      success: false,
      error: `Incompatible configuration version. Imported version: ${config.version}. Supported versions: ${TOC_CONFIG_MIN_VERSION} to ${TOC_CONFIG_MAX_VERSION}.`,
      versionInfo,
    };
  }
  
  // Merge custom synonyms if present
  let mergedSynonyms = existingSynonyms;
  if (config.customSynonyms) {
    mergedSynonyms = mergeSynonyms(existingSynonyms, config.customSynonyms);
  }
  
  return {
    success: true,
    selections: config.selections,
    mergedSynonyms,
    versionInfo,
  };
}

/**
 * Create a downloadable blob from configuration
 * 
 * @param selections - Current page selections
 * @param customSynonyms - Optional custom synonyms to include
 * @returns Blob containing the JSON configuration
 */
export function createConfigBlob(
  selections: Map<string, PageSectionSelection> | PageSectionSelection[],
  customSynonyms?: Record<string, string[]>
): Blob {
  const jsonString = exportConfigToJson(selections, customSynonyms);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Generate a filename for the exported configuration
 * 
 * @param prefix - Optional prefix for the filename
 * @returns Filename with timestamp
 */
export function generateExportFilename(prefix: string = 'toc-config'): string {
  const date = new Date();
  const timestamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${timestamp}.json`;
}
