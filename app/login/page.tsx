"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();

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
      const { error } = await loginWithGoogle();
      if (error) {
        setError(error.message);
        trigger("error");
      }
    } catch {
      setError("Erro ao autenticar com Google");
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ice/10 border border-ice/20 mb-4">
            <span className="text-3xl">🔒</span>
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
          <Chrome size={18} />
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