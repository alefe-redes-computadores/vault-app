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
    // Busca usuário inicial
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Escuta mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Se o usuário logou, joga pra Home
      if (event === 'SIGNED_IN') {
        router.push('/');
      }
      // Se o usuário deslogou, joga pro Login
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    return await signIn(email, password);
  };

  const register = async (email: string, password: string) => {
    return await signUp(email, password);
  };

  const loginWithGoogle = async () => {
    return await signInWithGoogle();
  };

  const logout = async () => {
    await signOut();
  };

  return { user, loading, login, register, loginWithGoogle, logout };
}
