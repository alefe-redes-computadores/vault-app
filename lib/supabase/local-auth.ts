import { supabase } from "@/lib/supabase/client";

/**
 * Identidade local-first para operações que primeiro persistem no Dexie.
 *
 * A sessão já foi autenticada e persistida pelo Supabase. Aqui ela serve
 * somente para identificar o proprietário da escrita local e da operação
 * colocada na fila. A sincronização remota continua sujeita ao token, ao
 * RLS e às validações do servidor.
 */
export async function getLocalFirstAuthUser() {
  const { data, error } = await supabase.auth.getSession();

  return {
    data: {
      user: data.session?.user ?? null,
    },
    error,
  };
}

export async function requireLocalFirstUser() {
  const { data, error } = await getLocalFirstAuthUser();

  if (error || !data.user) {
    throw new Error("Usuário não autenticado.");
  }

  return data.user;
}

export async function requireLocalFirstUserId(): Promise<string> {
  return (await requireLocalFirstUser()).id;
}
