import type {
  Cid,
  Cirurgia,
  Consulta,
  Exame,
  Farmacia,
  Hospital,
  LocalSaude,
  Medico,
  Medicamento,
  RegistroSaude,
  Renovacao,
  Retirada,
  Tratamento,
} from "@/lib/types";

export type BuildCareNetworkIndexInput = {
  activePersonId?: string | null;
  medicamentos: Medicamento[];
  tratamentos: Tratamento[];
  consultas: Consulta[];
  exames: Exame[];
  cirurgias: Cirurgia[];
  renovacoes: Renovacao[];
  registros: RegistroSaude[];
  cids: Cid[];
  retiradas: Retirada[];
  medicos: Medico[];
  farmacias: Farmacia[];
  hospitais: Hospital[];
  locais: LocalSaude[];
};

const add = (target: Set<string>, value?: string | null) => {
  if (value) target.add(value);
};

const addAll = (target: Set<string>, values?: string[] | null) => {
  for (const value of values ?? []) add(target, value);
};

/**
 * Projeção única da Rede de Cuidado para a pessoa ativa.
 *
 * Pessoa e vínculos globais são resolvidos juntos para que a tela não repita
 * filtros e cruzamentos a cada card. Hospital e Local continuam namespaces
 * distintos: um local_id nunca satisfaz um hospital_id (e vice-versa).
 */
export function buildCareNetworkIndex(input: BuildCareNetworkIndexInput) {
  const personId = input.activePersonId;
  const owned = <T extends { person_id?: string | null }>(rows: T[]) =>
    personId ? rows.filter((row) => row.person_id === personId) : [];

  const medicamentos = owned(input.medicamentos);
  const tratamentos = owned(input.tratamentos);
  const consultas = owned(input.consultas);
  const exames = owned(input.exames);
  const cirurgias = owned(input.cirurgias);
  const renovacoes = owned(input.renovacoes);
  const registros = owned(input.registros);
  const cids = owned(input.cids);
  const retiradas = owned(input.retiradas);

  const medicoIds = new Set<string>();
  const farmaciaIds = new Set<string>();
  const hospitalIds = new Set<string>();
  const localIds = new Set<string>();

  for (const consulta of consultas) {
    add(medicoIds, consulta.medico_id);
    add(hospitalIds, consulta.hospital_id);
    add(localIds, consulta.local_id);
  }
  for (const cirurgia of cirurgias) {
    add(medicoIds, cirurgia.medico_id);
    add(hospitalIds, cirurgia.hospital_id);
    add(localIds, cirurgia.local_id);
  }
  for (const exame of exames) {
    add(medicoIds, exame.medico_id);
    add(localIds, exame.local_id);
  }
  for (const renovacao of renovacoes) {
    add(medicoIds, renovacao.medico_id);
    add(farmaciaIds, renovacao.farmacia_id);
    add(hospitalIds, renovacao.hospital_id);
    add(localIds, renovacao.local_id);
  }
  for (const cid of cids) {
    add(medicoIds, cid.medico_id);
    add(hospitalIds, cid.hospital_id);
    add(localIds, cid.local_id);
  }
  for (const medicamento of medicamentos) {
    add(medicoIds, medicamento.medico_id);
    add(farmaciaIds, medicamento.farmacia_id);
    add(hospitalIds, medicamento.hospital_id);
    add(localIds, medicamento.local_id);
  }
  for (const tratamento of tratamentos) {
    addAll(medicoIds, tratamento.medico_ids);
    addAll(hospitalIds, tratamento.hospital_ids);
    addAll(localIds, tratamento.local_ids);
  }

  const linked = <T extends { id?: string }>(rows: T[], ids: Set<string>) =>
    rows.filter((row) => Boolean(row.id && ids.has(row.id)));

  return {
    medicamentos,
    tratamentos,
    consultas,
    exames,
    cirurgias,
    renovacoes,
    registros,
    cids,
    retiradas,
    medicos: linked(input.medicos, medicoIds),
    farmacias: linked(input.farmacias, farmaciaIds),
    hospitais: linked(input.hospitais, hospitalIds),
    locais: linked(input.locais, localIds),
    medicoIds,
    farmaciaIds,
    hospitalIds,
    localIds,
  };
}

export function buildCareNetworkStats(
  index: ReturnType<typeof buildCareNetworkIndex>,
  daysUntil: (date: string) => number | null
) {
  let medicamentosAtivos = 0;
  let tratamentosAtivos = 0;
  let consultasProximas = 0;
  for (const medicamento of index.medicamentos) {
    if (medicamento.status === "ativo") medicamentosAtivos += 1;
  }
  for (const tratamento of index.tratamentos) {
    if (tratamento.status === "ativo") tratamentosAtivos += 1;
  }
  for (const consulta of index.consultas) {
    if (consulta.status !== "agendada") continue;
    const days = daysUntil(consulta.data);
    if (days !== null && days >= 0 && days <= 30) consultasProximas += 1;
  }

  return {
    medicamentos: index.medicamentos.length,
    medicamentosAtivos,
    tratamentos: index.tratamentos.length,
    tratamentosAtivos,
    registros: index.registros.length,
    renovacoes: index.renovacoes.length,
    retiradas: index.retiradas.length,
    consultas: index.consultas.length,
    consultasProximas,
    exames: index.exames.length,
    cirurgias: index.cirurgias.length,
    medicos: index.medicos.length,
    farmacias: index.farmacias.length,
    hospitais: index.hospitais.length,
    locais: index.locais.length,
  };
}
