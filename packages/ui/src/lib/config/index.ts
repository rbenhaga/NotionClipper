// packages/ui/src/lib/config/index.ts
// 🎯 Configuration management and defaults

import { ClipperConfig, ThemeMode } from '../types';

// ============================================
// DEFAULT CONFIGURATION
// ============================================
export const DEFAULT_CONFIG: Required<ClipperConfig> = {
  // Authentication
  notionToken: '',
  notionToken_encrypted: '',
  onboardingCompleted: false,
  
  // Workspace
  workspaceName: '',
  workspaceIcon: '',
  
  // UI Preferences
  theme: 'light' as ThemeMode,
  minimalistMode: false,
  sidebarCollapsed: false,
  
  // Window State
  windowState: {
    width: 1200,
    height: 800,
    isMaximized: false,
    isPinned: false,
  },
  
  // Behavior
  autoSend: false,
  clipboardMonitoring: true,
  notifications: true,
};

// ============================================
// CONFIGURATION SCHEMA
// ============================================
export const CONFIG_SCHEMA = {
  // Authentication
  notionToken: {
    type: 'string',
    required: false,
    sensitive: true,
  },
  notionToken_encrypted: {
    type: 'string',
    required: false,
    sensitive: true,
  },
  onboardingCompleted: {
    type: 'boolean',
    required: false,
    default: false,
  },
  
  // Workspace
  workspaceName: {
    type: 'string',
    required: false,
    maxLength: 100,
  },
  workspaceIcon: {
    type: 'string',
    required: false,
  },
  
  // UI Preferences
  theme: {
    type: 'string',
    required: false,
    enum: ['light', 'dark', 'system'],
    default: 'light',
  },
  minimalistMode: {
    type: 'boolean',
    required: false,
    default: false,
  },
  sidebarCollapsed: {
    type: 'boolean',
    required: false,
    default: false,
  },
  
  // Window State
  windowState: {
    type: 'object',
    required: false,
    properties: {
      width: { type: 'number', min: 400, max: 3840 },
      height: { type: 'number', min: 300, max: 2160 },
      x: { type: 'number' },
      y: { type: 'number' },
      isMaximized: { type: 'boolean' },
      isPinned: { type: 'boolean' },
    },
  },
  
  // Behavior
  autoSend: {
    type: 'boolean',
    required: false,
    default: false,
  },
  clipboardMonitoring: {
    type: 'boolean',
    required: false,
    default: true,
  },
  notifications: {
    type: 'boolean',
    required: false,
    default: true,
  },
} as const;

// ============================================
// CONFIGURATION UTILITIES
// ============================================
/**
 * Merges user config with defaults
 */
export function mergeWithDefaults(userConfig: Partial<ClipperConfig>): ClipperConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    windowState: {
      ...DEFAULT_CONFIG.windowState,
      ...userConfig.windowState,
    },
  };
}

/**
 * Validates configuration against schema
 */
export function validateConfig(config: Partial<ClipperConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  Object.entries(config).forEach(([key, value]) => {
    const schema = CONFIG_SCHEMA[key as keyof typeof CONFIG_SCHEMA];
    if (!schema) {
      errors.push(`Unknown configuration key: ${key}`);
      return;
    }

    // Type validation
    if (value !== undefined && value !== null) {
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (expectedType !== actualType) {
        errors.push(`${key}: Expected ${expectedType}, got ${actualType}`);
        return;
      }

      // Enum validation
      if ('enum' in schema && !schema.enum.includes(value as any)) {
        errors.push(`${key}: Must be one of ${schema.enum.join(', ')}`);
      }

      // String length validation
      if (expectedType === 'string' && 'maxLength' in schema) {
        if ((value as string).length > schema.maxLength) {
          errors.push(`${key}: Must be no more than ${schema.maxLength} characters`);
        }
      }

      // Number range validation
      if (typeof value === 'number') {
        const numSchema = schema as any;
        if ('min' in numSchema && typeof numSchema.min === 'number' && (value as number) < numSchema.min) {
          errors.push(`${key}: Must be at least ${numSchema.min}`);
        }
        if ('max' in numSchema && typeof numSchema.max === 'number' && (value as number) > numSchema.max) {
          errors.push(`${key}: Must be no more than ${numSchema.max}`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes configuration for logging (removes sensitive data)
 */
export function sanitizeConfig(config: ClipperConfig): Partial<ClipperConfig> {
  const sanitized = { ...config };

  Object.entries(CONFIG_SCHEMA).forEach(([key, schema]) => {
    if ('sensitive' in schema && schema.sensitive) {
      const value = sanitized[key as keyof ClipperConfig];
      if (value) {
        (sanitized as any)[key] = typeof value === 'string' && value.length > 0 ? '***' : value;
      }
    }
  });

  return sanitized;
}

/**
 * Gets configuration migration path
 */
export function getMigrationPath(fromVersion: string, toVersion: string): string[] {
  // This would contain migration steps between versions
  // For now, return empty array (no migrations needed)
  return [];
}

/**
 * Applies configuration migrations
 */
export function migrateConfig(
  config: any,
  fromVersion: string,
  toVersion: string
): ClipperConfig {
  const migrations = getMigrationPath(fromVersion, toVersion);
  
  let migratedConfig = { ...config };
  
  migrations.forEach(migration => {
    // Apply migration logic here
    console.log(`Applying migration: ${migration}`);
  });
  
  return mergeWithDefaults(migratedConfig);
}

// ============================================
// ENVIRONMENT DETECTION
// ============================================
export const ENVIRONMENT = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isElectron: typeof window !== 'undefined' && window.electronAPI !== undefined,
  isBrowser: typeof window !== 'undefined' && window.electronAPI === undefined,
} as const;

// ============================================
// FEATURE FLAGS
// ============================================
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: false,
  ENABLE_CRASH_REPORTING: ENVIRONMENT.isProduction,
  ENABLE_DEBUG_LOGS: ENVIRONMENT.isDevelopment,
  ENABLE_EXPERIMENTAL_FEATURES: ENVIRONMENT.isDevelopment,
  ENABLE_PERFORMANCE_MONITORING: ENVIRONMENT.isProduction,
} as const;