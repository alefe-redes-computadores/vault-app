"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// sentry.client.config.ts
var Sentry = require("@sentry/nextjs");
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
        Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
        }),
    ],
    // Desativa a captura de erros locais em desenvolvimento
    enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_DSN !== '',
    beforeSend: function (event) {
        var _a, _b;
        // Filtra erros específicos que não queremos capturar
        if ((_b = (_a = event.exception) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b.some(function (value) {
            var _a, _b, _c;
            return ((_a = value.value) === null || _a === void 0 ? void 0 : _a.includes('ResizeObserver')) ||
                ((_b = value.value) === null || _b === void 0 ? void 0 : _b.includes('AbortError')) ||
                ((_c = value.value) === null || _c === void 0 ? void 0 : _c.includes('Loading chunk failed'));
        })) {
            return null;
        }
        return event;
    },
});
