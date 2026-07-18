/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
};

module.exports = withSentryConfig(nextConfig, {
  // Opções do Sentry
  org: process.env.SENTRY_ORG || 'vault',
  project: process.env.SENTRY_PROJECT || 'vault-app',
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
});