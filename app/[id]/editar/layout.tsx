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