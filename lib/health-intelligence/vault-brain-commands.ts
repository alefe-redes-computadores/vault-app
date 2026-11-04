/**
 * M44 — Comandos do VAULT Brain.
 * Navegação determinística e leitura exclusivamente local, sem chamadas externas,
 * criação de registros, alterações clínicas ou inferência de vínculos de receita.
 */
import { normalizeLocalSearch } from "@/lib/local-search";
import { medicationRestockHref, medicationStockCountHref } from "@/lib/health-intelligence/medication-restock-navigation";
import type { Medicamento, Document, Tratamento, Consulta, Exame, Renovacao, Retirada, Cirurgia, Medico, Farmacia, Hospital, LocalSaude } from "@/lib/types";
import type { SupplyProcess } from "@/lib/health-supply/types";

export type VaultBrainCommandItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: "navigate" | "medication" | "document" | "prescription" | "treatment" | "appointment" | "exam" | "prepare" | "withdrawal" | "surgery" | "provider" | "supply";
};
export type VaultBrainCommandData = {
  userId: string | null | undefined;
  personId: string | null | undefined;
  medications: readonly Medicamento[];
  documents: readonly Document[];
  treatments: readonly Tratamento[];
  appointments: readonly Consulta[];
  exams: readonly Exame[];
  renewals: readonly Renovacao[];
  withdrawals?: readonly Retirada[];
  surgeries?: readonly Cirurgia[];
  doctors?: readonly Medico[];
  pharmacies?: readonly Farmacia[];
  hospitals?: readonly Hospital[];
  careLocations?: readonly LocalSaude[];
  supplyProcesses?: readonly SupplyProcess[];
};
export type VaultBrainCommandIntent = {
  kind: "browse" | "replenish" | "count" | "prescription" | "pending" | "search";
  term: string;
};

const MODULES: ReadonlyArray<{ id: string; label: string; href: string; aliases: readonly string[] }> = [
  { id: "ajuda", label: "Ajuda e guias do Vault", href: "/ajuda", aliases: ["ajuda", "como usar", "guias", "tutorial", "conhecer o vault"] },
  { id: "hoje", label: "Hoje · doses e rotina", href: "/hoje", aliases: ["hoje", "doses", "rotina", "agenda de hoje"] },
  { id: "medicamentos", label: "Medicamentos", href: "/saude/medicamentos", aliases: ["medicamentos", "remedios", "remedio", "medicacao"] },
  { id: "receitas", label: "Receitas e aquisições", href: "/saude/renovacao", aliases: ["receita", "receitas", "renovacao", "prescricao", "aquisicoes"] },
  { id: "retiradas", label: "Retiradas e agendamentos", href: "/saude/retiradas", aliases: ["retiradas", "retirada", "sus", "agendamentos"] },
  { id: "cirurgias", label: "Cirurgias", href: "/saude/cirurgias", aliases: ["cirurgia", "cirurgias", "operacao"] },
  { id: "farmacias", label: "Farmácias", href: "/saude/farmacias", aliases: ["farmacia", "farmacias", "drogaria", "drogarias"] },
  { id: "medicos", label: "Médicos", href: "/saude/medicos", aliases: ["medicos", "medico", "profissionais"] },
  { id: "hospitais", label: "Hospitais", href: "/saude/hospitais", aliases: ["hospital", "hospitais"] },
  { id: "locais", label: "Locais de saúde", href: "/saude/locais", aliases: ["locais", "posto de saude", "ubs", "caps"] },
  { id: "tratamentos", label: "Tratamentos", href: "/saude/tratamentos", aliases: ["tratamentos", "tratamento"] },
  { id: "consultas", label: "Consultas", href: "/saude/consultas", aliases: ["consultas", "consulta", "medico"] },
  { id: "exames", label: "Exames", href: "/saude/exames", aliases: ["exames", "exame"] },
  { id: "documentos", label: "Documentos", href: "/documentos", aliases: ["documentos", "documento", "arquivos", "anexos"] },
  { id: "fornecimento", label: "Fornecimento", href: "/saude/fornecimento", aliases: ["fornecimento", "farmacia popular", "processos"] },
  { id: "registros", label: "Registros de saúde", href: "/saude/registros", aliases: ["registros", "historico de saude", "historico clinico"] },
  { id: "mais", label: "Todas as áreas", href: "/mais", aliases: ["mais", "areas", "menu"] },
];

