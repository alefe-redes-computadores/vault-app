import { CATEGORIES } from "@/lib/types";

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((id) => ({
    id: id,
  }));
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}