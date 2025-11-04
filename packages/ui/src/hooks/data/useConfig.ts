// packages/ui/src/hooks/data/useConfig.ts
// ✅ FIX: Correction des dépendances React pour éviter les boucles infinies
import { useState, useCallback, useRef, useEffect } from 'react';

interface Config {
  notionToken?: string;
  notionToken_encrypted?: string;
  workspaceName?: string;
  theme?: 'light' | 'dark' | 'system';
  autoDetectClipboard?: boolean;
  autoSave?: boolean;
  notifications?: boolean;
  onboardingCompleted?: boolean;
}

interface ValidationResult {
  success: boolean;
  error?: string;
}

interface UseConfigOptions {
  loadConfigFn?: () => Promise<Config>;
  saveConfigFn?: (config: Config) => Promise<boolean>;
  validateTokenFn?: (token: string) => Promise<ValidationResult>;
}

export interface UseConfigReturn {
  config: Config;
  updateConfig: (updates: Partial<Config>) => Promise<boolean>;
  loadConfig: () => Promise<Config>;
  validateNotionToken: (token: string) => Promise<ValidationResult>;
}

export interface ClipperConfig extends Config {}

export function useConfig({
  loadConfigFn,
  saveConfigFn,
  validateTokenFn
}: UseConfigOptions = {}): UseConfigReturn {
  const [config, setConfig] = useState<Config>({});

  // ✅ FIX: Utiliser des refs pour éviter les re-créations de fonctions
  const loadConfigRef = useRef(loadConfigFn);
  const saveConfigRef = useRef(saveConfigFn);
  const validateTokenRef = useRef(validateTokenFn);

  // Mettre à jour les refs quand les fonctions changent
  useEffect(() => {
    loadConfigRef.current = loadConfigFn;
    saveConfigRef.current = saveConfigFn;
    validateTokenRef.current = validateTokenFn;
  }, [loadConfigFn, saveConfigFn, validateTokenFn]);

  // ✅ FIX: useCallback avec tableau de dépendances VIDE car on utilise des refs
  const loadConfig = useCallback(async (): Promise<Config> => {
    if (!loadConfigRef.current) {
      console.warn('[useConfig] loadConfigFn not provided');
      return config;
    }

    try {
      const loadedConfig = await loadConfigRef.current();
      setConfig(loadedConfig);
      return loadedConfig;
    } catch (error) {
      console.error('[useConfig] Error loading config:', error);
      return config;
    }
  }, []); // ✅ FIX: Dépendances vides car on utilise loadConfigRef

  // ✅ FIX: useCallback avec tableau de dépendances VIDE
  const updateConfig = useCallback(async (updates: Partial<Config>): Promise<boolean> => {
    if (!saveConfigRef.current) {
      console.warn('[useConfig] saveConfigFn not provided');
      setConfig(prev => ({ ...prev, ...updates }));
      return false;
    }

    try {
      const newConfig = { ...config, ...updates };
      const success = await saveConfigRef.current(newConfig);
      if (success) {
        setConfig(newConfig);
      }
      return success;
    } catch (error) {
      console.error('[useConfig] Error updating config:', error);
      return false;
    }
  }, [config]); // ✅ FIX: Dépend seulement de config

  // ✅ FIX: useCallback avec tableau de dépendances VIDE
  const validateNotionToken = useCallback(async (token: string): Promise<ValidationResult> => {
    if (!validateTokenRef.current) {
      console.warn('[useConfig] validateTokenFn not provided');
      return { success: true };
    }

    try {
      return await validateTokenRef.current(token);
    } catch (error) {
      console.error('[useConfig] Error validating token:', error);
      return { success: false, error: 'Validation failed' };
    }
  }, []); // ✅ FIX: Dépendances vides car on utilise validateTokenRef

  return {
    config,
    updateConfig,
    loadConfig,
    validateNotionToken
  };
}