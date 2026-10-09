import { preparationStart } from "@/lib/health-supply/overview";
import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";
import { validSupplyDate } from "@/lib/health-supply/rules";
import type {
  SupplyProcess,
  SupplyCycle,
  SupplyDocumentKind,
  SupplyDocumentLink,
  SupplyItem,
  SupplyCycleReason,
} from "@/lib/health-supply/types";
import { validateCatalogSelection } from "@/lib/health-supply/catalog";
import { SUPPLY_REASON_LABELS } from "@/lib/health-supply/types";
const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
async function owner(personId: string) {
  const { data, error } = await getLocalFirstAuthUser();
  if (error) throw error;
  if (!data.user || !personId)
    throw new Error("Pessoa ou usuário não identificado.");
  const person = await db.persons.get(personId);
  if (!person || person.user_id !== data.user.id)
    throw new Error("Pessoa não pertence à conta atual.");
  return data.user.id;
}
async function owned<T extends { user_id: string; person_id?: string }>(
  row: T | undefined,
  pid: string,
  uid: string
): Promise<T> {
  if (!row || row.person_id !== pid || row.user_id !== uid)
    throw new Error("Vínculo não pertence à pessoa ativa.");
  return row;
}
async function accountRelation<T extends { user_id: string }>(
  row: T | undefined,
  uid: string
) {
  if (!row || row.user_id !== uid)
    throw new Error("Profissional ou unidade não pertence à conta atual.");
  return row;
}
async function processRelations(
  p: Pick<SupplyProcess, "farmacia_id" | "medico_id" | "local_id">,
  pid: string,
  uid: string
) {
  if (p.farmacia_id)
    await accountRelation(await db.farmacias.get(p.farmacia_id), uid);
  if (p.medico_id)
    await accountRelation(await db.medicos.get(p.medico_id), uid);
  if (p.local_id) await accountRelation(await db.locais.get(p.local_id), uid);
}
function validateProcess(
  p: Pick<
    SupplyProcess,
    "titulo" | "origem" | "renovacao_meses" | "antecedencia_dias"
  >
) {
  if (
    !p.titulo.trim() ||
    ![
      "comprado",
      "municipal",
      "estadual_ceaf",
      "farmacia_popular",
      "outro",
    ].includes(p.origem)
  )
    throw new Error("Informe título e origem.");
  if (
    !Number.isInteger(p.antecedencia_dias) ||
    p.antecedencia_dias < 0 ||
    p.antecedencia_dias > 180
  )
    throw new Error("Antecedência deve ser de 0 a 180 dias.");
  if (
    p.renovacao_meses !== null &&
    (!Number.isInteger(p.renovacao_meses) ||
      p.renovacao_meses < 1 ||
      p.renovacao_meses > 24)
  )
    throw new Error("Ciclo deve ter de 1 a 24 meses.");
}
export const healthSupplyRepository = {
  async create(
    personId: string,
    input: Omit<
      SupplyProcess,
      "id" | "user_id" | "person_id" | "created_at" | "updated_at" | "synced"
    >,
    medicationIds: string[]
  ) {
    const uid = await owner(personId);
    validateProcess(input);
    if (input.uf && !/^[A-Z]{2}$/.test(input.uf))
      throw new Error("UF inválida.");
    await processRelations(input, personId, uid);
    const mids = [...new Set(medicationIds)];
    if (!mids.length) throw new Error("Selecione ao menos um medicamento.");
    const meds = await Promise.all(
      mids.map(async (mid) =>
        owned(await db.medicamentos.get(mid), personId, uid)
      )
    );
    const t = stamp(),
      base = {
        user_id: uid,
        person_id: personId,
        created_at: t,
        updated_at: t,
        synced: false,
      };
    const p: SupplyProcess = {
      ...input,
      ...base,
      id: id(),
      titulo: input.titulo.trim(),
    };
    const c: SupplyCycle = {
      ...base,
      id: id(),
      processo_id: p.id,
      status: "preparando",
      motivo: "inicial",
      uf_snapshot: input.uf || null,
      indicacao_snapshot: input.indicacao || null,
      origem_snapshot: input.origem,
      preparar_ate: null,
      consulta_id: null,
      documentos_pessoais_conferidos: false,
      exigencia_local: null,
      regra_versao: null,
      inicio: null,
      fim: null,
      protocolado_em: null,
      autorizado_em: null,
      observacoes: null,
    };
    const items: SupplyItem[] = meds.map((m) => ({
      ...base,
      id: id(),
      processo_id: p.id,
      ciclo_id: c.id,
      medicamento_id: m.id!,
      dosagem: m.dosagem,
      quantidade_mensal: null,
    }));
    await db.transaction(
      "rw",
      [
        db.fornecimentos,
        db.fornecimento_ciclos,
        db.fornecimento_itens,
        db.syncQueue,
      ],
      async () => {
        await db.fornecimentos.add(p);
        await enfileirarOperacao("fornecimentos", "add", p, {
          dispatchSync: false,
        });
        await db.fornecimento_ciclos.add(c);
        await enfileirarOperacao("fornecimento_ciclos", "add", c, {
          dispatchSync: false,
        });
        for (const item of items) {
          await db.fornecimento_itens.add(item);
          await enfileirarOperacao("fornecimento_itens", "add", item, {
            dispatchSync: false,
          });
        }
      }
    );
    solicitarProcessamentoSync();
    return p.id;
  },
  async updateProcess(
    pid: string,
    processId: string,
    input: Omit<
      SupplyProcess,
      "id" | "user_id" | "person_id" | "created_at" | "updated_at" | "synced"
    >
  ) {
    const uid = await owner(pid),
      p = await owned(await db.fornecimentos.get(processId), pid, uid);
    validateProcess(input);
    if (input.uf && !/^[A-Z]{2}$/.test(input.uf))
      throw new Error("UF inválida.");
    await processRelations(input, pid, uid);
    const row = { ...p, ...input, updated_at: stamp(), synced: false };
    await db.transaction("rw", [db.fornecimentos, db.syncQueue], async () => {
      await db.fornecimentos.put(row);
      await enfileirarOperacao("fornecimentos", "update", row, {
        dispatchSync: false,
      });
    });
    solicitarProcessamentoSync();
  },
  async newCycle(
    pid: string,
    processId: string,
    reason: SupplyCycleReason = "renovacao"
  ) {
    if (!Object.keys(SUPPLY_REASON_LABELS).includes(reason))
      throw new Error("Motivo inválido.");
    const uid = await owner(pid);
    const process = await owned(
      await db.fornecimentos.get(processId),
      pid,
      uid
    );
    const cycles = (
      await db.fornecimento_ciclos
        .where("processo_id")
        .equals(processId)
        .toArray()
    ).filter((x) => x.user_id === uid && x.person_id === pid);
    const pending = cycles.find(
      (x) => x.status === "preparando" || x.status === "protocolado"
    );
    if (pending) return pending.id;
    const previous = cycles.sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
    )[0];
    const items = previous
      ? (
          await db.fornecimento_itens
            .where("ciclo_id")
            .equals(previous.id)
            .toArray()
        ).filter((x) => x.person_id === pid && x.user_id === uid)
      : [];
    const t = stamp(),
      c: SupplyCycle = {
        id: id(),
        user_id: uid,
        person_id: pid,
        processo_id: processId,
        status: "preparando",
        motivo: reason,
        uf_snapshot: process.uf || null,
        indicacao_snapshot: process.indicacao || null,
        origem_snapshot: process.origem,
        preparar_ate: reason === "renovacao" && previous?.status === "autorizado" && previous.fim ? preparationStart(previous.fim, process.antecedencia_dias) : null,
        consulta_id: null,
        documentos_pessoais_conferidos: false,
        exigencia_local: null,
        regra_versao: null,
        inicio: null,
        fim: null,
        protocolado_em: null,
        autorizado_em: null,
        observacoes: null,
        created_at: t,
        updated_at: t,
        synced: false,
      };
    const copied: SupplyItem[] = [];
    for (const item of items) {
      const med = await owned(
        await db.medicamentos.get(item.medicamento_id),
        pid,
        uid
      );
      copied.push({
        ...item,
        id: id(),
        ciclo_id: c.id,
        dosagem: med.dosagem,
        created_at: t,
        updated_at: t,
        synced: false,
      });
    }
    await db.transaction(
      "rw",
      [db.fornecimento_ciclos, db.fornecimento_itens, db.syncQueue],
      async () => {
        await db.fornecimento_ciclos.add(c);
        await enfileirarOperacao("fornecimento_ciclos", "add", c, {
          dispatchSync: false,
        });
        for (const item of copied) {
          await db.fornecimento_itens.add(item);
          await enfileirarOperacao("fornecimento_itens", "add", item, {
            dispatchSync: false,
          });
        }
      }
    );
    solicitarProcessamentoSync();
    return c.id;
  },
  async updateCycle(
    pid: string,
    cycleId: string,
    input: Pick<SupplyCycle, "status" | "inicio" | "fim" | "observacoes">
  ) {
    const uid = await owner(pid),
      c = await owned(await db.fornecimento_ciclos.get(cycleId), pid, uid);
    if (
      (c.status === "autorizado" || c.status === "encerrado") &&
      (input.status === "preparando" || input.status === "protocolado")
    )
      throw new Error(
        "Prepare um novo ciclo para a renovação; o histórico autorizado fica preservado."
      );
    if (
      !["preparando", "protocolado", "autorizado", "encerrado"].includes(
        input.status
      )
    )
      throw new Error("Status inválido.");
    if (
      (input.inicio && !validSupplyDate(input.inicio)) ||
      (input.fim && !validSupplyDate(input.fim))
    )
      throw new Error("Datas inválidas.");
    if (input.inicio && input.fim && input.fim < input.inicio)
      throw new Error("Fim anterior ao início.");
    if (input.status === "autorizado" && (!input.inicio || !input.fim))
      throw new Error(
        "Informe o período confirmado pela farmácia para autorizar."
      );
    if (input.status === "autorizado") {
      const items = await db.fornecimento_itens
        .where("ciclo_id")
        .equals(c.id)
        .filter((i) => i.person_id === pid && i.user_id === uid)
        .toArray();
      if (!items.length)
        throw new Error(
          "Inclua ao menos um medicamento no ciclo antes de autorizar."
        );
    }
    const t = stamp(),
      row = {
        ...c,
        ...input,
        protocolado_em:
          input.status === "protocolado"
            ? c.protocolado_em || t
            : c.protocolado_em,
        autorizado_em:
          input.status === "autorizado"
            ? c.autorizado_em || t
            : c.autorizado_em,
        updated_at: t,
        synced: false,
      };
    await db.transaction(
      "rw",
      [db.fornecimento_ciclos, db.syncQueue],
      async () => {
        await db.fornecimento_ciclos.put(row);
        await enfileirarOperacao("fornecimento_ciclos", "update", row, {
          dispatchSync: false,
        });
      }
    );
    solicitarProcessamentoSync();
  },
  async planCycle(
    pid: string,
    cycleId: string,
    input: Pick<
      SupplyCycle,
      | "motivo"
      | "preparar_ate"
      | "consulta_id"
      | "documentos_pessoais_conferidos"
      | "exigencia_local"
    >
  ) {
    const uid = await owner(pid),
      c = await owned(await db.fornecimento_ciclos.get(cycleId), pid, uid);
    if (c.status === "autorizado" || c.status === "encerrado")
      throw new Error("Planeje em um novo ciclo; o histórico está preservado.");
    if (
      !input.motivo ||
      !Object.keys(SUPPLY_REASON_LABELS).includes(input.motivo)
    )
      throw new Error("Informe a etapa.");
    if (input.preparar_ate && !validSupplyDate(input.preparar_ate))
      throw new Error("Prazo inválido.");
    if (input.consulta_id)
      await owned(await db.consultas.get(input.consulta_id), pid, uid);
    const process = await owned(
      await db.fornecimentos.get(c.processo_id),
      pid,
      uid
    );
    const row: SupplyCycle = {
      ...c,
      ...input,
      uf_snapshot: process.uf || null,
      indicacao_snapshot: process.indicacao || null,
      origem_snapshot: process.origem,
      regra_versao: "sus-v103-2026-10-09",
      updated_at: stamp(),
      synced: false,
    };
    await db.transaction(
      "rw",
      [db.fornecimento_ciclos, db.syncQueue],
      async () => {
        await db.fornecimento_ciclos.put(row);
        await enfileirarOperacao("fornecimento_ciclos", "update", row, {
          dispatchSync: false,
        });
      }
    );
    solicitarProcessamentoSync();
  },
  async setCycleMedication(
    pid: string,
    cycleId: string,
    medicationId: string,
    include: boolean
  ) {
    const uid = await owner(pid),
      c = await owned(await db.fornecimento_ciclos.get(cycleId), pid, uid);
    if (c.status !== "preparando")
      throw new Error(
        "Altere medicamentos apenas enquanto prepara os documentos."
      );
    const med = await owned(await db.medicamentos.get(medicationId), pid, uid);
    await db.transaction(
      "rw",
      [db.fornecimento_itens, db.retiradas, db.syncQueue],
      async () => {
        const existing = await db.fornecimento_itens
          .where("ciclo_id")
          .equals(c.id)
          .filter(
            (x) =>
              x.medicamento_id === medicationId &&
              x.user_id === uid &&
              x.person_id === pid
          )
          .first();
        if (include) {
          if (existing) return;
          const t = stamp(),
            row: SupplyItem = {
              id: id(),
              user_id: uid,
              person_id: pid,
              processo_id: c.processo_id,
              ciclo_id: c.id,
              medicamento_id: medicationId,
              dosagem: med.dosagem,
              quantidade_mensal: null,
              catalogo_id: null,
              created_at: t,
              updated_at: t,
              synced: false,
            };
          await db.fornecimento_itens.add(row);
          await enfileirarOperacao("fornecimento_itens", "add", row, {
            dispatchSync: false,
          });
        } else if (existing) {
          if (
            await db.retiradas
              .where("fornecimento_ciclo_id")
              .equals(c.id)
              .filter(
                (x) =>
                  x.medicamento_id === medicationId &&
                  x.person_id === pid &&
                  x.user_id === uid
              )
              .count()
          )
            throw new Error(
              "Este medicamento tem uma retirada vinculada. Reorganize o vínculo antes de removê-lo deste ciclo."
            );
          await db.fornecimento_itens.delete(existing.id);
          await enfileirarOperacao(
            "fornecimento_itens",
            "delete",
            { id: existing.id, user_id: uid, person_id: pid },
            { dispatchSync: false }
          );
        }
      }
    );
    solicitarProcessamentoSync();
  },
  async updateItem(
    pid: string,
    itemId: string,
    dosagem: string,
    quantity: number | null,
    catalogId?: string | null
  ) {
    const uid = await owner(pid),
      item = await owned(await db.fornecimento_itens.get(itemId), pid, uid);
    const cycle = await owned(
      await db.fornecimento_ciclos.get(item.ciclo_id),
      pid,
      uid
    );
    if (cycle.status === "autorizado" || cycle.status === "encerrado")
      throw new Error(
        "Dose autorizada pertence ao histórico. Prepare um novo ciclo para registrar alterações."
      );
    if (
      !dosagem.trim() ||
      (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0))
    )
      throw new Error("Confira dose e quantidade mensal.");
    const process = await owned(
      await db.fornecimentos.get(item.processo_id),
      pid,
      uid
    );
    if (catalogId !== undefined) validateCatalogSelection(process, catalogId);
    const row = {
      ...item,
      ...(catalogId !== undefined ? { catalogo_id: catalogId } : {}),
      dosagem: dosagem.trim(),
      quantidade_mensal: quantity,
      updated_at: stamp(),
      synced: false,
    };
    await db.transaction(
      "rw",
      [db.fornecimento_itens, db.syncQueue],
      async () => {
        await db.fornecimento_itens.put(row);
        await enfileirarOperacao("fornecimento_itens", "update", row, {
          dispatchSync: false,
        });
      }
    );
    solicitarProcessamentoSync();
  },
  async linkDocument(
    pid: string,
    cycleId: string,
    documentId: string,
    tipo: SupplyDocumentKind,
    withdrawalId: string | null = null
  ) {
    const uid = await owner(pid),
      c = await owned(await db.fornecimento_ciclos.get(cycleId), pid, uid);
    const doc = await owned(await db.documents.get(documentId), pid, uid);
    if (doc.category_id !== "saude")
      throw new Error("Selecione um documento de saúde.");
    if (
      !["lme", "receita", "formulario", "comprovante", "decisao"].includes(tipo)
    )
      throw new Error("Tipo de vínculo inválido.");
    if (withdrawalId) {
      const r = await owned(await db.retiradas.get(withdrawalId), pid, uid);
      const items = await db.fornecimento_itens
        .where("ciclo_id")
        .equals(c.id)
        .toArray();
      if (
        !items.some(
          (x) =>
            x.medicamento_id === r.medicamento_id &&
            x.person_id === pid &&
            x.user_id === uid
        )
      )
        throw new Error("Retirada não pertence aos medicamentos deste ciclo.");
    }
    const existing = (
      await db.fornecimento_documentos.where("ciclo_id").equals(c.id).toArray()
    ).find(
      (x) =>
        x.document_id === documentId &&
        x.tipo === tipo &&
        x.retirada_id === withdrawalId &&
        x.person_id === pid &&
        x.user_id === uid
    );
    if (existing) return existing.id;
    const t = stamp(),
      row: SupplyDocumentLink = {
        id: id(),
        user_id: uid,
        person_id: pid,
        processo_id: c.processo_id,
        ciclo_id: c.id,
        document_id: documentId,
        retirada_id: withdrawalId,
        tipo,
        estado: "preenchido",
        entregue_em: null,
        created_at: t,
        updated_at: t,
        synced: false,
      };
    await db.transaction(
      "rw",
      [db.fornecimento_documentos, db.syncQueue],
      async () => {
        await db.fornecimento_documentos.add(row);
        await enfileirarOperacao("fornecimento_documentos", "add", row, {
          dispatchSync: false,
        });
      }
    );
    solicitarProcessamentoSync();
    return row.id;
  },
  async deliverDocument(pid: string, linkId: string, delivered: boolean) {
    const uid = await owner(pid),
      x = await owned(await db.fornecimento_documentos.get(linkId), pid, uid),
      t = stamp();
    const row: SupplyDocumentLink = {
      ...x,
      estado: delivered ? "entregue" : "preenchido",
      entregue_em: delivered ? t : null,
      updated_at: t,
      synced: false,
    };
    await db.transaction(
      "rw",
      [db.fornecimento_documentos, db.syncQueue],
      async () => {
        await db.fornecimento_documentos.put(row);
        await enfileirarOperacao("fornecimento_documentos", "update", row, {
          dispatchSync: false,
        });
      }
    );
    solicitarProcessamentoSync();
  },
  async unlinkDocument(pid: string, linkId: string) {
    const uid = await owner(pid),
      row = await owned(await db.fornecimento_documentos.get(linkId), pid, uid);
    await db.transaction(
      "rw",
      [db.fornecimento_documentos, db.syncQueue],
      async () => {
        await db.fornecimento_documentos.delete(linkId);
        await enfileirarOperacao(
          "fornecimento_documentos",
          "delete",
          { id: row.id, user_id: uid, person_id: pid },
          { dispatchSync: false }
        );
      }
    );
    solicitarProcessamentoSync();
  },
  async linkWithdrawal(
    pid: string,
    withdrawalId: string,
    cycleId: string | null
  ) {
    const uid = await owner(pid),
      r = await owned(await db.retiradas.get(withdrawalId), pid, uid);
    const c = cycleId
      ? await owned(await db.fornecimento_ciclos.get(cycleId), pid, uid)
      : null;
    if (c) {
      const items = await db.fornecimento_itens
        .where("ciclo_id")
        .equals(c.id)
        .toArray();
      if (
        !items.some(
          (x) =>
            x.medicamento_id === r.medicamento_id &&
            x.person_id === pid &&
            x.user_id === uid
        )
      )
        throw new Error("Ciclo não inclui este medicamento.");
    }
    const row = {
      ...r,
      fornecimento_id: c?.processo_id ?? null,
      fornecimento_ciclo_id: c?.id ?? null,
      updated_at: stamp(),
      synced: false,
    };
    await db.transaction("rw", [db.retiradas, db.syncQueue], async () => {
      await db.retiradas.put(row);
      await enfileirarOperacao("retiradas", "update", row, {
        dispatchSync: false,
      });
    });
    solicitarProcessamentoSync();
  },
};
