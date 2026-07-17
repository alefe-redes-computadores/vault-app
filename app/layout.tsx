import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SplashScreen } from "@/components/SplashScreen";
import { ClientWrapper } from "@/components/ClientWrapper"; // 🟢 Novo componente

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Vault — Seus documentos",
  description: "Guarde documentos pessoais com acesso offline.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0C0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body antialiased bg-void min-h-screen">
        <Providers>
          <SplashScreen>
            <ClientWrapper> {/* 🟢 O listener de login entra aqui */}
              {children}
            </ClientWrapper>
          </SplashScreen>
        </Providers>
      </body>
    </html>
  );
}
