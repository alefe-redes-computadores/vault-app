// Esta função gera as páginas estáticas (executada no servidor)
// Retorna um array vazio porque os dados são carregados no cliente
export async function generateStaticParams() {
  return [];
}

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}