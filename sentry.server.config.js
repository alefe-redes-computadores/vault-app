"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// sentry.server.config.ts
var Sentry = require("@sentry/nextjs");
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    tracesSampleRate: 1.0,
    enabled: process.env.NODE_ENV === 'production',
});
