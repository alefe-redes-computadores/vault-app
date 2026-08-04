"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, Trash2, Pencil, Eye, EyeOff, Copy, Check, ExternalLink, ShieldCheck, Loader2, Lock 
} from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";
import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { useSecureScreen } from "@/hooks/useSecureScreen";
import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import type { Credential } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";

function CredentialDetailsContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { showToast } = useToast();

  const { isLocked } = useSecureScreen();
  const { deleteCredential } = useCredentials();
  
  const { authenticate } = useBiometric({
    title: "Revelar Senha",
    subtitle: "Confirme sua identidade para visualizar a senha.",
    fallbackTitle: "Usar senha do dispositivo",
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
        console.error("Erro:", error);
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
    try {
      await Clipboard.write({ string: text });
      setCopiedField(fieldName);
      trigger("success");
      
      if (fieldName === "password") {
         showToast("Senha copiada! Será limpa em 60s.", "success");
         setTimeout(() => {
           Clipboard.write({ string: "" });
         }, 60000);
      }
      
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Erro ao copiar para área de transferência:", error);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Deseja excluir esta senha?")) return;
    trigger("vibrate");
    setIsDeleting(true);
    try {
      await deleteCredential(id);
      trigger("success");
      router.back();
    } catch (error) {
      trigger("error");
      setIsDeleting(false);
    }
  };

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-void">
        <Lock size={48} className="mb-4 text-ice" />
        <h2 className="font-display text-xl text-ink-primary">Vault Bloqueado</h2>
      </div>
    );
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-void"><Loader2 className="animate-spin text-ice" /></div>;
  if (!credential) return <div className="flex min-h-screen flex-col items-center justify-center bg-void"><p>Não encontrada.</p></div>;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="header-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold truncate text-ink-primary">{credential.title}</h1>
              <span className="inline-block rounded-full bg-ice/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-ice">{credential.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                trigger("vibrate");
                router.push(`/senhas/editar?id=${id}`);
              }} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              aria-label="Editar senha"
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={handleDelete} 
              disabled={isDeleting} 
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir senha"
            >
              {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {credential.username && (
            <div className="flex items-center justify-between rounded-[28px] border border-surface-border/50 bg-surface p-4">
              <div>
                <p className="text-xs uppercase text-ink-faint">Usuário / E-mail</p>
                <p className="mt-1 text-base font-medium">{credential.username}</p>
              </div>
              <button onClick={() => handleCopy(credential.username!, "username")} className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                {copiedField === "username" ? <Check size={16} className="text-ice" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          <div className="space-y-2 rounded-[28px] border border-surface-border/50 bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-ink-faint">Senha criptografada</p>
              <span className="flex items-center gap-1 text-[11px] text-ice"><ShieldCheck size={12} /> E2EE</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
              <span className="font-mono text-base text-ink-primary">{revealed ? plainPassword : "••••••••••••••••"}</span>
              <div className="flex gap-2">
                <button onClick={handleRevealPassword} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface">
                  {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button onClick={() => {
                  const val = revealed ? plainPassword : decryptPassword(credential.password_encrypted);
                  handleCopy(val, "password");
                }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface">
                  {copiedField === "password" ? <Check size={16} className="text-ice" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

export default function CredentialDetailsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void"><Loader2 className="animate-spin text-ice" /></div>}>
      <CredentialDetailsContent />
    </Suspense>
  );
}
