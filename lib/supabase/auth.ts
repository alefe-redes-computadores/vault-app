import { supabase } from './client';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * ✅ REMOVIDO: signInWithGoogle() estava duplicada e não era usada.
 * 
 * O login com Google é gerenciado exclusivamente pela função handleGoogleLogin
 * em app/login/page.tsx, que trata corretamente:
 * - Ambiente web (popup)
 * - Ambiente Capacitor (Browser.open + vault://callback)
 * - SkipBrowserRedirect para evitar loop de redirecionamento
 * 
 * Mantendo apenas esta assinatura comentada para referência,
 * mas a função foi removida para evitar confusão.
 */

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
}