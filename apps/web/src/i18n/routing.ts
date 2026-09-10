import { defineRouting } from 'next-intl/routing';

/**
 * Supported locales for the platform.
 * `en` is the source-of-truth language; `ar` must stay in sync with it
 * (see src/messages/README in this folder for translation workflow notes).
 */
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

/** Locales that render right-to-left. */
export const RTL_LOCALES: AppLocale[] = ['ar'];

export function getDirection(locale: string): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale as AppLocale) ? 'rtl' : 'ltr';
}
