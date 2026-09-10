import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Allow the API's structured error responses / images later without
  // relaxing this blindly - keep the list explicit as integrations are added.
  images: {
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
