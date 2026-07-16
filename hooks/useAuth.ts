import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { signIn, signUp, signInWithGoogle, signOut } from '@/lib/supabase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Pega o usuário atual
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Escuta mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (!error) router.push('/');
    return { error };
  };

  const register = async (email: string, password: string) => {
    const { error } = await signUp(email, password);
    if (!error) router.push('/');
    return { error };
  };

  const loginWithGoogle = async () => {
    const { error } = await signInWithGoogle();
    return { error };
  };

  const logout = async () => {
    await signOut();
    router.push('/login');
  };

  return { user, loading, login, register, loginWithGoogle, logout };
}