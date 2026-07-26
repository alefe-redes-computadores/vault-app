"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDeepLink } from "@/lib/hooks/useAuthDeepLink";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

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
  const { isProcessing } = useAuthDeepLink();

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
      if (isLogin) {
        const { error } = await login(email, password);
        if (error) {
          setError(error.message);
          trigger("error");
        } else {
          trigger("success");
          router.push("/");
        }
      } else {
        const { error } = await register(email, password);
        if (error) {
          setError(error.message);
          trigger("error");
        } else {
          trigger("success");
          router.push("/");
        }
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
      const isNative = Capacitor.isNativePlatform();

      const redirectUrl = isNative
        ? "vault://callback"
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isNative,
        },
      });

      if (error) {
        throw error;
      }

      if (isNative && data?.url) {
        await Browser.open({ url: data.url, presentationStyle: "popover" });
        setLoading(false);
      }
    } catch (err) {
      setError("Erro ao entrar com Google.");
      setLoading(false);
      trigger("error");
    }
  };

  return (
    <div className="bg-aurora relative flex min-h-screen items-center justify-center overflow-hidden bg-void p-4">
      {/* Halo decorativo de fundo, puramente visual */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--ice-rgb) / 0.35), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center"
        >
          <div className="ring-gradient glow-ice mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[22px]">
            <ShieldCheck size={30} className="text-void" strokeWidth={2.2} />
          </div>
          <h1 className="text-gradient font-display text-3xl font-bold">Vault</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Seus documentos, sempre à mão
          </p>
        </motion.div>

        {/* Card de Login */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="shadow-vault rounded-[28px] border border-surface-border/50 bg-surface/90 p-6 backdrop-blur-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              className="glow-ice flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar" : "Criar conta"}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-ink-muted">ou</span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3"
          >
            <GoogleIcon />
            Entrar com Google
          </Button>

          {/* Alternar Login/Cadastro */}
          <p className="mt-6 text-center text-sm text-ink-muted">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="ml-2 font-medium text-ice transition-colors hover:text-ice/80"
            >
              {isLogin ? "Cadastre-se" : "Faça login"}
            </button>
          </p>
        </motion.div>

        <p className="mt-6 text-center text-[11px] text-ink-faint">
          Seus dados ficam protegidos e sincronizados com segurança.
        </p>
      </div>
    </div>
  );
}
