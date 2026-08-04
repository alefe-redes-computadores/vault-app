"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ExternalLink, 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  User, 
  FileText,
  Loader2
} from "lucide-react";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import type { Credential } from "@/lib/types";

function CredentialDetailsContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { deleteCredential } = useCredentials();
  const { authenticate } = useBiometric({
    title: "Revelar Senha",
    subtitle: "Confirme sua identidade para visualizar a senha descriptografada.",
  });

  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [plainPassword, setPlainPassword] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadCredential() {
      if (!id) return;
      try {
        const item = await db.credentials.get(id);
        if (item) setCredential(item);
      } catch (error) {
        console.error("Erro ao carregar credencial:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCredential();
  }, [id]);

  const handleRevealPassword = async () => {
    trigger("vibrate");
    if (!credential) return;

    if (!revealed) {
      // Exige biometria para mostrar a senha
      const isAuth = await authenticate();
      if (!isAuth) return;

      const decrypted = decryptPassword(credential.password_encrypted);
      setPlainPassword(decrypted);
      setRevealed(true);
    } else {
      setRevealed(false);
      setPlainPassword("");
    }
  };

  const handleCopy = async (text: string, fieldName: string) => {
    trigger("vibrate");
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      trigger("success");
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Tem certeza que deseja excluir esta senha permanentemente?")) return;
    
    trigger("vibrate");
    setIsDeleting(true);
    try {
      await deleteCredential(id);
      trigger("success");
      router.back();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      trigger("error");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 size={32} className="animate-spin text-ice" />
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-void px-5 text-center">
        <h2 className="font-display text-lg font-semibold text-ink-primary">Senha não encontrada</h2>
        <p className="mt-1 text-sm text-ink-muted">O registro pode ter sido removido ou o link está incorreto.</p>
        <Button variant="secondary" className="mt-5" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-ink-primary truncate">
                {credential.title}
              </h1>
              <span className="inline-block rounded-full bg-ice/15 px-2.5 py-0.5 text-[11px] font-medium text-ice capitalize">
                {credential.category}
              </span>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition-all active:scale-95"
            aria-label="Excluir senha"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* Usuário / Login */}
          {credential.username && (
            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-faint">Usuário / E-mail</p>
                <p className="mt-1 truncate text-base font-medium text-ink-primary">{credential.username}</p>
              </div>
              <button
                onClick={() => handleCopy(credential.username!, "username")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary transition-all"
              >
                {copiedField === "username" ? <Check size={16} className="text-ice" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {/* Senha Segura */}
          <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-faint">Senha criptografada</p>
              <span className="flex items-center gap-1 text-[11px] text-ice">
                <ShieldCheck size={12} /> E2EE
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3">
              <span className="font-mono text-base tracking-wider text-ink-primary">
                {revealed ? plainPassword : "••••••••••••••••"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRevealPassword}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:text-ice transition-all"
                  aria-label="Revelar/Ocultar senha"
                >
                  {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  onClick={async () => {
                    const decrypted = revealed ? plainPassword : decryptPassword(credential.password_encrypted);
                    handleCopy(decrypted, "password");
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/50 bg-surface text-ink-muted hover:text-ink-primary transition-all"
                  aria-label="Copiar senha"
                >
                  {copiedField === "password" ? <Check size={16} className="text-ice" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* URL do Site */}
          {credential.url && (
            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-faint">Website</p>
                <a 
                  href={credential.url.startsWith("http") ? credential.url : `https://${credential.url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-1 truncate text-sm font-medium text-ice hover:underline flex items-center gap-1"
                >
                  {credential.url} <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Notas */}
          {credential.notes && (
            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-faint">Notas e Dicas</p>
              <p className="text-sm text-ink-muted whitespace-pre-wrap mt-2">{credential.notes}</p>
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}

export default function CredentialDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 size={32} className="animate-spin text-ice" />
      </div>
    }>
      <CredentialDetailsContent />
    </Suspense>
  );
}
