/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const isCapacitorExport = process.env.CAPACITOR_BUILD === "1";
// Web estático tem contrato de URL independente do Capacitor.
const isWebStaticExport = !isCapacitorExport && process.env.VAULT_WEB_STATIC_BUILD === "1";

const nextConfig = {
  ...(isCapacitorExport
    ? {
        output: "export",
        trailingSlash: true,
      }
    : isWebStaticExport
      ? { output: "export", trailingSlash: false }
      : {}),

  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  // G4-01: mitigacao experimental APENAS no build PWA da Vercel.
  // Nao altera export Android, Sentry, sourcemaps ou desenvolvimento.
  ...(process.env.VERCEL === "1" && !isCapacitorExport
    ? { experimental: { cpus: 1 } }
    : {}),

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

  sourcemaps: {
    disable: isCapacitorExport,
  },
});
