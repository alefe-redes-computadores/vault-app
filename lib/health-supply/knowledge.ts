import type { Document, Medicamento, Retirada } from "@/lib/types";
import type {
  SupplyProcess,
  SupplyCycle,
  SupplyData,
  SupplyDocumentKind,
} from "./types";
import { catalogEntry, normalizeSus } from "./catalog";
import { supplyDays, validSupplyDate } from "./rules";
export const SUS_RULE_VERSION = "mg-dor-cronica-2025-06-12/v103";
export const SUS_LINKS = {
  checklist:
    "https://www.saude.mg.gov.br/wp-content/uploads/2025/06/DOR-CRONICA.pdf",
  formulario:
    "https://www.saude.mg.gov.br/wp-content/uploads/2026/01/DOR-CRONICA-2.pdf",
  formularios:
    "https://www.saude.mg.gov.br/obtermedicamentos/ceaf/formulariosceaf/",
  popular:
    "https://www.gov.br/saude/pt-br/composicao/sectics/daf/farmacia-popular",
};
export interface SupplyRequirement {
  tipo: SupplyDocumentKind | "pessoais";
  titulo: string;
  ready: boolean;
  entregue: boolean;
  responsavel: string;
}
export function supplyDossier(
  process: SupplyProcess,
  cycle: SupplyCycle,
  med: Medicamento,
  data: SupplyData,
  documents: Document[],
  today: string,
  withdrawal?: Retirada
) {
  process = {
    ...process,
    ...(cycle.origem_snapshot ? { origem: cycle.origem_snapshot } : {}),
    ...(cycle.uf_snapshot !== undefined ? { uf: cycle.uf_snapshot } : {}),
    ...(cycle.indicacao_snapshot !== undefined
      ? { indicacao: cycle.indicacao_snapshot }
      : {}),
  };
  const item = data.itens.find(
    (i) =>
      i.ciclo_id === cycle.id &&
      i.processo_id === process.id &&
      i.medicamento_id === med.id &&
      i.person_id === process.person_id &&
      i.user_id === process.user_id
  );
  const entry = catalogEntry(item?.catalogo_id);
  const selectedMatches =
    !!entry &&
    entry.programa === process.origem &&
    entry.indicacao === process.indicacao &&
    (entry.uf === "BR" || entry.uf === process.uf);
  const detailed =
    selectedMatches &&
    process.origem === "estadual_ceaf" &&
    process.uf === "MG" &&
    process.indicacao === "Dor Crônica";
  const reason = cycle.motivo;
  const preparation =
    cycle.status === "preparando" || cycle.status === "protocolado";
  const links = data.documentos.filter(
    (l) =>
      l.ciclo_id === cycle.id &&
      l.processo_id === process.id &&
      l.person_id === process.person_id &&
      l.user_id === process.user_id &&
      (!l.retirada_id || l.retirada_id === withdrawal?.id) &&
      documents.some(
        (d) =>
          d.id === l.document_id &&
          d.user_id === process.user_id &&
          d.person_id === process.person_id
      )
  );
  const requirements: SupplyRequirement[] = [];
  const add = (
    tipo: SupplyRequirement["tipo"],
    titulo: string,
    responsavel: string
  ) => {
    const found = links.filter((l) => l.tipo === tipo);
    requirements.push({
      tipo,
      titulo,
      responsavel,
      ready:
        tipo === "pessoais"
          ? !!cycle.documentos_pessoais_conferidos
          : found.length > 0,
      entregue:
        tipo !== "pessoais" && found.some((l) => l.estado === "entregue"),
    });
  };
  if (
    preparation &&
    detailed &&
    ["inicial", "renovacao", "troca", "inclusao", "retomada"].includes(
      reason || ""
    )
  ) {
    add(
      "lme",
      "LME — solicitação de medicamentos do CEAF",
      "Médico prescritor"
    );
    add("receita", "Prescrição médica para o processo", "Médico prescritor");
    if (["inicial", "troca", "inclusao", "retomada"].includes(reason || ""))
      add(
        "formulario",
        "Formulário específico — Dor Crônica",
        "Médico prescritor"
      );
    if (["inicial", "retomada"].includes(reason || ""))
      add(
        "pessoais",
        "Identificação, CPF, CNS e comprovante de residência",
        "Paciente ou responsável"
      );
  }
  if (preparation && process.origem === "farmacia_popular") {
    add("receita", "Receita médica dentro da validade", "Médico prescritor");
    add("pessoais", "Documento com foto e CPF", "Paciente ou responsável");
  }
  const name = entry ? normalizeSus(entry.medicamento) : "";
  const prescriptionModel = detailed
    ? name.startsWith("metadona") || name.startsWith("morfina")
      ? "Notificação de Receita A (amarela)"
      : name.startsWith("codeina") || name.startsWith("gabapentina")
      ? "Receita de Controle Especial (branca)"
      : null
    : null;
  const deadline = validSupplyDate(cycle.preparar_ate)
    ? supplyDays(today, cycle.preparar_ate)
    : null;
  return {
    detailed,
    selectedMatches,
    entry,
    requirements,
    missing: requirements.filter((r) => !r.ready),
    prescriptionModel,
    deadline,
    localRequirement: cycle.exigencia_local?.trim() || null,
    uncertainDoseChange: reason === "ajuste_dose",
    version: detailed ? SUS_RULE_VERSION : null,
    source: detailed
      ? SUS_LINKS.checklist
      : process.origem === "farmacia_popular"
      ? SUS_LINKS.popular
      : SUS_LINKS.formularios,
  };
}
