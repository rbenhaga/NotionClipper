/**
 * useTranslation hook
 * Simple, elegant hook to access translations
 *
 * Usage:
 *   const { t, locale, setLocale } = useTranslation();
 *   return <h1>{t('common.welcome')}</h1>
 */
import { useContext } from 'react';
import { LocaleContext } from '../context/LocaleProvider';
import type { LocaleContextValue } from '../types';

export function useTranslation(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }

  return context;
}
