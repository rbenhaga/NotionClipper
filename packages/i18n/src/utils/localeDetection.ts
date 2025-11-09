import type { Locale } from '../types';

/**
 * Detects system locale
 * Priority: Electron app.getLocale() > navigator.language > fallback
 */
export async function detectSystemLocale(): Promise<Locale> {
  try {
    // Try Electron API first (for desktop app)
    if (window.electronAPI?.invoke) {
      const result = await window.electronAPI.invoke('system:getLocale');
      if (result.success && result.locale) {
        return normalizeLocale(result.locale);
      }
    }

    // Fallback to browser API (for extension)
    if (typeof navigator !== 'undefined' && navigator.language) {
      return normalizeLocale(navigator.language);
    }
  } catch (error) {
    console.error('[i18n] Error detecting system locale:', error);
  }

  // Default to English
  return 'en';
}

/**
 * Normalizes locale codes to our supported locales
 * Examples:
 *   en-US -> en
 *   fr-FR -> fr
 *   fr-CA -> fr
 *   es-ES -> es (not supported yet, fallback to en)
 */
function normalizeLocale(localeCode: string): Locale {
  const shortCode = localeCode.split('-')[0].toLowerCase();

  // Check if we support this locale
  const supportedLocales: Locale[] = ['en', 'fr'];

  if (supportedLocales.includes(shortCode as Locale)) {
    return shortCode as Locale;
  }

  // Default to English for unsupported locales
  return 'en';
}

/**
 * Validates if a locale is supported
 */
export function isSupportedLocale(locale: string): locale is Locale {
  return locale === 'en' || locale === 'fr';
}
