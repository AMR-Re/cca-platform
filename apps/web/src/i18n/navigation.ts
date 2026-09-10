import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Locale-aware wrappers around Next.js navigation primitives.
 * Always import Link/useRouter/usePathname/redirect from here instead of
 * `next/navigation` so locale prefixes are handled automatically.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
