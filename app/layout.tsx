// app/(app)/layout.tsx
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SplashScreen } from "@/components/SplashScreen";
import { BiometricLock } from "@/components/BiometricLock";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RouteProgress } from "@/components/loading/RouteProgress";
import { PersonProvider } from "@/contexts/PersonContext";
import { PersonSelector } from "@/components/PersonSelector";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Vault — Seus documentos, sempre à mão",
  description: "Guarde prontuários, receitas, laudos e documentos pessoais com acesso offline garantido.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vault",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192x192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06090E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#06090E" />
        <meta name="msapplication-TileColor" content="#06090E" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
      </head>
      <body className="font-body antialiased bg-void min-h-screen transition-colors duration-300 pb-safe">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>

        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="vault-theme"
          >
            <Providers>
              <SplashScreen>
                <BiometricLock>
                  <PersonProvider>
                    <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-surface-border/30 bg-void/82 backdrop-blur-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink-primary">Vault</span>
                      </div>
                      <Suspense fallback={<div className="h-8 w-8 rounded-full bg-surface-raised animate-pulse" />}>
                        <PersonSelector />
                      </Suspense>
                    </header>
                    {children}
                  </PersonProvider>
                </BiometricLock>
              </SplashScreen>
            </Providers>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
