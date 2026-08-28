// app/detalhes/editar/page.tsx
"use client";

import { useEffect } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Loader2 } from "lucide-react";

import { PageTransition } from "@/components/PageTransition";

export default function EditarDetalheRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id =
    searchParams.get("id") || "";

  useEffect(() => {
    if (!id) {
      router.replace("/");
      return;
    }

    router.replace(
      `/categoria/detalhes?id=${encodeURIComponent(id)}`
    );
  }, [id, router]);

  return (
    <PageTransition>
      <main className="flex min-h-screen items-center justify-center bg-void px-5">
        <div className="flex flex-col items-center gap-3 rounded-[28px] border border-surface-border/50 bg-surface px-8 py-7 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ice/10 text-ice">
            <Loader2
              size={19}
              className="animate-spin"
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-ink-primary">
              Abrindo editor
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              Carregando documento...
            </p>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}