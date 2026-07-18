// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  tracesSampleRate: 1.0, // Captura todas as transações em desenvolvimento
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
  beforeSend(event) {
    // Filtra erros específicos que não queremos capturar
    if (event.exception?.values?.some((value) => 
      value.value?.includes('ResizeObserver') ||
      value.value?.includes('AbortError') ||
      value.value?.includes('Loading chunk failed')
    )) {
      return null;
    }
    return event;
  },
});