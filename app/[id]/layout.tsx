// Esta função gera as páginas estáticas (executada no servidor)
export async function generateStaticParams() {
  // Retorna um array vazio porque os dados são carregados no cliente
  return [];
}

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}