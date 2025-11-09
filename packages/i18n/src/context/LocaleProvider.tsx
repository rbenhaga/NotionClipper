/**
 * LocaleProvider - i18n Context Provider
 * Apple/Notion design: Simple, elegant, performant
 */
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Locale, LocaleContextValue, Translations, TranslationKey, InterpolationParams } from '../types';
import { interpolate } from '../utils/interpolation';
import { detectSystemLocale } from '../utils/localeDetection';
import { saveLocalePreference, loadLocalePreference } from '../utils/storage';
import enTranslations from '../locales/en';
import frTranslations from '../locales/fr';

// Locale data registry
const localeData: Record<Locale, Translations> = {
  en: enTranslations,
  fr: frTranslations,
};

// Create context
export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

interface LocaleProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function LocaleProvider({ children, defaultLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale || 'en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale on mount
  useEffect(() => {
    async function initializeLocale() {
      console.log('[i18n] Initializing locale...');

      // 1. Try to load saved preference
      const savedLocale = await loadLocalePreference();
      if (savedLocale) {
        console.log('[i18n] Using saved locale:', savedLocale);
        setLocaleState(savedLocale);
        setIsInitialized(true);
        return;
      }

      // 2. Try to detect system locale
      const systemLocale = await detectSystemLocale();
      console.log('[i18n] Detected system locale:', systemLocale);
      setLocaleState(systemLocale);

      // Save the detected locale as preference
      await saveLocalePreference(systemLocale);
      setIsInitialized(true);
    }

    initializeLocale();
  }, []);

  // Change locale handler
  const setLocale = useCallback(async (newLocale: Locale) => {
    console.log('[i18n] Changing locale to:', newLocale);
    setLocaleState(newLocale);
    await saveLocalePreference(newLocale);
  }, []);

  // Translation function
  const t = useCallback(
    (key: TranslationKey, params?: InterpolationParams): string => {
      try {
        // Split the key into namespace and subkey
        const [namespace, subkey] = key.split('.') as [keyof Translations, string];

        // Get the translation
        const translations = localeData[locale];
        if (!translations || !translations[namespace]) {
          console.warn(`[i18n] Namespace not found: ${namespace}`);
          return key;
        }

        const translation = (translations[namespace] as any)[subkey];
        if (!translation) {
          console.warn(`[i18n] Translation not found: ${key}`);
          return key;
        }

        // Apply interpolation if params provided
        if (params) {
          return interpolate(translation, params);
        }

        return translation;
      } catch (error) {
        console.error('[i18n] Translation error:', error);
        return key;
      }
    },
    [locale]
  );

  // Context value
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  // Show nothing until initialized (prevents flash of wrong language)
  if (!isInitialized) {
    return null;
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