const LEADING = /^(?:(?:por favor|brain|vault brain|vault)\s+)?(?:(?:quero|preciso|pode|gostaria de)\s+)?/;
const ACTION = /^(?:abrir|abre|ir para|navegar para|mostrar|mostra|ver|buscar|procurar|encontrar|consultar|pesquisar)\s+/;
const PREPOSITIONS = /^(?:meus?|minhas?|o|a|os|as|de|da|do|dos|das|para|no|na)\s+/;
function normalize(value: string): string { return normalizeLocalSearch(value); }
function queryNormalize(value: string): string { return normalize(value).slice(0, 160); }
function stripCommonWords(input: string): string {
  let value = queryNormalize(input).replace(LEADING, "");
  value = value.replace(ACTION, "");
  for (let i = 0; i < 3; i++) value = value.replace(PREPOSITIONS, "");
  return value.trim();
}
export function parseVaultBrainCommand(raw: string): VaultBrainCommandIntent {
  const clean = queryNormalize(raw).replace(LEADING, "");
  if (/^(?:mostrar|ver|abrir|revisar|consultar)?\s*(?:as |minhas )?doses?\s+(?:pendentes?|atrasadas?|sem confirmacao)/.test(clean)) return { kind: "pending", term: "" };
  const replenish = clean.match(/^(?:repor|comprar|adquirir|registrar compra de|registrar retirada de)\s+(?:(?:estoque|medicamento|remedio|medicacao)\s+(?:de|do|da)\s+)?(.+)$/);
  if (replenish) return { kind: "replenish", term: stripCommonWords(replenish[1]) };
  if (/^(?:repor|comprar|adquirir)\s+(?:estoque|medicamentos?|remedios?)$/.test(clean)) return { kind: "replenish", term: "" };
  const count = clean.match(/^(?:informar|conferir|contar|corrigir|atualizar)\s+(?:o\s+)?saldo(?:\s+(?:de|do|da))?\s*(.*)$/);
  if (count) return { kind: "count", term: stripCommonWords(count[1]) };
  const rx = clean.match(/^(?:(?:ver|abrir|mostrar|buscar|encontrar|consultar)\s+)?(?:(?:minha|ultima|a)\s+)?(?:receita|receitas|prescricao|prescricoes)(?:\s+(?:de|do|da|para))?\s*(.*)$/);
  if (rx) return { kind: "prescription", term: stripCommonWords(rx[1]) };
  const term = stripCommonWords(clean);
  if (MODULES.some(item => item.aliases.some(alias => normalize(alias) === term))) return { kind: "browse", term };
  return { kind: "search", term };
}

function owned<T extends { user_id?: string; person_id?: string }>(items: readonly T[], userId: string, personId: string): T[] {
  return items.filter(item => item.person_id === personId && item.user_id === userId);
}
function matches(term: string, ...fields: Array<unknown>): boolean {
  const words = normalize(term).split(" ").filter(Boolean);
  // M63: do not truncate an entire record at the query's 160-character limit.
  const candidate = normalize(fields.filter(value => typeof value === "string" || typeof value === "number").join(" "));
  return words.length > 0 && words.every(word => candidate.includes(word));
}
function unique(items: VaultBrainCommandItem[]): VaultBrainCommandItem[] {
  const seen = new Set<string>();
  return items.filter(item => { if (seen.has(item.href)) return false; seen.add(item.href); return true; }).slice(0, 18);
}
function link(kind: VaultBrainCommandItem["kind"], id: string, title: string, detail: string, href: string): VaultBrainCommandItem {
  return { id: `${kind}:${id}`, kind, title, detail, href };
}
function medicationMatches(term: string, medications: Medicamento[]): Medicamento[] {
  return medications.filter(item => item.id && matches(term, item.nome, item.dosagem)).slice(0, 12);
}
const HOME_SHORTCUTS: VaultBrainCommandItem[] = [
  link("navigate", "today", "Ver rotina de hoje", "Horários, doses e compromissos", "/hoje"),
  link("navigate", "medications", "Abrir medicamentos", "Rotinas e estoque", "/saude/medicamentos"),
  link("navigate", "prescriptions", "Ver receitas", "Receitas e renovações registradas", "/saude/renovacao"),
  link("navigate", "documents", "Buscar documentos", "Documentos da pessoa selecionada", "/documentos"),
];

