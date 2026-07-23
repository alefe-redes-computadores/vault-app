"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-void px-4 py-6">
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-[32px] border border-surface-border/50 bg-surface px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised shadow-inner">
            <WifiOff size={38} className="text-ink-muted" />
          </div>

          <div className="mb-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
              Vault
            </p>
            <h1 className="mt-2 font-display text-[28px] font-semibold text-ink-primary">
              Você está offline
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-muted">
              Seus documentos continuam disponíveis no aparelho. Conecte-se à internet para voltar a sincronizar com a nuvem.
            </p>
          </div>

          <div className="mb-6 rounded-[24px] border border-ice/15 bg-ice/5 px-4 py-4 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ice/10">
                <ShieldCheck size={16} className="text-ice" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-primary">
                  Seus dados estão seguros
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  O modo local-first mantém seus documentos acessíveis mesmo sem conexão.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              className="flex items-center justify-center gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} />
              Tentar novamente
            </Button>

            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => router.push("/")}
            >
              Voltar para o início
            </Button>
          </div>
        </motion.section>
      </div>
    </main>
  );
}