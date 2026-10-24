import { isSupplyMedicationEligible, hasRecordedSupplyWithdrawal } from "@/lib/health-supply/medication-eligibility";
import type {
  HealthInsight,
  HealthInsightContext,
} from "@/lib/health-insights";
import { getLocalTodayISO } from "@/lib/health-utils";
import { supplyPreparationMessage } from "@/lib/health-supply/notification-copy";
import { supplyChecklist, validSupplyDate, resolveSupplyWithdrawal } from "@/lib/health-supply/rules";
import { prescriptionConfigurationReview } from "@/lib/health-supply/process-integrity";
import { supplyDossier } from "@/lib/health-supply/knowledge";
export function buildSupplyInsights(
  context: HealthInsightContext
): HealthInsight[] {
  const data = context.fornecimento,
    today = context.hoje || getLocalTodayISO();
  if (!data || !validSupplyDate(today)) return [];
  const result: HealthInsight[] = [];
  // V222: índices efêmeros por pessoa/conta para evitar buscas globais por insight.
  // Não são cache persistente nem alteram qualquer evento clínico.
  const ownerKey = (userId: string, id: string) => `${userId}\u001f${id}`;
  const activeProcesses = data.processos.filter(p => p.person_id === context.personId && p.status === "ativo");
  const processById = new Map(activeProcesses.map(p => [ownerKey(p.user_id, p.id), p]));
  const processesByMedication = new Map<string, typeof data.processos>();
  const itemsByCycle = new Map<string, typeof data.itens>();
  for (const item of data.itens) {
    if (item.person_id !== context.personId) continue;
    const process = processById.get(ownerKey(item.user_id, item.processo_id));
    if (process) {
      const medicationKey = ownerKey(item.user_id, item.medicamento_id);
      const bucket = processesByMedication.get(medicationKey) || [];
      if (!bucket.some(existing => existing.id === process.id)) bucket.push(process);
      processesByMedication.set(medicationKey, bucket);
    }
    const cycleKey = ownerKey(item.user_id, item.ciclo_id);
    const cycleBucket = itemsByCycle.get(cycleKey) || [];
    cycleBucket.push(item);
    itemsByCycle.set(cycleKey, cycleBucket);
  }
  const cyclesByProcess = new Map<string, typeof data.ciclos>();
  for (const cycle of data.ciclos) {
    if (cycle.person_id !== context.personId) continue;
    const key = ownerKey(cycle.user_id, cycle.processo_id);
    const bucket = cyclesByProcess.get(key) || [];
    bucket.push(cycle);
    cyclesByProcess.set(key, bucket);
  }
  const withdrawalByMedication = new Map<string, typeof context.retiradas>();
  for (const row of context.retiradas) {
    if (row.person_id !== context.personId || row.status !== "agendada") continue;
    const key = ownerKey(row.user_id, row.medicamento_id);
    const bucket = withdrawalByMedication.get(key) || [];
    bucket.push(row);
    withdrawalByMedication.set(key, bucket);
  }
  const medicationById = new Map(context.medicamentos
    .filter(m => m.person_id === context.personId && Boolean(m.id))
    .map(m => [ownerKey(m.user_id, m.id!), m]));
  for (const med of context.medicamentos) {
    if (
      !med.id ||
      med.person_id !== context.personId ||
      !(isSupplyMedicationEligible(med) || hasRecordedSupplyWithdrawal(med,context.retiradas,context.personId || "",med.user_id))
    )
      continue;
    const processes = processesByMedication.get(ownerKey(med.user_id, med.id)) || [];
    for (const p of processes) {
      const cycles = cyclesByProcess.get(ownerKey(med.user_id, p.id)) || [];
      const withdrawal = (withdrawalByMedication.get(ownerKey(med.user_id, med.id)) || [])
        .filter(
          (r) =>
            r.person_id === context.personId &&
            r.user_id === med.user_id &&
            r.medicamento_id === med.id &&
            r.status === "agendada" &&
            (r.fornecimento_id === p.id || (!r.fornecimento_id && resolveSupplyWithdrawal(data, med.id!, context.personId!, med.user_id, r.data).fornecimento_id === p.id))
        )
        .sort((a, b) => a.data.localeCompare(b.data))[0];
      const cycle =
        (withdrawal?.fornecimento_ciclo_id
          ? cycles.find((c) => c.id === withdrawal.fornecimento_ciclo_id)
          : undefined) ||
        cycles
          .filter(
            (c) =>
              c.status === "autorizado" &&
              c.inicio &&
              c.fim &&
              (withdrawal?.data || today) >= c.inicio &&
              (withdrawal?.data || today) <= c.fim
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ||
        cycles
          .filter((c) => c.status !== "encerrado")
          .sort(
            (a, b) =>
              b.created_at.localeCompare(a.created_at) ||
              b.id.localeCompare(a.id)
          )[0];
      if (!cycle || !(itemsByCycle.get(ownerKey(med.user_id, cycle.id)) || []).some(i =>
        i.processo_id === p.id && i.medicamento_id === med.id)) continue;
      if(prescriptionConfigurationReview(med,p.receita_cada_retirada))result.push({
        id:`supply-prescription-review-${p.id}-${med.id}`,kind:"data_quality",categoria:"dados",
        titulo:`${med.nome}: confira a exigência de receita`,
        mensagem:"O cadastro do medicamento indica receituário controlado, mas este fornecimento está marcado sem receita a cada retirada. Essa opção não comprova dispensa de receita. Confira o documento exigido pela unidade antes de retirar.",
        urgencia:"media",confianca:"alta",amostra:1,gravidadeSeguranca:"informativa",
        entidadeTipo:"fornecimento",entidadeId:p.id,entidadeIds:[med.id!],link:`/saude/fornecimento?id=${encodeURIComponent(p.id)}`,
        evidencias:[`Tipo de receita cadastrado: ${med.tipo_receita}`,"Fornecimento marcado sem receita a cada retirada"],
        fontesInternas:["Cadastro do medicamento","Configuração do fornecimento"],
        acaoSegura:"Confira a prescrição vigente e a exigência da unidade. Corrija o cadastro se necessário.",
        limitacaoSeguranca:"O aviso compara dados cadastrados; não valida documentos nem autoriza dispensação."
      });
      const check = supplyChecklist(
        p,
        cycle,
        med,
        withdrawal,
        data,
        context.documentos,
        today
      );
      const dossier = supplyDossier(
        p,
        cycle,
        med,
        data,
        context.documentos,
        today,
        withdrawal
      );
      const due =
        withdrawal && validSupplyDate(withdrawal.data)
          ? Math.round(
              (Date.parse(withdrawal.data + "T00:00:00Z") -
                Date.parse(today + "T00:00:00Z")) /
                86400000
            )
          : null;
      let title = "",
        message = "",
        important = false;
      if (check.changed) {
        title = "Confira o fornecimento autorizado";
        message =
          "A dose atual ou a quantidade prevista difere do registro deste ciclo. Confirme com a farmácia se é necessário atualizar a documentação.";
      } else if (
        dossier.requirements.length &&
        dossier.missing.length &&
        cycle.status === "preparando"
      ) {
        title = "Complete os documentos do processo";
        message = `Etapa: ${
          cycle.motivo || "preparação"
        }. A preparar: ${dossier.missing.map((x) => x.titulo).join("; ")}.`;
        important = due !== null && due <= 3;
      } else if (check.needsLme) {
        if (cycle.status === "protocolado") {
          title = "Renovação em análise";
          message =
            "A documentação foi protocolada. Registre o período quando a farmácia confirmar a autorização.";
        } else {
          title = check.lmeReady
            ? "LME preparada para renovação"
            : "Prepare a LME do fornecimento";
          message = check.lmeReady
            ? "A LME está vinculada ao ciclo. Confira a entrega e a autorização junto à farmácia."
            : "Este ciclo não cobre a data da retirada. Vincule a LME preenchida e confira os documentos exigidos pela unidade.";
        }
        important = due !== null && due <= 3 && !check.lmeReady;
      } else if (
        check.needsPrescription &&
        !check.prescriptionReady &&
        due !== null &&
        due <= 7
      ) {
        title = "Confira a receita desta retirada";
        message = `${
          dossier.prescriptionModel ? dossier.prescriptionModel + ": " : ""
        }este fornecimento exige receita a cada retirada. Vincule o documento atual e confira sua validade.`;
        important = due <= 1;
      } else if (check.renewalSoon) {
        title = "Planeje a próxima renovação";
        message = `O período autorizado termina em ${cycle.fim}. Prepare o próximo ciclo com ${p.antecedencia_dias} dias de antecedência.`;
      }
      if (!title) continue;
      const kind =
        important ||
        check.changed ||
        (dossier.missing.length > 0 && cycle.status === "preparando") ||
        (!check.lmeReady && check.needsLme) ||
        check.renewalSoon
          ? "alert"
          : "recommendation";
      result.push({
        id: `fornecimento-v102-${p.id}-${cycle.id}-${
          withdrawal?.id || "ciclo"
        }-${med.id}`,
        kind,
        categoria: "renovacao",
        titulo: `${med.nome}: ${title}`,
        mensagem: message,
        urgencia: important ? "alta" : kind === "alert" ? "media" : "baixa",
        gravidadeSeguranca: important
          ? "importante"
          : kind === "alert"
          ? "atencao"
          : "informativa",
        confianca: "alta",
        amostra: 1,
        entidadeTipo: "medicamento",
        entidadeId: med.id,
        relacoesContextuais: [
          { tipo: "fornecimento", id: p.id },
          ...(withdrawal?.id ? [{ tipo: "retirada", id: withdrawal.id }] : []),
        ],
        link: `/saude/fornecimento?id=${encodeURIComponent(p.id)}&ciclo_id=${encodeURIComponent(cycle.id)}${
          withdrawal?.id
            ? `&retirada_id=${encodeURIComponent(withdrawal.id)}`
            : ""
        }`,
        evidencias: [
          `Origem registrada: ${p.origem}`,
          `Ciclo: ${cycle.status}`,
          ...(dossier.version ? [`Regra documental: ${dossier.version}`] : []),
          `Período: ${cycle.inicio || "não confirmado"} a ${
            cycle.fim || "não confirmado"
          }`,
        ],
        fontesInternas: ["Fornecimento", "Retiradas", "Documentos de Saúde"],
        acaoSegura:
          "Confira os documentos e as exigências com a farmácia responsável.",
        limitacaoSeguranca:
          "O Vault organiza o que foi informado; não valida o conteúdo dos anexos, não concede autorização e não altera a prescrição.",
      });
    }
  }
  for (const p of activeProcesses) {
    // Private purchase planning must not generate SUS document/withdrawal alerts.
    if (p.origem === "comprado") continue;
    for (const cycle of (cyclesByProcess.get(ownerKey(p.user_id, p.id)) || []).filter(
      (c) =>
        c.processo_id === p.id &&
        c.person_id === p.person_id &&
        c.user_id === p.user_id &&
        c.status === "preparando" &&
        validSupplyDate(c.preparar_ate)
    )) {
      const cycleItems = (itemsByCycle.get(ownerKey(p.user_id, cycle.id)) || [])
        .filter(i => i.processo_id === p.id);
      const med = cycleItems
        .map(i => medicationById.get(ownerKey(p.user_id, i.medicamento_id)))
        .find((m) => m && (isSupplyMedicationEligible(m) ||
          hasRecordedSupplyWithdrawal(m, context.retiradas, context.personId || "", p.user_id)));
      if (!med) continue;
      const dossiers = cycleItems
        .map((i) => medicationById.get(ownerKey(p.user_id, i.medicamento_id)))
        .filter((m): m is typeof med => !!m)
        .map((m) =>
          supplyDossier(p, cycle, m, data, context.documentos, today)
        );
      const missing = [
        ...new Set(dossiers.flatMap((d) => d.missing.map((x) => x.titulo))),
      ];
      if (dossiers.some((d) => d.requirements.length) && !missing.length)
        continue;
      const days = Math.round(
        (Date.parse(cycle.preparar_ate! + "T00:00:00Z") -
          Date.parse(today + "T00:00:00Z")) /
          86400000
      );
      if (days > p.antecedencia_dias) continue;
      result.push({
        id: `fornecimento-planejamento-v103-${p.id}-${cycle.id}-${cycle.preparar_ate}`,
        kind: "alert",
        categoria: "renovacao",
        titulo:
          days < 0
            ? "Prazo de preparação passou"
            : days === 0
            ? "Prepare os documentos hoje"
            : "Prepare a documentação do fornecimento",
        mensagem: supplyPreparationMessage({
          processTitle: p.titulo,
          deadline: cycle.preparar_ate!,
          missing,
          daysRemaining: days,
        }),
        urgencia: days <= 1 ? "alta" : "media",
        gravidadeSeguranca: days <= 1 ? "importante" : "atencao",
        confianca: "alta",
        amostra: 1,
        entidadeTipo: "medicamento",
        entidadeId: med.id,
        relacoesContextuais: [
          { tipo: "fornecimento", id: p.id },
          ...(cycle.consulta_id
            ? [{ tipo: "consulta", id: cycle.consulta_id }]
            : []),
        ],
        link: `/saude/fornecimento?id=${encodeURIComponent(
          p.id
        )}&ciclo_id=${encodeURIComponent(cycle.id)}`,
        evidencias: [
          `Prazo informado: ${cycle.preparar_ate}`,
          `Etapa: ${cycle.motivo || "não informada"}`,
        ],
        fontesInternas: ["Fornecimento", "Documentos de Saúde"],
        acaoSegura: "Organize os documentos e o atendimento com o prescritor.",
        limitacaoSeguranca:
          "O prazo foi registrado pelo usuário. O Vault não valida o conteúdo dos documentos nem altera a prescrição.",
      });
    }
  }
  return result;
}
