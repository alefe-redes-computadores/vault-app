/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withSentryConfig(nextConfig, {
  org:
    process.env.SENTRY_ORG ||
    "vault",

  project:
    process.env.SENTRY_PROJECT ||
    "vault-app",

  silent: true,

  /*
   * O upload ampliado inclui artefatos internos do App Router que podem não
   * existir no Next 14.2.5. O upload padrão continua ativo e evita que a
   * Vercel tente rastrear um client-reference-manifest ausente.
   */
  widenClientFileUpload: false,

  disableLogger: true,
});
