"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-raised border border-surface-border mb-4">
          <WifiOff size={32} className="text-ink-muted" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">
          Você está offline
        </h1>
        <p className="text-sm text-ink-muted mt-2">
          Seus documentos estão seguros e disponíveis localmente.
          Conecte-se à internet para sincronizar com a nuvem.
        </p>
        <Button
          variant="primary"
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}