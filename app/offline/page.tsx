"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-raised border border-surface-border/50 mb-6">
          <WifiOff size={40} className="text-ink-muted/50" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">
          Você está offline
        </h1>
        <p className="text-sm text-ink-muted mt-3 max-w-xs mx-auto">
          Seus documentos estão seguros e disponíveis localmente.
          Conecte-se à internet para sincronizar com a nuvem.
        </p>
        <div className="mt-6 flex flex-col gap-3">
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
      </motion.div>
    </main>
  );
}