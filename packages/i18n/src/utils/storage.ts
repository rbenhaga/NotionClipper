/// <reference path="../global.d.ts" />
import type { Locale } from '../types';

const LOCALE_STORAGE_KEY = 'notion-clipper-locale';

/**
 * Saves locale preference
 * Uses Electron config or localStorage depending on environment
 */
export async function saveLocalePreference(locale: Locale): Promise<void> {
  try {
    // Try Electron config first
    const win = window as any;
    if (win.electronAPI?.invoke) {
      await win.electronAPI.invoke('config:save', { locale });
      console.log('[i18n] Locale saved via Electron:', locale);
      return;
    }

    // Fallback to localStorage (for browser extension)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      console.log('[i18n] Locale saved via localStorage:', locale);
    }
  } catch (error) {
    console.error('[i18n] Error saving locale preference:', error);
  }
}

/**
 * Loads locale preference
 */
export async function loadLocalePreference(): Promise<Locale | null> {
  try {
    // Try Electron config first
    const win = window as any;
    if (win.electronAPI?.invoke) {
      const result = await win.electronAPI.invoke('config:get');
      if (result.success && result.config?.locale) {
        console.log('[i18n] Locale loaded via Electron:', result.config.locale);
        return result.config.locale as Locale;
      }
    }

    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored) {
        console.log('[i18n] Locale loaded via localStorage:', stored);
        return stored as Locale;
      }
    }
  } catch (error) {
    console.error('[i18n] Error loading locale preference:', error);
  }

  return null;
}