/** Ação somente depois de toque explícito. Resultado não é uma decisão clínica. */
export function searchVaultBrainCommands(raw: string, input: VaultBrainCommandData): VaultBrainCommandItem[] {
  if (!input.personId || !input.userId) return [];
  const q = raw.trim().slice(0, 160);
  if (!q) return HOME_SHORTCUTS;
  const intent = parseVaultBrainCommand(q);
  const medications = owned(input.medications, input.userId, input.personId);
  const documents = owned(input.documents, input.userId, input.personId);
  const treatments = owned(input.treatments, input.userId, input.personId);
  const appointments = owned(input.appointments, input.userId, input.personId);
  const exams = owned(input.exams, input.userId, input.personId);
  const renewals = owned(input.renewals, input.userId, input.personId);
  const medicationById = new Map(medications.filter(item => Boolean(item.id)).map(item => [item.id!, item]));
  const withdrawals = owned(input.withdrawals ?? [], input.userId, input.personId);
  const surgeries = owned(input.surgeries ?? [], input.userId, input.personId);
  const supplies = owned(input.supplyProcesses ?? [], input.userId, input.personId);
  // Medical network records belong to the account, not necessarily to one person.
  const ownedNetwork = <T extends { user_id: string }>(items: readonly T[]) => items.filter(item => item.user_id === input.userId);
  const doctors = ownedNetwork(input.doctors ?? []);
  const pharmacies = ownedNetwork(input.pharmacies ?? []);
  const hospitals = ownedNetwork(input.hospitals ?? []);
  const careLocations = ownedNetwork(input.careLocations ?? []);
  if (intent.kind === "pending") return [link("navigate", "pending", "Revisar doses pendentes", "Abrir a lista e aplicar o filtro pendentes", "/hoje?focus=doses&status=pendentes")];
  if (intent.kind === "replenish" || intent.kind === "count") {
    if (!intent.term || ["estoque", "medicamento", "remedio", "medicamentos"].includes(intent.term))
      return [link("navigate", "select-medication", "Escolher medicamento", "Selecione qual saldo deseja conferir ou repor", "/saude/medicamentos")];
    const found = medicationMatches(intent.term, medications);
    return found.length ? found.map(med => link("prepare", med.id!, `${intent.kind === "count" ? "Informar saldo" : "Repor estoque"} · ${med.nome}`, `Preparar formulário, sem gravar movimentação · ${med.dosagem}`, intent.kind === "count" ? medicationStockCountHref(med.id!, "/") : medicationRestockHref(med.id!, "/")))
      : [link("navigate", "choose-medication", "Medicamento não identificado", "Abrir lista para escolher o item correto", "/saude/medicamentos")];
  }
  if (intent.kind === "prescription") {
    if (!intent.term) return [link("navigate", "prescriptions", "Abrir receitas", "Receitas, aquisições e renovações", "/saude/renovacao")];
    const found = medicationMatches(intent.term, medications);
    const results: VaultBrainCommandItem[] = [];
    for (const med of found) {
      const linkedDocs = documents.filter(doc => doc.id && doc.type === "receita" && (doc.id === med.document_id || (doc.entidade_tipo === "medicamento" && doc.entidade_id === med.id)));
      for (const doc of linkedDocs) results.push(link("document", doc.id!, doc.title || "Receita anexada", `Documento vinculado a ${med.nome}`, `/saude/documentos/detalhes?id=${encodeURIComponent(doc.id!)}`));
      const linkedRenewals = renewals.filter(item => item.id && item.medicamento_id === med.id);
      for (const renewal of linkedRenewals.slice(0, 4)) results.push(link("prescription", renewal.id!, `Registro de receita · ${med.nome}`, renewal.data ? `Referência: ${renewal.data.slice(0,10)}` : "Ver registro vinculado", `/saude/renovacao/detalhes?id=${encodeURIComponent(renewal.id!)}`));
      results.push(link("medication", med.id!, `Conferir receitas · ${med.nome}`, "Abrir detalhes do medicamento e documentos relacionados", `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id!)}`));
    }
    return results.length ? unique(results) : [link("navigate", "prescriptions", "Ver receitas cadastradas", "Nenhum vínculo exato identificado; escolha o registro", "/saude/renovacao")];
  }
  if (intent.kind === "browse") {
    const match = MODULES.find(item => item.aliases.some(alias => normalize(alias) === intent.term));
    if (match) return [link("navigate", match.id, `Abrir ${match.label}`, "Navegação sem alterar registros", match.href)];
  }
  if (!intent.term) return HOME_SHORTCUTS;
  const results: VaultBrainCommandItem[] = [];
  for (const item of MODULES) if (item.aliases.some(alias => matches(intent.term, alias) || matches(alias, intent.term)))
    results.push(link("navigate", item.id, item.label, "Abrir área", item.href));
  for (const med of medicationMatches(intent.term, medications)) results.push(link("medication", med.id!, med.nome, `Medicamento · ${med.dosagem}`, `/saude/medicamentos/detalhes?id=${encodeURIComponent(med.id!)}`));
  for (const doc of documents) if (doc.id && matches(intent.term, doc.title, doc.description, doc.type))
    results.push(link("document", doc.id, doc.title, `Documento · ${doc.type}`, `${doc.category_id === "saude" ? "/saude" : ""}/documentos/detalhes?id=${encodeURIComponent(doc.id)}`));
  for (const treatment of treatments) if (treatment.id && matches(intent.term, treatment.nome, treatment.condicao))
    results.push(link("treatment", treatment.id, treatment.nome, "Tratamento registrado", `/saude/tratamentos/detalhes?id=${encodeURIComponent(treatment.id)}`));
  for (const consultation of appointments) if (consultation.id && matches(intent.term, consultation.especialidade, consultation.medico))
    results.push(link("appointment", consultation.id, consultation.especialidade, `Consulta · ${consultation.medico}`, `/saude/consultas/detalhes?id=${encodeURIComponent(consultation.id)}`));
  for (const exam of exams) if (exam.id && matches(intent.term, "exame", exam.nome, exam.laboratorio))
    results.push(link("exam", exam.id, exam.nome, "Exame registrado", `/saude/exames/detalhes?id=${encodeURIComponent(exam.id)}`));
  for (const withdrawal of withdrawals) {
    const medicationName = medicationById.get(withdrawal.medicamento_id)?.nome || withdrawal.medicamento_nome || "medicamento";
    if (withdrawal.id && matches(intent.term, "retirada sus agendamento", medicationName, withdrawal.medicamento_dosagem, withdrawal.data, withdrawal.tipo, withdrawal.status, withdrawal.observacoes))
      results.push(link("withdrawal", withdrawal.id, `Retirada · ${medicationName}`, `${withdrawal.data} · ${withdrawal.status}`, `/saude/retiradas/detalhes?id=${encodeURIComponent(withdrawal.id)}`));
  }
  for (const surgery of surgeries) if (surgery.id && matches(intent.term, "cirurgia", surgery.procedimento, surgery.data, surgery.status, surgery.observacoes))
    results.push(link("surgery", surgery.id, surgery.procedimento, `Cirurgia · ${surgery.data}`, `/saude/cirurgias/detalhes?id=${encodeURIComponent(surgery.id)}`));
  for (const supply of supplies) if (supply.id && matches(intent.term, "fornecimento sus processo protocolo", supply.titulo, supply.protocolo, supply.origem, supply.status, supply.observacoes))
    results.push(link("supply", supply.id, supply.titulo, `Fornecimento · ${supply.status}`, `/saude/fornecimento?id=${encodeURIComponent(supply.id)}`));
  for (const doctor of doctors) if (doctor.id && matches(intent.term, "medico profissional", doctor.nome, doctor.especialidade, doctor.crm, doctor.observacoes))
    results.push(link("provider", `medico:${doctor.id}`, doctor.nome, `Médico · ${doctor.especialidade || "rede de saúde"}`, `/saude/medicos/detalhes?id=${encodeURIComponent(doctor.id)}`));
  for (const pharmacy of pharmacies) if (pharmacy.id && matches(intent.term, "farmacia drogaria sus", pharmacy.nome, pharmacy.endereco, pharmacy.tipo))
    results.push(link("provider", `farmacia:${pharmacy.id}`, pharmacy.nome, "Farmácia cadastrada", `/saude/farmacias/detalhes?id=${encodeURIComponent(pharmacy.id)}`));
  for (const hospital of hospitals) if (hospital.id && matches(intent.term, "hospital", hospital.nome, hospital.endereco, hospital.tipo))
    results.push(link("provider", `hospital:${hospital.id}`, hospital.nome, "Hospital cadastrado", `/saude/hospitais/detalhes?id=${encodeURIComponent(hospital.id)}`));
  for (const local of careLocations) if (local.id && matches(intent.term, "local de saude posto ubs caps clinica", local.nome, local.endereco, local.tipo))
    results.push(link("provider", `local:${local.id}`, local.nome, "Local de saúde cadastrado", `/saude/locais/detalhes?id=${encodeURIComponent(local.id)}`));
  return unique(results);
}
