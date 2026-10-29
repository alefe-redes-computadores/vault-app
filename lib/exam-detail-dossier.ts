import { db } from "@/lib/db";

export type ExamDetailDossierInput = { examId: string; userId: string; personId: string };
const owned = <T extends { user_id?: string; person_id?: string }>(item: T, input: ExamDetailDossierInput) => item.user_id === input.userId && item.person_id === input.personId;
const normalizedName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export async function loadExamDetailDossier(input: ExamDetailDossierInput) {
  const exame = await db.exames.get(input.examId);
  if (!exame || !owned(exame, input)) return null;
  const [personRaw, treatmentsRaw, cidsRaw, examsRaw] = await Promise.all([
    db.persons.get(input.personId),
    db.tratamentos.where("person_id").equals(input.personId).toArray(),
    db.cids.where("person_id").equals(input.personId).toArray(),
    db.exames.where("person_id").equals(input.personId).toArray(),
  ]);
  return {
    exame,
    person: personRaw?.user_id === input.userId ? personRaw : undefined,
    tratamentos: treatmentsRaw.filter(item => owned(item, input)),
    cids: cidsRaw.filter(item => owned(item, input)),
    historico: examsRaw.filter(item => owned(item, input) && item.id !== exame.id && normalizedName(item.nome) === normalizedName(exame.nome)).sort((a, b) => (b.data || "").localeCompare(a.data || "")),
  };
}
