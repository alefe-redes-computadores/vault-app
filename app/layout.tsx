// app/(app)/layout.tsx
"use client";

import {
  Suspense,
  useEffect,
} from "react";

import type {
  Viewport,
} from "next";

import {
  Space_Grotesk,
  Inter,
  IBM_Plex_Mono,
} from "next/font/google";

import "./globals.css";

import {
  Providers,
} from "@/components/Providers";

import {
  SplashScreen,
} from "@/components/SplashScreen";

import {
  BiometricLock,
} from "@/components/BiometricLock";

import {
  ErrorBoundary,
} from "@/components/ErrorBoundary";

import {
  ThemeProvider,
} from "@/components/ThemeProvider";

import {
  PersonProvider,
} from "@/contexts/PersonContext";


import {
  ToastProvider,
} from "@/components/ToastProvider";

import {
  AuthProvider,
} from "@/hooks/useAuth";

const display =
  Space_Grotesk({
    subsets: [
      "latin",
    ],
    weight: [
      "500",
      "600",
      "700",
    ],
    variable:
      "--font-display",
  });

const body =
  Inter({
    subsets: [
      "latin",
    ],
    weight: [
      "400",
      "500",
      "600",
    ],
    variable:
      "--font-body",
  });

const mono =
  IBM_Plex_Mono({
    subsets: [
      "latin",
    ],
    weight: [
      "400",
      "500",
    ],
    variable:
      "--font-mono",
  });

export const viewport:
  Viewport = {
  themeColor:
    "#06090E",

  width:
    "device-width",

  initialScale:
    1,

  maximumScale:
    1,

  userScalable:
    false,

  viewportFit:
    "cover",
};

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  // ==========================================================
  // SERVICE WORKER
  // ==========================================================

  useEffect(
    () => {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch((error) => {
            console.error("Erro ao registrar Service Worker:", error);
          });
      }
    },
    []
  );

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="manifest"
          href="/manifest.json"
        />

        <link
          rel="apple-touch-icon"
          href="/apple-icon.png?v=2"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta
          name="theme-color"
          content="#06090E"
        />

        <meta
          name="msapplication-TileColor"
          content="#06090E"
        />

        <meta
          name="msapplication-TileImage"
          content="/icon-v2-512x512.png"
        />
      </head>

      <body className="min-h-[100dvh] bg-void pb-safe pt-safe font-body antialiased transition-colors duration-300">
        <Suspense
          fallback={
            null
          }
        >
        </Suspense>

        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="vault-theme"
          >
            {/*
             * ORDEM IMPORTANTE:
             *
             * ToastProvider precisa envolver PersonProvider
             * porque PersonProvider usa useToast().
             *
             * PersonProvider precisa envolver Providers
             * porque Providers usa useActivePersonId().
             */}
            <AuthProvider>
              <ToastProvider>
                <PersonProvider>
                  <Providers>
                  <SplashScreen>
                    <BiometricLock>
                      {
                        children
                      }
                    </BiometricLock>
                  </SplashScreen>
                  </Providers>
                </PersonProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
