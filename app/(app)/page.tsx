// app/(app)/page.tsx

import HomeClient from "./HomeClient";

// A Home depende de autenticação, pessoa ativa e IndexedDB no dispositivo.
// A configuração precisa viver no Server Component da rota; assim o Next 14
// gera corretamente o manifesto do HomeClient e não pré-renderiza dados pessoais.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeClient />;
}
