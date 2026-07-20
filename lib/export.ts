import { db } from "@/lib/db";
import type { Person, Document, Medicamento, Renovacao, Vault, VaultMember } from "@/lib/types";

/**
 * Exporta todos os dados do usuário em formato JSON
 */
export async function exportAllData(userId: string): Promise<string> {
  try {
    // Buscar todos os dados
    const persons = await db.persons.where('user_id').equals(userId).toArray();
    const documents = await db.documents.where('user_id').equals(userId).toArray();
    const medicamentos = await db.medicamentos.where('user_id').equals(userId).toArray();
    const renovacoes = await db.renovacoes.where('user_id').equals(userId).toArray();
    const vaults = await db.vaults.where('user_id').equals(userId).toArray();
    const vaultMembers = await db.vaultMembers.where('user_id').equals(userId).toArray();

    const data = {
      export_date: new Date().toISOString(),
      version: "1.0",
      user_id: userId,
      persons,
      documents,
      medicamentos,
      renovacoes,
      vaults,
      vaultMembers,
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    throw new Error("Falha ao exportar dados");
  }
}

/**
 * Baixa os dados como arquivo JSON
 */
export function downloadJSON(data: string, filename: string = "vault-backup.json") {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta dados em formato CSV (apenas documentos principais)
 */
export function exportToCSV(documents: Document[], persons: Person[]): string {
  const headers = [
    "ID",
    "Título",
    "Pessoa",
    "Categoria",
    "Tipo",
    "Descrição",
    "Favorito",
    "Criado em",
    "Atualizado em",
    "Sincronizado",
  ];

  const rows = documents.map((doc) => {
    const person = persons.find((p) => p.id === doc.person_id);
    return [
      doc.id || "",
      `"${doc.title}"`,
      `"${person?.name || "Não definido"}"`,
      doc.category_id,
      doc.type,
      `"${doc.description || ""}"`,
      doc.is_favorite ? "Sim" : "Não",
      doc.created_at,
      doc.updated_at,
      doc.synced ? "Sim" : "Não",
    ];
  });

  const csvRows = [headers.join(","), ...rows.map((row) => row.join(","))];
  return csvRows.join("\n");
}