import { CATEGORIES } from "@/lib/types";

// Esta função gera as páginas estáticas (executada no servidor)
export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((id) => ({
    id: id,
  }));
}

// Layout simples que renderiza o children
export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}