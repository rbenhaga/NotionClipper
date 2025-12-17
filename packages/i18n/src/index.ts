/**
 * @notion-clipper/i18n
 * Internationalization system for Clipper Pro
 *
 * Design philosophy:
 * - Apple: Simple, elegant, invisible
 * - Notion: Type-safe, extensible, flexible
 */

// Main exports
export { LocaleProvider, LocaleContext } from './context/LocaleProvider';
export { useTranslation } from './hooks/useTranslation';

// Types
export type { Locale, TranslationKey, Translations, InterpolationParams, LocaleContextValue } from './types';

// Utilities (for advanced use cases)
export { interpolate, pluralize } from './utils/interpolation';
export { detectSystemLocale, isSupportedLocale } from './utils/localeDetection';
export { saveLocalePreference, loadLocalePreference } from './utils/storage';

// Locales (for reference)
export { default as enTranslations } from './locales/en';
export { default as frTranslations } from './locales/fr';
export { default as esTranslations } from './locales/es';
export { default as deTranslations } from './locales/de';
export { default as ptTranslations } from './locales/pt';
export { default as jaTranslations } from './locales/ja';
export { default as koTranslations } from './locales/ko';
export { default as arTranslations } from './locales/ar';
export { default as itTranslations } from './locales/it';
