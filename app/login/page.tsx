"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";

// Ícone SVG do Google com as cores oficiais
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

export default function LoginPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { login, register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = isLogin
        ? await login(email, password)
        : await register(email, password);

      if (error) {
        setError(error.message);
        trigger("error");
      } else {
        trigger("success");
        router.push("/");
      }
    } catch {
      setError("Erro ao autenticar");
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Pega a URL de autenticação do Supabase com skipBrowserRedirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true, // Não expulsa do app!
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // 2. Abre a gaveta do navegador por cima
      if (data?.url) {
        window.open(data.url, '_blank', 'width=500,height=600');
      }
    } catch (err) {
      setError("Erro ao autenticar com Google");
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo do Vault */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-raised border border-surface-border p-3 mb-4">
            <Image
              src="/icon-512x512.png"
              alt="Vault Logo"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
          <h1 className="font-display text-2xl font-semibold text-ink-primary mt-2">
            {isLogin ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {isLogin ? "Acesse seus documentos" : "Comece a guardar seus documentos"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-coral bg-coral/10 p-3 rounded-xl border border-coral/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
          >
            {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-void px-2 text-ink-muted">ou</span>
          </div>
        </div>

        {/* Google Button */}
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          Entrar com Google
        </Button>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => {
            trigger("vibrate");
            setIsLogin(!isLogin);
            setError("");
          }}
          className="w-full text-center text-sm text-ink-muted hover:text-ink-primary transition-colors mt-4"
        >
          {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
        </button>
      </div>
    </main>
  );
}