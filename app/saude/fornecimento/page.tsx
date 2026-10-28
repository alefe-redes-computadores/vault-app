"use client";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthRelationPicker } from "@/components/saude/HealthRelationPicker";
import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { triggerHaptic } from "@/lib/haptics";
import { SusCatalogBrowser } from "@/components/saude/SusCatalogBrowser";
import { SupplyPreparation } from "@/components/saude/SupplyPreparation";
import { ClinicalListSummary } from "@/components/saude/ClinicalListSummary";
import { ClinicalSectionNav } from "@/components/saude/ClinicalSectionNav";
import { SupplyProcessJourney } from "@/components/saude/SupplyProcessJourney";
import { ListPageHeader } from "@/components/list/ListPageHeader";
import {
  catalogIndications,
  catalogSourceVersion,
  searchSusCatalog,
  medicationSusQuery,
  catalogEntry,
} from "@/lib/health-supply/catalog";
import { useAuth } from "@/hooks/useAuth";
import { useCids } from "@/hooks/useCids";
import { getClinicalTheme } from "@/lib/health-utils";
import { SupplyChoiceIcon } from "@/components/saude/SupplyChoiceIcon";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import { isSupplyMedicationEligible, canTrackSupplyMedication } from "@/lib/health-supply/medication-eligibility";
import { calculateBottleReference } from "@/lib/health-supply/bottle-reference";
import { SupplyCycleSummary } from "@/components/saude/SupplyCycleSummary";
import { treatmentSupplyMedicationIds, cycleDocumentContext } from "@/lib/health-supply/cycle-context";
import { resolveProcessSelection, purchaseHistory, compatibleCycleWithdrawals, documentMedicationId, prioritizedSupplyDocuments, monthlySupplyReference, supplyDocumentLabel } from "@/lib/health-supply/presentation";
import { medicationSupplyRoute } from "@/lib/health-supply/route-authority";
import { useSearchParams } from "next/navigation";
import { useReturnContext } from "@/hooks/useReturnContext";
import {
  FolderHeart,
  Plus,
  FileText,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";
import { prescriptionConfigurationReview } from "@/lib/health-supply/process-integrity";
import { withdrawalSupplySuggestions } from "@/lib/health-supply/withdrawal-suggestions";
import { useHealthSupply } from "@/hooks/useHealthSupply";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useRetiradas } from "@/hooks/useRetiradas";
import { useDocuments } from "@/hooks/useDocuments";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useLocais } from "@/hooks/useLocais";
import { useToast } from "@/components/ToastProvider";
import { ContextualHealthIntelligence } from "@/components/vault-intelligence/ContextualHealthIntelligence";
import { healthSupplyRepository as repo } from "@/lib/repositories/healthSupply";
import {
  SUPPLY_ORIGIN_LABELS,
  SUPPLY_REASON_LABELS,
} from "@/lib/health-supply/types";
import type {
  SupplyProcess,
  SupplyCycle,
  SupplyItem,
  SupplyDocumentKind,
  SupplyData,
  SupplyCycleReason,
} from "@/lib/health-supply/types";
import type {
  Medicamento,
  Retirada,
  Document as HealthDocument,
} from "@/lib/types";
import { estimatedCycleEnd, supplyChecklist } from "@/lib/health-supply/rules";
import { getLocalTodayISO } from "@/lib/health-utils";
import { buildSupplyProcessView, buildSupplyRelationshipIndex } from "@/lib/health-supply/relationship-index";
const input =
  "mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-emerald-400/60";
const button =
  "min-h-11 rounded-xl bg-surface-raised px-3 py-3 text-xs font-bold text-ink-primary disabled:opacity-40";
const panel = "rounded-[24px] border border-surface-border/60 bg-surface p-4";
const originTone:Record<SupplyProcess["origem"],string>={comprado:"border-rose-400/20 bg-rose-400/10 text-rose-300",municipal:"border-emerald-400/20 bg-emerald-400/10 text-emerald-300",estadual_ceaf:"border-violet-400/20 bg-violet-400/10 text-violet-300",farmacia_popular:"border-amber-400/20 bg-amber-400/10 text-amber-300",outro:"border-surface-border bg-surface-raised text-ink-muted"};
const fmt = (v: string | null) =>
  v ? v.split("-").reverse().join("/") : "Não confirmado";
type Run = (action: () => Promise<unknown>, message?: string) => Promise<void>;
function ProcessForm({
  initial,
  medicationId,
  onSave,
  run,
  meds,
  seed,
  personId,
  withdrawals,
}: {
  personId: string;
  withdrawals: Retirada[];
  seed?: Retirada | null;
  initial?: SupplyProcess;
  medicationId: string | null;
  onSave: (
    values: Omit<
      SupplyProcess,
      "id" | "user_id" | "person_id" | "created_at" | "updated_at" | "synced"
    >,
    ids: string[]
  ) => Promise<unknown>;
  run: Run;
  meds: Medicamento[];
}) {
  const { user } = useAuth();
  const { tratamentos: existingTreatments } = useTratamentos();
  const [treatmentId, setTreatmentId] = useState("");
  const { medicos } = useMedicos(),
    { farmacias } = useFarmacias(),
    { locais } = useLocais();
  const [values, set] = useState({
    titulo: initial?.titulo || (seed?.medicamento_nome ? `${seed.medicamento_nome} · fornecimento` : ""),
    uf: initial?.uf || "MG",
    indicacao: initial?.indicacao || null,
    catalogo_versao: initial?.catalogo_versao || catalogSourceVersion,
    origem: initial?.origem || ("outro" as SupplyProcess["origem"]),
    status: initial?.status || ("ativo" as SupplyProcess["status"]),
    farmacia_id: initial?.farmacia_id || seed?.farmacia_id || null,
    medico_id: initial?.medico_id || seed?.medico_id || null,
    local_id: initial?.local_id || seed?.local_id || null,
    protocolo: initial?.protocolo || null,
    renovacao_meses: initial?.renovacao_meses ?? null,
    antecedencia_dias: initial?.antecedencia_dias ?? 30,
    receita_cada_retirada: initial?.receita_cada_retirada ?? seed?.exige_nova_receita ?? false,
    observacoes: initial?.observacoes || null,
  });
  const [selected, select] = useState<string[]>(
    medicationId ? [medicationId] : []
  );
  const [antecedenciaText, setAntecedenciaText] = useState(String(values.antecedencia_dias));
  const field = <K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K]
  ) => set((old) => ({ ...old, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(async()=>{
          if(!values.titulo.trim())throw new Error("Informe um nome para o fornecimento.");
          if(!initial&&!selected.length)throw new Error("Selecione ao menos um medicamento.");
          if(!initial && selected.some(id => !meds.some(m => m.id === id && canTrackSupplyMedication(m, withdrawals, personId, user?.id || "")))) throw new Error("A seleção mudou. Confira os medicamentos disponíveis antes de salvar.");
          if (!/^\d{1,3}$/.test(antecedenciaText) || Number(antecedenciaText)>180) throw new Error("Informe a antecedência entre 0 e 180 dias.");
           return onSave({...values, antecedencia_dias: Number(antecedenciaText)}, selected);
        },initial?"Processo atualizado":"Fornecimento organizado");
      }}
      onInvalid={()=>{try{triggerHaptic("error");}catch{}}}
      className="space-y-3"
    >
      {seed&&!initial&&<p role="status" className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200">Dados reaproveitados da retirada de {fmt(seed.data)}. Confira os vínculos e escolha a origem do fornecimento. Quantidade, periodicidade e autorização não são presumidas.</p>}
      {!initial ? <div className="space-y-2">
        <HealthRelationPicker title="Reaproveitar tratamento existente" renderIcon={value=>{const t=existingTreatments.find(x=>x.id===value);const Icon=getVaultTreatmentIcon(t?.nome||"");return <Icon size={20} style={{color:t?.cor || "#8b5cf6"}}/>;}} value={treatmentId} onValueChange={id=>{setTreatmentId(id);const t=existingTreatments.find(t=>t.id===id&&t.person_id===personId&&t.user_id===user?.id);if(t){const ids=treatmentSupplyMedicationIds(t,meds,personId,user!.id,withdrawals);select(ids);set(v=>({...v,titulo:v.titulo||`${t.nome} · fornecimento`}));}}} className={input}>
          <option value="">Escolher tratamento · opcional</option>{existingTreatments.filter(t=>t.id&&t.person_id===personId&&t.user_id===user?.id&&t.status!=='concluido').map(t=><option key={t.id} value={t.id}>{t.nome}{t.status === "suspenso" ? " · tratamento suspenso (SOS permitido)" : ""}</option>)}
        </HealthRelationPicker>
        {treatmentId && !selected.length ? <p className="text-xs text-amber-300">Nenhum medicamento disponível foi encontrado neste tratamento. Confira os vínculos em Medicamentos e os processos ativos antes de continuar.</p> : null}
        <p className="text-[11px] leading-relaxed text-ink-muted">Reaproveita medicamentos disponíveis do tratamento. Revise a seleção e retire os que não pertencem a este fornecimento; não cria outro tratamento nem duplica medicamento.</p>
      </div>:null}
      <label className="block text-xs text-ink-muted">
        Nome para identificar este fornecimento
        <input
          required
          className={input}
          value={values.titulo}
          onChange={(e) => field("titulo", e.target.value)}
          placeholder="Ex.: Metadona · Farmácia Estadual"
        />
      </label>
      <label className="block text-xs text-ink-muted">
        Onde este medicamento é fornecido
        <HealthRelationPicker title="Origem do fornecimento" renderIcon={value=><SupplyChoiceIcon group="origin" value={value}/>}
          className={input}
          value={values.origem}
          onValueChange={(e) => {
            const origem = e;
            set((v) => ({
              ...v,
              origem: origem as SupplyProcess["origem"],
              indicacao: null,
              receita_cada_retirada:
                origem === "estadual_ceaf" || origem === "farmacia_popular"
                  ? true
                  : v.receita_cada_retirada,
              renovacao_meses:
                origem === "estadual_ceaf" ? v.renovacao_meses ?? 6 : null,
            }));
          }}
        >
          {Object.entries(SUPPLY_ORIGIN_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </HealthRelationPicker>
      </label>
      <p className="text-[11px] leading-relaxed text-ink-muted">
        A origem é independente do endereço de retirada. O CEAF também pode ser
        entregue em uma unidade municipal.
      </p>
      {(values.origem === "estadual_ceaf" ||
        values.origem === "farmacia_popular") && (
        <div className="space-y-3 rounded-2xl bg-surface-raised p-3">
          <label className="block text-xs text-ink-muted">
            Estado do atendimento
            <input
              maxLength={2}
              className={input}
              value={values.uf}
              onChange={(e) =>
                field("uf", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
              }
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Indicação registrada no processo
            <HealthRelationPicker title="Indicação do tratamento"
              className={input}
              value={values.indicacao || ""}
              onValueChange={(e) => field("indicacao", e || null)}
            >
              <option value="">Conferir com o médico / unidade</option>
              {catalogIndications(values.origem).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </HealthRelationPicker>
          </label>
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Selecione a indicação documentada pelo médico. O catálogo estadual
            disponível nesta versão é de Minas Gerais.
          </p>
        </div>
      )}
      {!initial && (
        <fieldset>
          <legend className="text-xs text-ink-muted">Medicamentos deste processo</legend>
          {!meds.some(m => m.id && canTrackSupplyMedication(m, withdrawals, personId, user?.id || "")) && <p className="mt-2 text-xs text-amber-200">Nenhum medicamento disponível. Confira os processos ativos ou cadastre um medicamento na área de Medicamentos.</p>}
          <div className="mt-2 space-y-2">
            {meds
              .filter((m) => m.id && canTrackSupplyMedication(m, withdrawals, personId, user?.id || ""))
              .map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-ink-faint bg-surface checked:border-emerald-400 checked:bg-emerald-400 checked:shadow-[inset_0_0_0_4px_#10151c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    checked={selected.includes(m.id!)}
                    onChange={(e) =>
                      select((a) =>
                        e.target.checked
                          ? [...a, m.id!]
                          : a.filter((x) => x !== m.id)
                      )
                    }
                  />
                  <MedicationFormatIcon formato={m.formato} cores={m.cores} size={24} /><span className="min-w-0 flex-1">{m.nome} · {m.dosagem}{m.status === "descontinuado" && <span className="mt-0.5 block text-[10px] text-amber-300">{m.tipo_uso === "sos" ? "SOS · rotina descontinuada" : "Histórico · retirada já registrada"}</span>}</span>
                </label>
              ))}
          </div>
        </fieldset>
      )}
      {[
        { key: "farmacia_id", label: "Farmácia de retirada", rows: farmacias },
        { key: "medico_id", label: "Prescritor responsável", rows: medicos },
        { key: "local_id", label: "Local de atendimento", rows: locais },
      ].map(({ key, label, rows }) => (
        <label key={key} className="block text-xs text-ink-muted">
          {label}
          <HealthRelationPicker title={label} kind={key === "medico_id" ? "doctor" : key === "farmacia_id" ? "pharmacy" : key === "hospital_id" ? "hospital" : "place"}
            className={input}
            value={String(values[key as keyof typeof values] || "")}
            onValueChange={(e) =>
              field(key as keyof typeof values, e || null)
            }
          >
            <option value="">Não informado</option>
            {rows.filter((x) => x.user_id === user?.id).map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </HealthRelationPicker>
        </label>
      ))}
      <label className="block text-xs text-ink-muted">
        Protocolo
        <input
          className={input}
          value={values.protocolo || ""}
          onChange={(e) => field("protocolo", e.target.value || null)}
        />
      </label>
      {values.origem === "estadual_ceaf" && (
        <label className="block text-xs text-ink-muted">
          Periodicidade informada pela unidade (meses)
          <input
            type="number"
            min={1}
            max={24}
            className={input}
            value={values.renovacao_meses ?? ""}
            onChange={(e) =>
              field(
                "renovacao_meses",
                e.target.value ? Number(e.target.value) : null
              )
            }
          />
          <span className="mt-1 block text-[11px]">
            Sugestão inicial: 6 meses. O período autorizado será informado no
            ciclo.
          </span>
        </label>
      )}
      <label className="block text-xs text-ink-muted">
        Preparar renovação com antecedência (dias)
        <input
          type="number"
          min={0}
          max={180}
          className={input}
          value={antecedenciaText}
          onChange={(e) => setAntecedenciaText(e.target.value)}
          onBlur={() => {if (antecedenciaText.trim()) setAntecedenciaText(String(Number(antecedenciaText)));}}
          required
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-primary">
        <input
          type="checkbox"
                    className="h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-ink-faint bg-surface checked:border-emerald-400 checked:bg-emerald-400 checked:shadow-[inset_0_0_0_4px_#10151c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          checked={values.receita_cada_retirada}
          onChange={(e) => field("receita_cada_retirada", e.target.checked)}
        />
        Receita exigida a cada retirada
      </label>
      {meds.some(m=>(initial||selected.includes(m.id||""))&&prescriptionConfigurationReview(m,values.receita_cada_retirada))&&<p role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200">Há medicamento cadastrado com receituário controlado. Marcar esta opção como não exigida não dispensa a receita: confirme a documentação com a unidade.</p>}
      <label className="block text-xs text-ink-muted">
        Orientações da farmácia
        <textarea
          className={input}
          rows={3}
          value={values.observacoes || ""}
          onChange={(e) => field("observacoes", e.target.value || null)}
        />
      </label>
      {initial && (
        <label className="block text-xs text-ink-muted">
          Situação do processo
          <HealthRelationPicker title="Situação do processo" renderIcon={value=><SupplyChoiceIcon group="stage" value={value}/>}
            className={input}
            value={values.status}
            onValueChange={(e) =>
              field("status", e as SupplyProcess["status"])
            }
          >
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado</option>
          </HealthRelationPicker>
        </label>
      )}
      <button type="submit" className={button}>
        {initial ? "Salvar processo" : "Criar processo e primeiro ciclo"}
      </button>
    </form>
  );
}
function ItemEditor({
  item,
  med,
  run,
  pid,
  process,
}: {
  process: SupplyProcess;
  item: SupplyItem;
  med?: Medicamento;
  run: Run;
  pid: string;
}) {
  const [dose, setDose] = useState(item.dosagem),
    [quantity, setQuantity] = useState(
      item.quantidade_mensal?.toString() || ""
    );
  const [pickupAmount,setPickupAmount]=useState(""),[coverageMonths,setCoverageMonths]=useState("");
  const [bottleCount,setBottleCount]=useState("1"),[bottleMl,setBottleMl]=useState(""),[bottleDrops,setBottleDrops]=useState(med?.estoque_gotas_por_ml && med.estoque_gotas_por_ml>0 ? String(med.estoque_gotas_por_ml) : ""),[bottleMonths,setBottleMonths]=useState("2");
  const bottleReference=calculateBottleReference(Number(bottleCount),Number(bottleMl),Number(bottleDrops),Number(bottleMonths));
  const isDropMedication=med?.forma_farmaceutica === "gota" || (med?.formato || "").toLocaleLowerCase("pt-BR").includes("gota");
  const monthlyReference=monthlySupplyReference(Number(pickupAmount),Number(coverageMonths));
  const [catalogId, setCatalogId] = useState(item.catalogo_id || ""),
    [query, setQuery] = useState(med ? medicationSusQuery(med) : "");
  const options = searchSusCatalog(
    query,
    process.origem,
    process.indicacao || undefined,
    40
  ).filter(
    (x) =>
      x.natureza === "medicamento" && (x.uf === "BR" || x.uf === process.uf)
  );
  const chosen = catalogEntry(catalogId);
  return (
    <form
      className="rounded-2xl bg-surface-raised p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() =>
          repo.updateItem(
            pid,
            item.id,
            dose,
            quantity ? Number(quantity) : null,
            catalogId || null
          )
        );
      }}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-ink-primary">
        {med ? <MedicationFormatIcon formato={med.formato} cores={med.cores} size={24} /> : null}
        {med?.nome || "Medicamento"}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[11px] text-ink-muted">
          Dose no processo
          <input
            required
            className={input}
            value={dose}
            onChange={(e) => setDose(e.target.value)}
          />
        </label>
        <label className="text-[11px] text-ink-muted">
          Referência mensal · opcional
          <input
            type="number"
            min="0.01"
            step="any"
            className={input}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Este campo não agenda nem antecipa retiradas. A quantidade total recebida e a próxima data ficam no registro de Retirada, separado da referência mensal.</p>
      <details className="mt-3 rounded-xl border border-surface-border p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-primary">Recebo para mais de um mês · calcular referência</summary>
        <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs text-ink-muted">Total por retirada<input className={input} type="number" min="0.01" step="any" value={pickupAmount} onChange={e=>setPickupAmount(e.target.value)}/></label><label className="text-xs text-ink-muted">Meses informados<input className={input} type="number" min="1" max="24" step="1" value={coverageMonths} onChange={e=>setCoverageMonths(e.target.value)}/></label></div>
        <p className="mt-2 text-[11px] text-ink-muted">Exemplo: 60 unidades para 2 meses = 30 por mês, usando a mesma unidade. A conta não define prescrição ou próxima retirada.</p>
        <button type="button" className={button+" mt-2"} disabled={monthlyReference===null} onClick={()=>{if(monthlyReference!==null)setQuantity(String(monthlyReference));}}>Usar referência {monthlyReference!==null?monthlyReference.toLocaleString('pt-BR'):''}</button>
      </details>
      {med && isDropMedication && <details className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-xs font-bold text-emerald-300">Frascos · volume e gotas por mês</summary>
        <p className="mb-2 text-[11px] leading-relaxed text-ink-muted">Confirme no rótulo o volume de CADA frasco e o fator de gotas/ml. O Vault não presume 20 gotas/ml nem que o frasco tenha 20 ml.</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-ink-muted">Frascos recebidos<input className={input} type="number" min="1" step="1" value={bottleCount} onChange={e=>setBottleCount(e.target.value)}/></label>
          <label className="text-[11px] text-ink-muted">Meses cobertos<input className={input} type="number" min="1" max="24" step="1" value={bottleMonths} onChange={e=>setBottleMonths(e.target.value)}/></label>
          <label className="text-[11px] text-ink-muted">ml por frasco<input className={input} type="number" min="0.1" step="any" placeholder="Conferir no rótulo" value={bottleMl} onChange={e=>setBottleMl(e.target.value)}/></label>
          <label className="text-[11px] text-ink-muted">Gotas por ml<input className={input} type="number" min="1" step="any" placeholder="Fator cadastrado/rótulo" value={bottleDrops} onChange={e=>setBottleDrops(e.target.value)}/></label>
        </div>
        {bottleReference ? <div className="mt-3 rounded-xl border border-emerald-400/15 bg-surface-raised p-3 text-xs text-ink-primary">
          <p>{bottleReference.totalMl.toLocaleString("pt-BR")} ml no total · {bottleReference.totalDrops.toLocaleString("pt-BR")} gotas estimadas</p>
          <p className="mt-1 font-bold text-emerald-300">Referência mensal: {bottleReference.monthlyMl.toLocaleString("pt-BR")} ml · {bottleReference.monthlyDrops.toLocaleString("pt-BR")} gotas</p>
          {isDropMedication && <button type="button" className={button+" mt-2"} onClick={()=>setQuantity(String(bottleReference.monthlyDrops))}>Usar referência mensal em gotas</button>}
          <p className="mt-2 text-[10px] text-ink-muted">Estimativa de quantidade, não prescrição, dose ou agendamento da retirada.</p>
        </div> : <p className="mt-2 text-[11px] text-amber-300">Informe volume e fator de conversão confirmados para calcular.</p>}
      </details>}
      {process.origem === "estadual_ceaf" ||
      process.origem === "farmacia_popular" ? (
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] text-ink-muted">
            Buscar princípio ativo no programa
            <input
              className={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: codeína"
            />
          </label>
          <label className="block text-[11px] text-ink-muted">
            Apresentação SUS confirmada
            <HealthRelationPicker title="Apresentação SUS confirmada" medication={med}
              className={input}
              value={catalogId}
              onValueChange={(e) => setCatalogId(e)}
            >
              <option value="">Sem apresentação confirmada</option>
              {chosen && !options.some((o) => o.id === chosen.id) ? (
                <option value={chosen.id}>
                  {chosen.medicamento} · {chosen.apresentacao}
                </option>
              ) : null}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.medicamento} · {o.apresentacao}
                </option>
              ))}
            </HealthRelationPicker>
          </label>
          <p className="text-[10px] leading-relaxed text-ink-muted">
            Confirme a apresentação da prescrição e a indicação do processo. A
            escolha registra uma informação sua; não aprova o fornecimento.
          </p>
        </div>
      ) : null}
      <button className={button + " mt-2"}>Salvar no ciclo</button>
      <p className="mt-2 text-[11px] text-ink-muted">
        Esse registro não altera a prescrição nem o estoque.
      </p>
    </form>
  );
}
function CyclePanel({
  cycle,
  process,
  data,
  documents,
  meds,
  withdrawal,
  withdrawals,
  run,
  pid,
}: {
  cycle: SupplyCycle;
  process: SupplyProcess;
  data: SupplyData;
  documents: HealthDocument[];
  meds: Medicamento[];
  withdrawal?: Retirada;
  withdrawals: Retirada[];
  run: Run;
  pid: string;
}) {
  const [cycleView,setCycleView]=useState<'overview'|'documents'|'medications'|'withdrawals'>(withdrawal?'withdrawals':'overview');
  useEffect(()=>{if(withdrawal?.id)setCycleView('withdrawals');},[withdrawal?.id]);
  const [status, setStatus] = useState(cycle.status),
    [start, setStart] = useState(cycle.inicio || ""),
    [end, setEnd] = useState(cycle.fim || ""),
    [notes, setNotes] = useState(cycle.observacoes || "");
  const savedFields=useRef({status:cycle.status,start:cycle.inicio||"",end:cycle.fim||"",notes:cycle.observacoes||""});
  useEffect(()=>{
    const previous=savedFields.current;
    setStatus(value=>value===previous.status?cycle.status:value);
    setStart(value=>value===previous.start?cycle.inicio||"":value);
    setEnd(value=>value===previous.end?cycle.fim||"":value);
    setNotes(value=>value===previous.notes?cycle.observacoes||"":value);
    savedFields.current={status:cycle.status,start:cycle.inicio||"",end:cycle.fim||"",notes:cycle.observacoes||""};
  },[cycle.status,cycle.inicio,cycle.fim,cycle.observacoes]);
  const [docId, setDocId] = useState(""),
    [kind, setKind] = useState<SupplyDocumentKind>(process.origem === "estadual_ceaf" ? "lme" : "receita");
  const links = data.documentos.filter((x) => x.ciclo_id === cycle.id && x.processo_id === process.id && x.person_id === pid && x.user_id === process.user_id),
    items = data.itens.filter((x) => x.ciclo_id === cycle.id && x.processo_id === process.id && x.person_id === pid && x.user_id === process.user_id);
  const documentContext = cycleDocumentContext(process, cycle, data, documents);
  const estimate =
    process.renovacao_meses && start
      ? estimatedCycleEnd(start, process.renovacao_meses)
      : null;
  const returnRoute = `/saude/fornecimento?id=${encodeURIComponent(
    process.id
  )}&ciclo_id=${encodeURIComponent(cycle.id)}${
    withdrawal?.id ? `&retirada_id=${encodeURIComponent(withdrawal.id)}` : ""
  }`;
  const newDoc = (type: "lme" | "receita" | "documento_sus") =>
    `/saude/documentos/novo?type=${type}&fornecimento_ciclo_id=${encodeURIComponent(
      cycle.id
    )}&fornecimento_tipo=${kind}&fornecimento_person_id=${encodeURIComponent(
      pid
    )}&medicamento_id=${encodeURIComponent(documentMedicationId(items.map(i=>i.medicamento_id), withdrawal?.medicamento_id))}${
      withdrawal?.id ? `&retirada_id=${encodeURIComponent(withdrawal.id)}` : ""
    }&return_to=${encodeURIComponent(returnRoute)}`;
  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-200">Ciclo registrado no aplicativo · etapa: {cycle.status}. Cadastro salvo não significa autorização confirmada.</p>
      <div role="tablist" aria-label="Tarefa do ciclo" className="grid grid-cols-2 gap-2">{([['overview','Resumo'],['withdrawals',process.origem==='comprado'?'Aquisições':'Retiradas'],['documents',process.origem==='comprado'?'Receitas':'Documentos'],['medications','Medicamentos']] as const).map(([key,label],index)=><button key={key} type="button" role="tab" tabIndex={cycleView===key?0:-1} onKeyDown={event=>{const next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:null;if(next!==null){event.preventDefault();setCycleView((['overview','withdrawals','documents','medications'] as const)[next]);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();}}} id={`tab-${cycle.id}-${key}`} aria-selected={cycleView===key} aria-controls={`pane-${cycle.id}-${key}`} onClick={()=>setCycleView(key)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold ${cycleView===key?'border-violet-400/40 bg-violet-400/10 text-violet-200':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>
      {process.origem === 'estadual_ceaf' && cycleView==='overview' ? <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
        <p className="text-sm font-semibold text-ink-primary">LME e período autorizado</p>
        <p className="mt-2 text-xs text-ink-muted">{documentContext.lmeDelivered ? 'LME marcada como entregue neste ciclo.' : documentContext.lmeLinked ? 'LME vinculada; confirme a entrega quando ocorrer.' : 'Vincule a LME já existente abaixo, sem cadastrar o arquivo novamente.'}</p>
        <p className="mt-2 text-xs text-ink-muted">{documentContext.confirmed ? `Período informado: ${fmt(cycle.inicio)} a ${fmt(cycle.fim)}. Preparar renovação a partir de ${fmt(documentContext.prepareRenewalFrom)}.` : 'A entrega do documento não confirma automaticamente o período. Informe início e fim autorizados pela unidade em Atualizar etapa, datas ou observações.'}</p>
        <p className="mt-2 text-[11px] text-ink-muted">Um ciclo pode reunir várias retiradas em dias diferentes. A próxima LME acompanha o período do processo, não a data de cada retirada. Receita para dispensação continua separada.</p>
      </div>:null}
      <details hidden={cycleView!=='documents'} className="rounded-2xl border border-surface-border bg-surface p-4">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink-primary">Planejamento de documentos · opcional</summary>
        <div className="mt-3">      <SupplyPreparation
        process={process}
        cycle={cycle}
        data={data}
        documents={documents}
        meds={meds}
        withdrawal={withdrawal}
        run={run}
        pid={pid}
      /></div>
      </details>
      <div hidden={cycleView!=='documents'} role="tabpanel" id={`pane-${cycle.id}-documents`} aria-labelledby={`tab-${cycle.id}-documents`} className={panel}>
        <p className="mb-3 text-xs leading-relaxed text-ink-muted">Receitas, LME e papéis com datas ou orientações ficam em Documentos de Saúde. Vincule o arquivo existente ou anexe um novo; a retirada continua sendo o mesmo registro.</p>
        <h2 className="text-sm font-bold text-ink-primary">
          Documentos deste fornecimento
        </h2>
        {items
          .filter(
            (i) => !withdrawal || i.medicamento_id === withdrawal.medicamento_id
          )
          .map((i) => {
            const m = meds.find((x) => x.id === i.medicamento_id);
            if (!m) return null;
            const c = supplyChecklist(
              process,
              cycle,
              m,
              withdrawal,
              data,
              documents,
              getLocalTodayISO()
            );
            if (!c.needsLme && !c.covered && !c.needsPrescription && !c.changed && !c.renewalSoon) return null;
            return (
              <div
                key={i.id}
                className="mt-3 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-ink-muted"
              >
                <p className="flex items-center gap-2 font-bold text-ink-primary"><MedicationFormatIcon formato={m.formato} cores={m.cores} size={22} />{m.nome}</p>
                {c.needsLme && (
                  <p className="mt-1">
                    LME:{" "}
                    {c.lmeReady
                      ? "preenchida e vinculada · conferir entrega"
                      : "vincular documento preenchido"}
                  </p>
                )}
                {c.covered && (
                  <p className="mt-1 text-emerald-400">
                    Período autorizado cobre{" "}
                    {withdrawal ? "esta retirada" : "a data de hoje"}.
                  </p>
                )}
                {c.needsPrescription && (
                  <p className="mt-1">
                    Receita da retirada:{" "}
                    {c.prescriptionReady
                      ? "vinculada · conferir conteúdo e validade"
                      : "pendente de vínculo"}
                  </p>
                )}
                {c.changed && (
                  <p className="mt-1 text-amber-300">
                    Dosagem diferente da registrada no ciclo. Confira a atualização
                    com a farmácia.
                  </p>
                )}
                {c.renewalSoon && (
                  <p className="mt-1 text-amber-300">
                    Prepare a renovação: o ciclo termina em {fmt(cycle.fim)}.
                  </p>
                )}
              </div>
            );
          })}
        <div className="mt-4 space-y-2">
          {links.map((l) => {
            const doc = documents.find((d) => d.id === l.document_id);
            return (
              <div
                key={l.id}
                className="rounded-xl border border-surface-border p-3"
              >
                {doc ? <Link
                  className="flex items-center gap-2 text-xs font-semibold text-ink-primary"
                  href={`/saude/documentos/detalhes?id=${encodeURIComponent(
                    l.document_id
                  )}`}
                >
                  <FileText size={15} />
                  {doc.title}
                </Link> : <p className="text-xs text-amber-200">Documento não disponível · vínculo histórico preservado</p>}
                <p className="mt-1 text-[11px] text-ink-muted">
                  {l.tipo} · {l.estado}
                  {l.retirada_id
                    ? " · documento de uma retirada"
                    : " · documento do ciclo"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    className={button}
                    onClick={() =>
                      void run(() =>
                        repo.deliverDocument(pid, l.id, l.estado !== "entregue")
                      )
                    }
                  >
                    {l.estado === "entregue"
                      ? "Voltar a preenchido"
                      : "Marcar como entregue"}
                  </button>
                  <button
                    className="text-[11px] text-ink-muted"
                    onClick={() =>
                      void run(
                        () => repo.unlinkDocument(pid, l.id),
                        "Vínculo removido; documento preservado"
                      )
                    }
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {links.length === 0 ? <p className="mt-3 text-xs text-ink-muted">Nenhum documento vinculado a este ciclo. Seus arquivos existentes continuam em Documentos de Saúde.</p> : null}
        <details className="mt-4 rounded-xl border border-surface-border p-3">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-primary">Adicionar ou vincular documento</summary>
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              repo.linkDocument(
                pid,
                cycle.id,
                docId,
                kind,
                kind === "receita" ? withdrawal?.id || null : null
              )
            );
          }}
        >
          <label className="block text-xs text-ink-muted">
            Finalidade
            <HealthRelationPicker title="Finalidade do documento" renderIcon={value=><SupplyChoiceIcon group="document" value={value}/>}
              className={input}
              value={kind}
              onValueChange={(e) => setKind(e as SupplyDocumentKind)}
            >
              {["lme", "receita", "formulario", "comprovante", "decisao"].map(
                (k) => (
                  <option key={k} value={k}>
                    {k === "lme" ? "LME" : k}
                  </option>
                )
              )}
            </HealthRelationPicker>
          </label>
          <label className="block text-xs text-ink-muted">
            Documento de Saúde existente
            <HealthRelationPicker title="Selecionar documento" renderIcon={id=><SupplyChoiceIcon group="document" value={documents.find(d=>d.id===id)?.type || "documento"}/>}
              required
              className={input}
              value={docId}
              onValueChange={(e) => setDocId(e)}
            >
              <option value="">Selecione um documento</option>
              {prioritizedSupplyDocuments(documents, pid, process.user_id, new Set(items.map(i=>i.medicamento_id)))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {supplyDocumentLabel(d)}
                  </option>
                ))}
            </HealthRelationPicker>
          </label>
          <button className={button}>Vincular documento</button>
        </form>
        <Link
          className={button + " mt-3 block text-center"}
          href={newDoc(
            kind === "lme"
              ? "lme"
              : kind === "receita"
              ? "receita"
              : "documento_sus"
          )}
        >
          <Plus size={14} className="mr-1 inline" />
          Novo documento com anexo
        </Link>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          O arquivo é salvo uma vez em Documentos de Saúde. Médico e local ficam
          no documento; o vínculo organiza este ciclo. A receita de uma retirada
          anterior não confirma a atual.
        </p>
        </details>
      </div>
      <div hidden={cycleView!=='overview'} role="tabpanel" id={`pane-${cycle.id}-overview`} aria-labelledby={`tab-${cycle.id}-overview`} className={panel}>
        <SupplyCycleSummary process={process} cycle={cycle} data={data} documents={documents} medications={meds} withdrawals={withdrawals} personId={pid} onOpen={view=>{setCycleView(view);requestAnimationFrame(()=>document.getElementById(`tab-${cycle.id}-${view}`)?.focus());}}/>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-primary">
          Ciclo de fornecimento
        </p>
        <p className="mt-2 text-sm text-ink-primary">
          {cycle.status} · {cycle.inicio && cycle.fim ? `${fmt(cycle.inicio)} a ${fmt(cycle.fim)}` : "Período ainda não informado"}
        </p>
        <details className="mt-3 rounded-xl border border-surface-border p-3">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-primary">Atualizar etapa, datas ou observações</summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              repo.updateCycle(pid, cycle.id, {
                status,
                inicio: start || null,
                fim: end || null,
                observacoes: notes || null,
              })
            );
          }}
        >
          <label className="block text-xs text-ink-muted">
            Etapa
            <HealthRelationPicker title="Etapa do ciclo" renderIcon={value=><SupplyChoiceIcon group="stage" value={value}/>}
              className={input}
              value={status}
              onValueChange={(e) =>
                setStatus(e as SupplyCycle["status"])
              }
            >
              <option value="preparando">Preparando documentos</option>
              <option value="protocolado">
                Protocolado / aguardando análise
              </option>
              <option value="autorizado">
                Autorização confirmada pela farmácia
              </option>
              <option value="encerrado">Ciclo encerrado</option>
            </HealthRelationPicker>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              Início confirmado
              <CustomDatePicker

                className={input}
                value={start}
                onChange={(e) => setStart(e)}
              />
            </label>
            <label className="text-xs text-ink-muted">
              Fim confirmado
              <CustomDatePicker

                className={input}
                value={end}
                onChange={(e) => setEnd(e)}
              />
            </label>
          </div>
          {estimate && (
            <p className="text-[11px] text-ink-muted">
              Referência de {process.renovacao_meses} meses: {fmt(estimate)}.
              Confira a data indicada pela unidade antes de preencher o fim.
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Anexar uma LME ou registrar uma retirada não autoriza o ciclo.
            Marque a autorização apenas após a confirmação da unidade.
          </p>
          <label className="block text-xs text-ink-muted">
            Observações do ciclo
            <textarea
              className={input}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className={button}>Salvar etapa e período</button>
        </form>
        </details>
      </div>
      <div hidden={cycleView!=='medications'} role="tabpanel" id={`pane-${cycle.id}-medications`} aria-labelledby={`tab-${cycle.id}-medications`} className={panel}>
        <h2 className="text-sm font-bold text-ink-primary">
          Medicamentos e quantidades
        </h2>
        {cycle.status === "preparando" && process.status === "ativo" ? (
          <details className="mt-3 rounded-xl border border-surface-border p-3">
            <summary className="cursor-pointer text-xs font-bold text-ink-primary">
              Incluir ou retirar medicamento deste ciclo
            </summary>
            <p className="mt-2 text-[11px] text-ink-muted">
              Ajuste o novo ciclo conforme a prescrição. Os ciclos anteriores e
              os medicamentos cadastrados permanecem preservados.
            </p>
            <div className="mt-2 space-y-2">
              {meds
                .filter(
                  (m) =>
                    m.id &&
                    (canTrackSupplyMedication(m,withdrawals,pid,process.user_id) ||
                      items.some((i) => i.medicamento_id === m.id)) &&
                    !data.itens.some(i => i.medicamento_id === m.id && i.processo_id !== process.id && data.processos.some(p => p.id === i.processo_id && p.status === "ativo" && p.person_id === pid && p.user_id === process.user_id))
                )
                .map((m) => (
                  <label
                    key={m.id}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
                  >
                    <input
                      type="checkbox"
                    className="h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-ink-faint bg-surface checked:border-emerald-400 checked:bg-emerald-400 checked:shadow-[inset_0_0_0_4px_#10151c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                      checked={items.some((i) => i.medicamento_id === m.id)}
                      onChange={(e) => {
                        const include = e.target.checked;
                        void run(
                          () =>
                            repo.setCycleMedication(
                              pid,
                              cycle.id,
                              m.id!,
                              include
                            ),
                          include
                            ? "Medicamento incluído neste ciclo"
                            : "Medicamento removido deste ciclo"
                        );
                      }}
                    />
                    <MedicationFormatIcon formato={m.formato} cores={m.cores} size={24} /><span className="min-w-0 flex-1">{m.nome} · {m.dosagem}{m.status === "descontinuado" && <span className="mt-0.5 block text-[10px] text-amber-300">{m.tipo_uso === "sos" ? "SOS · rotina descontinuada" : "Histórico · retirada já registrada"}</span>}</span>
                  </label>
                ))}
            </div>
          </details>
        ) : null}
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <details key={item.id} className="rounded-xl border border-surface-border bg-surface-raised p-3">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink-primary">
                {meds.find(m=>m.id===item.medicamento_id)?.nome || "Medicamento"}
                <span className="mt-1 block text-[11px] font-normal text-ink-muted">{item.dosagem} · {item.quantidade_mensal != null ? `Referência mensal: ${item.quantidade_mensal}` : "Quantidade mensal não informada"}</span>
              </summary>
            <fieldset
              disabled={
                cycle.status === "autorizado" || cycle.status === "encerrado"
              }
              key={item.id}
            >
              <ItemEditor
                key={item.id + item.updated_at}
                item={item}
                med={meds.find((m) => m.id === item.medicamento_id)}
                run={run}
                pid={pid}
                process={process}
              />
            </fieldset>
            </details>
          ))}
        </div>
      </div>
      {!withdrawal && cycleView==='withdrawals' ? process.origem==='comprado'?<div id={`pane-${cycle.id}-withdrawals`} role="tabpanel" aria-labelledby={`tab-${cycle.id}-withdrawals`} className="rounded-xl border border-rose-400/20 bg-rose-400/[.035] p-4"><p className="text-xs text-ink-muted">Compras particulares são registradas como aquisições, com data, quantidade, preço e farmácia. Não crie retirada SUS para este processo.</p>{items.map(item=><Link key={item.id} href={`/saude/renovacao/nova?medicamento_id=${encodeURIComponent(item.medicamento_id)}&return_to=${encodeURIComponent(returnRoute)}`} className="mt-2 flex min-h-11 items-center justify-between rounded-xl bg-surface-raised px-3 text-xs font-semibold text-rose-200">Registrar compra · {meds.find(m=>m.id===item.medicamento_id)?.nome||"Medicamento"}<span>›</span></Link>)}</div>:<p id={`pane-${cycle.id}-withdrawals`} role="tabpanel" aria-labelledby={`tab-${cycle.id}-withdrawals`} className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">Selecione uma retirada existente em Vincular outra retirada, acima. Datas diferentes podem pertencer ao mesmo ciclo.</p>:null}
      {withdrawal && (
        <div hidden={cycleView!=='withdrawals'} role="tabpanel" id={`pane-${cycle.id}-withdrawals`} aria-labelledby={`tab-${cycle.id}-withdrawals`} className={panel}>
          <h2 className="text-sm font-bold text-ink-primary">
            Retirada de {fmt(withdrawal.data)}
          </h2>
          <p className="mt-2 text-xs text-ink-muted">
            {withdrawal.medicamento_nome} · {withdrawal.status}
          </p>
          <button
            className={button + " mt-3"}
            disabled={withdrawal.fornecimento_ciclo_id===cycle.id}
            onClick={() =>
              void run(
                () => repo.linkWithdrawal(pid, withdrawal.id!, cycle.id),
                "Retirada vinculada ao ciclo"
              )
            }
          >
            {withdrawal.fornecimento_ciclo_id === cycle.id
              ? "Retirada vinculada a este ciclo"
              : "Vincular retirada a este ciclo"}
          </button>
        </div>
      )}
    </div>
  );
}
function Content({ supply }: { supply: ReturnType<typeof useHealthSupply> }) {
  const {user}=useAuth();
  const params = useSearchParams(),
    { data, personId, loading } = supply,
    { medicamentosIncluindoDescontinuados: medicamentos } = useMedicamentos(),
    { tratamentos } = useTratamentos(),
    { cids } = useCids(),
    { retiradas } = useRetiradas(),
    { renovacoes } = useRenovacoes(),
    documents = useDocuments(),
    { farmacias } = useFarmacias(),
    { locais } = useLocais(),
    { showToast } = useToast();
  const [selected, setSelected] = useState(params.get("id") || ""),
    [creating, setCreating] = useState(params.get("action") === "novo"),
    [editing, setEditing] = useState(false),
    [cycleId, setCycleId] = useState(params.get("ciclo_id") || ""),
    [busy, setBusy] = useState(false),
    [seed,setSeed]=useState<Retirada|null>(null),
    [withdrawalId, setWithdrawalId] = useState(params.get("retirada_id") || "");
  const createRef=useRef<HTMLElement>(null);
  const suggestions=useMemo(()=>personId?withdrawalSupplySuggestions(personId,medicamentos,retiradas,data):[],[personId,medicamentos,retiradas,data]);
  useEffect(()=>{if(!creating)return;const frame=requestAnimationFrame(()=>{createRef.current?.scrollIntoView({block:"start",behavior:"auto"});createRef.current?.querySelector<HTMLInputElement>('input:not([type="checkbox"])')?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[creating,seed?.id]);
  const busyRef = useRef(false);
  const [nextReason, setNextReason] = useState<SupplyCycleReason>("renovacao");
  const medId = params.get("medicamento_id"),
    withdrawal = seed || retiradas.find((r) => r.id === withdrawalId && r.person_id === personId);
  const fallbackBack = withdrawal
    ? `/saude/retiradas/detalhes?id=${withdrawal.id}`
    : medId
      ? `/saude/medicamentos/detalhes?id=${medId}`
      : "/saude/rede";
  const { backTarget } = useReturnContext(fallbackBack);
  const relationalIndex = useMemo(() => buildSupplyRelationshipIndex({
    personId: personId || "",
    userId: user?.id || "",
    data,
    medications: medicamentos,
    documents,
    withdrawals: retiradas,
    pharmacies: farmacias,
    places: locais,
    treatments: tratamentos,
    renewals: renovacoes,
  }), [personId, user?.id, data, medicamentos, documents, retiradas, farmacias, locais, tratamentos, renovacoes]);
  const occupiedMedicationIds = relationalIndex.activeMedicationIds;
  const availableMedications = useMemo(
    () => medicamentos.filter(m => m.id && !occupiedMedicationIds.has(m.id) && canTrackSupplyMedication(m, retiradas, personId || "", user?.id || "")),
    [medicamentos, occupiedMedicationIds, retiradas, personId, user?.id]
  );
  // V131 SUPPLY DOSSIER: immutable acquisition snapshots, never a prescription or a SUS withdrawal.
  const acquisitionSummary = (medicationIds: Set<string>) => {
    const acquisitions = purchaseHistory(renovacoes, personId || "", process?.user_id || "", medicationIds);
    const total = acquisitions.reduce((sum, r) => sum + (r.preco || 0), 0);
    return { count: acquisitions.length, total };
  };
  const processes = useMemo(() => relationalIndex.processes.filter(
    (p) => !medId || relationalIndex.medicationIdsByProcess.get(p.id)?.has(medId)
  ).sort((a,b) => Number(b.status === "ativo") - Number(a.status === "ativo") ||
    (b.updated_at || "").localeCompare(a.updated_at || "")), [relationalIndex, medId]);
  // V132 VERIFIED RELATIONS: stale selections cannot bypass person or medication filters.
  // V136 PROCESS ROUTING: URL selection only within person- and medication-scoped processes.
  const requestedProcessId = params.get("id");
  const requestedCycleId = params.get("ciclo_id");
  const requestedWithdrawalId = params.get("retirada_id") || "";
  const requestedCreate = params.get("action") === "novo";
  const requestRef = useRef(requestedProcessId);
  const requestChanged = requestRef.current !== requestedProcessId;
  useEffect(() => {
    requestRef.current = requestedProcessId;
    setSelected(requestedProcessId || "");
    setCycleId(requestedCycleId || "");
    setCreating(requestedCreate); setEditing(false); setSeed(null); setWithdrawalId(requestedWithdrawalId);
  }, [requestedProcessId, requestedCycleId, requestedWithdrawalId, requestedCreate, medId]);
  const process = resolveProcessSelection(processes, requestChanged ? requestedProcessId || "" : selected);
  const missingProcess = !!(requestChanged ? requestedProcessId : selected) && !process;
  const cycles = (relationalIndex.cyclesByProcess.get(process?.id || "") || [])
    .slice()
    .sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
    );
  const cycle =
    cycles.find((c) => c.id === cycleId) ||
    cycles.find((c) => c.id === withdrawal?.fornecimento_ciclo_id) ||
    cycles.find(
      (c) =>
        c.status === "autorizado" &&
        c.inicio &&
        c.fim &&
        (withdrawal?.data || getLocalTodayISO()) >= c.inicio &&
        (withdrawal?.data || getLocalTodayISO()) <= c.fim
    ) ||
    cycles[0];
  const processView = useMemo(() => buildSupplyProcessView(relationalIndex, processes), [relationalIndex, processes]);
  const run: Run = async (action, message = "Salvo") => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
      showToast(message, "success");
      try {
        triggerHaptic("success");
      } catch {}
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar", "error");
      try {
        triggerHaptic("error");
      } catch {}
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const processMedicationIds=relationalIndex.medicationIdsByProcess;
  const renderProcess = (p: SupplyProcess) => {
    const treatment = relationalIndex.treatmentsByProcess.get(p.id)?.[0];
    const theme = getClinicalTheme(treatment?.nome || p.titulo);
    const Icon = getVaultTreatmentIcon(treatment?.nome || p.titulo);
    const color = /^#[0-9a-f]{6}$/i.test(treatment?.cor || "") ? treatment!.cor! : theme.hex;
    const ids=processMedicationIds.get(p.id)||new Set<string>();
    const hasPrivateRoute=[...ids].some(id=>medicationSupplyRoute(id,data,renovacoes,personId||"",p.user_id).hasPrivatePurchase);
    const routeLabel=p.origem!=="comprado"&&hasPrivateRoute?`${SUPPLY_ORIGIN_LABELS[p.origem]} + comprado`:SUPPLY_ORIGIN_LABELS[p.origem];
    return (
              <button
                type="button"
                disabled={busy}
                aria-pressed={process?.id === p.id}
                aria-label={`${p.titulo} · ${routeLabel} · ${p.status=== "ativo"?"Em andamento":"Histórico"}`}
                style={{borderLeftColor: color, borderLeftWidth: 3, ...(process?.id === p.id ? {borderColor: `${color}50`, backgroundColor: "#10151c"} : {})}}
                key={p.id}
                className={
                  "flex min-h-12 w-full min-w-0 items-center rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors " + (process?.id === p.id ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-surface-border bg-surface-raised text-ink-primary")
                }
                onClick={() => {
                  setSeed(null); setWithdrawalId("");
                  setSelected(p.id);
                  setCycleId("");
                  setEditing(false);
                  setCreating(false);
                }}
              >
                <span className="flex min-w-0 items-center gap-1.5"><span className="shrink-0 rounded-lg p-1" style={{backgroundColor:`${color}18`}}><Icon size={16} style={{color}} /></span><span className="truncate text-ink-primary">{p.titulo}</span><span className={`shrink-0 text-[9px] font-normal ${hasPrivateRoute&&p.origem!=="comprado"?"text-amber-300":"text-ink-muted"}`}>{routeLabel}</span>{p.status!=="ativo"?<span className="text-[10px] font-normal text-ink-muted">Histórico</span>:<span className="sr-only">Em andamento</span>}</span>
              </button>
    );
  };
  if (!personId)
    return (
      <main className="p-5 text-ink-muted">
        Selecione uma pessoa para organizar o fornecimento.
      </main>
    );
  return (
    <main key={personId} className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-void pb-32">
      <ListPageHeader
        title="Fornecimento"
        badgeLabel="PROCESSOS E CICLOS"
        badgeColor="text-emerald-300"
        backUrl={backTarget}
      />
      <div className="min-w-0 space-y-3 px-4 pt-4 sm:px-5">
      <ClinicalSectionNav label="Áreas do fornecimento" items={[{id:"fornecimento-agora",label:"Agora",icon:<PackageCheck size={14}/>,badge:processView.cyclesInProgress},{id:"processos",label:"Processos",icon:<FolderHeart size={14}/>,badge:processView.activeProcesses.length},{id:"processo-atual",label:"Processo atual",icon:<CheckCircle2 size={14}/>},{id:"ciclo-atual",label:"Ciclo",icon:<FileText size={14}/>,badge:cycles.length}]}/>
      <div id="fornecimento-agora" className="scroll-mt-24">
      {processes.length > 0 ? <ClinicalListSummary icon={PackageCheck} eyebrow="Comando de fornecimento" title={processView.cyclesInProgress ? `${processView.cyclesInProgress} ciclo${processView.cyclesInProgress === 1 ? "" : "s"} em andamento` : "Processos organizados"} detail="SUS, compras e documentos mantêm suas origens independentes." metrics={[{label:"Ativos",value:processView.activeProcesses.length,tone:"positive"},{label:"Ciclos",value:processView.cycles},{label:"Documentos",value:processView.documents}]}/> : null}
      </div>
      <details className="rounded-[18px] border border-surface-border/60 bg-surface px-3 py-1">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-ink-primary"><FolderHeart size={18} /> Ajuda e catálogo SUS</summary>
        <p className="border-t border-surface-border/60 pt-3 text-xs leading-relaxed text-ink-muted">
          Acompanhe SUS e compras particulares com seus medicamentos, tratamentos e documentos. Consulte aquisições e retiradas pelos vínculos já registrados.
        </p>
        <p className="mt-2 rounded-xl border border-violet-400/10 bg-violet-400/[0.035] px-3 py-2 text-[11px] leading-relaxed text-ink-muted">Um tratamento pode reunir medicamentos comprados e fornecidos pelo SUS, mas cada processo preserva sua origem real.</p>
        <div className="pb-3 pt-2"><SusCatalogBrowser compact /></div>
      </details>
      {busy ? (
        <p role="status" className="mb-3 text-xs text-ink-primary">
          Salvando…
        </p>
      ) : null}
      {loading ? (
        <p className="text-xs text-ink-muted">Carregando fornecimentos…</p>
      ) : (
        <>
          {/* V156: a treatment is not a funding source; each process retains its own origin. */}
          {/* Mixed origins remain accessible without duplicating one-process navigation. */}
          {processView.treatmentGroups.length>0&&<details className="mb-3 rounded-2xl border border-surface-border bg-surface px-3 py-1"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-primary">Tratamentos · SUS e compras ({processView.treatmentGroups.length})</summary><div className="mt-2 space-y-2">{processView.treatmentGroups.map(({treatment:t,linked,purchased})=>{
            const Icon=getVaultTreatmentIcon(t.nome),color=/^#[0-9a-f]{6}$/i.test(t.cor||"")?t.cor!:"#8b5cf6";
            return <section key={t.id} className="rounded-xl border bg-surface p-3" style={{borderColor:`${color}30`,borderLeftColor:color,borderLeftWidth:3}} aria-label={`Fornecimentos de ${t.nome}`}>
              <div className="flex items-center gap-2"><Icon size={18} style={{color}}/><span className="flex-1 text-xs font-semibold">{t.nome}</span><span className="text-[10px] text-ink-muted">{linked.length} fornecimentos · {purchased.length} comprados</span></div>
              <div className="mt-2 flex flex-wrap gap-2">{linked.map(p=><button type="button" key={p.id} onClick={()=>{setSelected(p.id);setCreating(false);setEditing(false);setCycleId("");}} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-left text-[11px] text-ink-primary"><span className="font-bold">{SUPPLY_ORIGIN_LABELS[p.origem]}</span><span className="block text-ink-muted">{p.titulo}</span></button>)}</div>
              {purchased.length>0?<div className="mt-2 space-y-1.5"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Comprados · registros existentes</p>{purchased.map(m=><Link key={m.id} href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(m.id!)}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[0.035] px-3 text-xs text-ink-primary"><MedicationFormatIcon formato={m.formato} cores={m.cores} size={20}/><span className="min-w-0 flex-1 truncate">{m.nome} · {m.dosagem}</span><span className="text-rose-300">Compra ›</span></Link>)}</div>:null}
              <p className="mt-2 text-[10px] text-ink-muted">Visão conjunta: as origens, aquisições, autorizações e retiradas permanecem independentes.</p>
            </section>;
          })}</div></details>}
          <div id="processos" className="mb-3 grid min-w-0 scroll-mt-24 grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Selecionar fornecimento">
            {processView.activeProcesses.map(renderProcess)}
          </div>
            {processView.archivedProcesses.length > 0 && <details className="w-full rounded-2xl border border-surface-border p-3" open={process?.status === "encerrado"}>
              <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-muted">Arquivados · histórico ({processView.archivedProcesses.length})</summary>
              <div className="flex flex-wrap gap-2">{processView.archivedProcesses.map(renderProcess)}</div>
            </details>}
          {missingProcess && <p role="status" className="mb-4 rounded-2xl border border-amber-400/25 p-4 text-sm text-amber-200">Este processo não está disponível para a pessoa ou medicamento selecionado. Escolha um processo acima.</p>}
          {suggestions.length>0&&<details className="mb-4"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-muted">Reaproveitar dados das retiradas ({suggestions.length})</summary><section className={panel+" mb-4"} aria-label="Fornecimentos encontrados nas retiradas">
            <h2 className="text-sm font-bold text-ink-primary">Você já tem dados nas Retiradas</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">Abra um fornecimento existente ou aproveite uma retirada para começar. Nada é cadastrado até você revisar e salvar.</p>
            <div className="mt-3 space-y-2">{suggestions.map(({medication,withdrawal:record,existing})=><button type="button" disabled={busy} key={medication.id} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-3 text-left disabled:opacity-40" onClick={()=>{
              try{triggerHaptic("vibrate");}catch{}
              if(existing){setSelected(existing.id);setCycleId("");setCreating(false);setEditing(false);setSeed(record);showToast("Fornecimento existente selecionado.","success");}
              else{setSeed({...record,medicamento_nome:medication.nome});setCreating(true);setEditing(false);}
            }}><MedicationFormatIcon formato={medication.formato} cores={medication.cores} size={26}/><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-ink-primary">{medication.nome} · {medication.dosagem}</span><span className="mt-1 block text-[10px] text-ink-muted">Retirada de {fmt(record.data)} · {existing?"Já organizado":"Dados disponíveis para completar"}</span><span className="mt-1 block text-[10px] text-ink-muted">{relationalIndex.pharmacyById.get(record.farmacia_id || "")?.nome || relationalIndex.placeById.get(record.local_id || "")?.nome || "Local não informado"}</span><span className="mt-1 block text-[10px] font-semibold text-amber-300">{existing?"Abrir fornecimento":"Reaproveitar cadastro"}</span></span></button>)}</div>
          </section></details>}
          {(creating || !processes.length) && (
            <section ref={createRef} id="supply-create-form" className={panel + " mb-4 scroll-mt-24"}>
              <h2 className="mb-3 text-sm font-bold text-ink-primary">
                Organizar fornecimento
              </h2>
              <div className="mb-3 flex flex-wrap gap-2">
                {seed&&<button type="button" disabled={busy} className={button} onClick={()=>setSeed(null)}>Começar sem dados reaproveitados</button>}
                {processes.length>0&&<button type="button" disabled={busy} className={button} onClick={()=>setCreating(false)}>Voltar ao fornecimento</button>}
              </div>
              <fieldset disabled={busy}>
                <ProcessForm personId={personId}
                  key={personId + "create" + (seed?.id || "") + (medId || "")}
                  seed={seed}
                  meds={availableMedications}
                  withdrawals={retiradas}
                  medicationId={[seed?.medicamento_id, medId, withdrawal?.medicamento_id].find(id => id && !occupiedMedicationIds.has(id)) || null}
                  run={run}
                  onSave={async (v, ids) => {
                    const id = await repo.create(personId, v, ids);
                    setSelected(id);
                    setCreating(false);
                  }}
                />
              </fieldset>
            </section>
          )}
          {process && !creating && (
            <fieldset id="processo-atual" disabled={busy} className="scroll-mt-24 space-y-4 [content-visibility:auto] [contain-intrinsic-size:900px]">
              <div className={panel}>
                {/* V130 RELATIONAL EXPERIENCE: a single treatment identity and contextual navigation. */}
                {(() => {
                  const ids = processMedicationIds.get(process.id)||new Set<string>();
                  const related = relationalIndex.treatmentsByProcess.get(process.id) || [];
                  const linkedMeds = [...ids].flatMap(id => { const medication = relationalIndex.medicationById.get(id); return medication ? [medication] : []; });
                  const pharmacy = relationalIndex.pharmacyById.get(process.farmacia_id || "");
                  const place = relationalIndex.placeById.get(process.local_id || "");
                  const purchases = acquisitionSummary(ids);
                  const hasPrivateInProcess=[...ids].some(id=>medicationSupplyRoute(id,data,renovacoes,personId,process.user_id).hasPrivatePurchase);
                  const processRouteLabel=process.origem!=="comprado"&&hasPrivateInProcess?`${SUPPLY_ORIGIN_LABELS[process.origem]} + comprado`:SUPPLY_ORIGIN_LABELS[process.origem];
                  const processWithdrawals = (relationalIndex.withdrawalsByProcess.get(process.id) || []).slice().sort((a,b) => b.data.localeCompare(a.data));
                  const processDocs = relationalIndex.documentsByProcess.get(process.id) || [];
                  const processCycles = relationalIndex.cyclesByProcess.get(process.id) || [];
                  return <div className="space-y-3">
                    <SupplyProcessJourney hasProcess hasCycle={processCycles.length>0} documents={processDocs.length} events={process.origem==="comprado"?purchases.count:processWithdrawals.length} privateRoute={process.origem==="comprado"}/>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold "+originTone[process.origem]}><SupplyChoiceIcon group="origin" value={process.origem}/>{processRouteLabel}</span>
                      {hasPrivateInProcess&&process.origem!=="comprado"&&<span className="rounded-full border border-amber-300/25 bg-amber-300/[.06] px-3 py-1 text-[10px] text-amber-200">Rotas independentes</span>}
                      {process.status !== "ativo" && <span className="rounded-full border border-surface-border px-3 py-1 text-[11px] text-ink-muted">Arquivado · histórico preservado</span>}
                    </div>
                    <h2 className="text-lg font-bold text-ink-primary">{process.titulo}</h2>
                    {related.length > 0 && <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Tratamentos relacionados</p>
                      {related.map(t => { const theme = getClinicalTheme(t.nome); const Icon = getVaultTreatmentIcon(t.nome); const color = /^#[0-9a-f]{6}$/i.test(t.cor || "") ? t.cor! : theme.hex; const codes = cids.filter(c => c.person_id === personId && c.user_id === process.user_id && t.cid_ids?.includes(c.id || "")).map(c => c.codigo); return <Link key={t.id} href={`/saude/tratamentos/detalhes?id=${encodeURIComponent(t.id || "")}`} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised p-3" style={{borderLeftColor:color,borderLeftWidth:3}}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{backgroundColor:`${color}22`,color}}><Icon size={22} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-primary">{t.nome}</span><span className="block text-[11px] text-ink-muted">{codes.length ? codes.join(" · ") : "Abrir tratamento"}{t.status !== "ativo" ? " · Histórico" : ""}</span></span>
                        <span aria-hidden="true" className="text-ink-muted">›</span>
                      </Link>; })}
                    </div>}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Medicamentos vinculados</p>
                      {linkedMeds.map(m => {const route=medicationSupplyRoute(m.id||"",data,renovacoes,personId,process.user_id);return <Link key={m.id} href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(m.id || "")}`} className={`flex min-h-11 items-center gap-3 rounded-xl border bg-surface-raised px-3 py-2 ${route.mode==='hybrid'?'border-amber-300/25':'border-surface-border/60'}`}>
                        <MedicationFormatIcon formato={m.formato} cores={m.cores} size={26}/>
                        <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-primary">{m.nome} · {m.dosagem}</span><span className={`mt-1 block text-[9px] ${route.mode==='hybrid'?'text-amber-300':'text-ink-muted'}`}>{route.labels.length?route.labels.join(" + "):"Origem ainda não organizada"}{route.mode==='hybrid'?" · rotas independentes":""}</span></span><span className="text-ink-muted">›</span>
                      </Link>})}
                    </div>
                    {(pharmacy || place) && <div className="flex flex-wrap gap-2 text-xs">{pharmacy && <Link className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-emerald-200" href={`/saude/farmacias/detalhes?id=${encodeURIComponent(pharmacy.id!)}`}>{pharmacy.nome} ›</Link>}{place && <Link className="inline-flex min-h-11 items-center rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-amber-200" href={`/saude/locais/detalhes?id=${encodeURIComponent(place.id!)}`}>{place.nome} ›</Link>}</div>}
                    <p className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-surface-border/60 px-3 py-2 text-[11px] text-ink-muted" aria-label="Resumo relacional do fornecimento"><span><strong className="text-ink-primary">{processCycles.length}</strong> {processCycles.length===1?"ciclo":"ciclos"}</span><span><strong className="text-ink-primary">{processWithdrawals.length}</strong> {processWithdrawals.length===1?"retirada":"retiradas"}</span><span><strong className="text-ink-primary">{processDocs.length}</strong> {processDocs.length===1?"documento vinculado":"documentos vinculados"}</span></p>
                    <details className="group rounded-2xl border border-surface-border/60 bg-void/10 px-3 py-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-xs font-semibold text-ink-primary"><span>Histórico e relações do processo</span><span className="flex items-center gap-2 text-[9px] font-normal text-ink-muted">{processWithdrawals.length + processDocs.length + purchases.count} registro(s)<span className="transition group-open:rotate-90">›</span></span></summary>
                    <div className="vault-deferred space-y-3 border-t border-surface-border/50 py-3">
                    {processWithdrawals.length > 0 && <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Retiradas vinculadas a este processo</p>
                      {processWithdrawals.slice(0, 5).map(r => <Link key={r.id} href={`/saude/retiradas/detalhes?id=${encodeURIComponent(r.id || "")}`} className="flex items-center justify-between gap-2 rounded-xl border border-surface-border/60 bg-surface-raised p-3 text-xs text-ink-primary">
                        <span className="min-w-0 truncate">{r.medicamento_nome || "Retirada"} · {fmt(r.data)} · {r.status}</span><span className="shrink-0 text-emerald-300">Ver ›</span>
                      </Link>)}
                      {processWithdrawals.length > 5 && <p className="text-[11px] text-ink-muted">Mais {processWithdrawals.length - 5} retirada(s) no histórico.</p>}
                    </div>}
                    {/* V134: canonical documents; missing links remain visible, never fabricated. */}
                    {processDocs.length > 0 && <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Documentos vinculados · LME e receitas</p>
                      {processDocs.slice(0, 8).map(link => {
                        const doc = relationalIndex.documentById.get(link.document_id);
                        return doc ? <Link key={link.id} href={`/saude/documentos/detalhes?id=${encodeURIComponent(doc.id || "")}`} className="flex items-center justify-between gap-2 rounded-xl border border-violet-400/15 bg-violet-400/5 p-3 text-xs">
                          <span className="min-w-0"><span className="block truncate font-semibold text-ink-primary">{doc.title}</span><span className="block text-[10px] text-ink-muted">{link.tipo.toUpperCase()} · {link.estado}</span></span><span className="shrink-0 text-violet-300">Ver ›</span>
                        </Link> : <p key={link.id} className="rounded-xl border border-amber-400/20 p-3 text-xs text-amber-200">{link.tipo.toUpperCase()} · documento vinculado indisponível</p>;
                      })}
                      {processDocs.length > 8 && <p className="text-[11px] text-ink-muted">Mais {processDocs.length - 8} documento(s) nos ciclos.</p>}
                    </div>}
                    {purchases.count > 0 && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
                      <p className="text-xs font-bold text-amber-200">Compras particulares registradas</p>
                      <p className="mt-1 text-sm font-bold text-ink-primary">{purchases.total.toLocaleString("pt-BR", {style:"currency",currency:"BRL"})} <span className="text-xs font-normal text-ink-muted">em {purchases.count} registro(s) com valor</span></p>
                      <p className="mt-1 text-[11px] text-ink-muted">Compare somente apresentações equivalentes. Preço total não é preço unitário.</p>
                      <p className="mt-2 text-[11px] text-ink-muted">Confirme se embalagens e unidades são equivalentes. Os registros atuais não guardam unidade e apresentação suficientes para um ranking confiável.</p>
                      {purchaseHistory(renovacoes, personId, process.user_id, ids).slice(0, 5).map(r => <Link key={r.id} href={`/saude/renovacao/detalhes?id=${encodeURIComponent(r.id || "")}`} className="mt-2 block rounded-xl bg-surface-raised p-3 text-xs text-ink-primary">
                        <span className="block font-semibold">{r.medicamento_nome || linkedMeds.find(m => m.id === r.medicamento_id)?.nome || "Medicamento"} · {r.medicamento_dosagem || "Dosagem não registrada"}</span>
                        <span className="mt-1 block text-ink-muted">{fmt(r.data_aquisicao || r.data)} · {r.preco!.toLocaleString("pt-BR", {style:"currency",currency:"BRL"})} no total · {r.quantidade || "Quantidade não informada"}</span>
                        <span className="mt-1 block text-amber-200">{relationalIndex.pharmacyById.get(r.farmacia_id || "")?.nome || "Farmácia não informada"} · Ver aquisição ›</span>
                      </Link>)}
                      <p className="mt-1 text-[10px] text-ink-muted">Estas compras são uma rota separada, inclusive quando o medicamento também está vinculado a um processo SUS. Não representam custo do SUS, retirada gratuita nem custo específico deste processo.</p>
                    </div>}
                    {/* V133 CONTEXTUAL LINKS: deep links use real records; index links remain clearly general. */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Link className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-3 text-center font-semibold text-emerald-300" href="/saude/retiradas">Todas as retiradas ↗</Link>
                      <Link className="rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-3 text-center font-semibold text-violet-300" href="/saude/documentos">Todos os documentos ↗</Link>
                      <Link className="rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-3 text-center font-semibold text-violet-300" href="/saude/medicamentos">Medicamentos ↗</Link>
                      <Link className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-center font-semibold text-amber-300" href="/saude/renovacao">Aquisições ↗</Link>
                    </div>
                    </div>
                    </details>
                  </div>;
                })()}
                {process.protocolo && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Protocolo: {process.protocolo}
                  </p>
                )}
                <button
                  className={button + " mt-3"}
                  onClick={() => setEditing((v) => !v)}
                >
                  Editar processo e vínculos
                </button>
                {editing && (
                  <div className="mt-4">
                    <ProcessForm personId={personId}
                      key={process.id + process.updated_at}
                      initial={process}
                      meds={medicamentos.filter(m=>data.itens.some(i=>i.processo_id===process.id&&i.medicamento_id===m.id))}
                      withdrawals={retiradas}
                      medicationId={null}
                      run={run}
                      onSave={(v) =>
                        repo.updateProcess(personId, process.id, v)
                      }
                    />
                  </div>
                )}
              </div>
              <ContextualHealthIntelligence
                entityType="fornecimento"
                entityId={process.id}
              />
              <div className={panel}>
                <label className="block text-xs text-ink-muted">
                  Histórico de ciclos
                  <HealthRelationPicker title="Histórico de ciclos" renderIcon={value=><SupplyChoiceIcon group="cycle" value={value}/>}
                    className={input}
                    value={cycle?.id || ""}
                    onValueChange={(e) => setCycleId(e)}
                  >
                    {cycles.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        Ciclo {cycles.length - i} · {c.status} · {c.inicio&&c.fim?`${fmt(c.inicio)} a ${fmt(c.fim)}`:"Período ainda não informado"}
                      </option>
                    ))}
                  </HealthRelationPicker>
                </label>
                <details className="mt-3 rounded-xl border border-surface-border p-3">
                  <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-primary">Preparar outro ciclo / renovação</summary>
                <label className="mt-3 block text-xs text-ink-muted">
                  Motivo do próximo ciclo
                  <HealthRelationPicker title="Motivo do ciclo" renderIcon={value=><SupplyChoiceIcon group="reason" value={value}/>}
                    className={input}
                    value={nextReason}
                    onValueChange={(e) =>
                      setNextReason(e as SupplyCycleReason)
                    }
                  >
                    {Object.entries(SUPPLY_REASON_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </HealthRelationPicker>
                </label>
                <button
                  className={button + " mt-3"}
                  disabled={process.status !== "ativo" || cycles.some(c=>c.status === "preparando" || c.status === "protocolado")}
                  onClick={() =>
                    void run(
                      async () =>
                        setCycleId(
                          await repo.newCycle(personId, process.id, nextReason)
                        ),
                      "Próximo ciclo preparado"
                    )
                  }
                >
                  Preparar próximo ciclo
                </button>
                <p className="mt-2 text-[11px] text-ink-muted">
                  {cycles.some(c=>c.status === "preparando" || c.status === "protocolado") ? "Já existe um ciclo em preparação. Continue nele antes de abrir outro." : "O histórico fica preservado. O próximo ciclo começa sem autorização e sem documentos herdados."}
                </p>
                </details>
              </div>
              {cycle && process.origem!=="comprado" && <details className={panel}>
                <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-primary">Vincular outra retirada / selecionar registro</summary>
                <HealthRelationPicker title="Retirada relacionada ao ciclo" renderIcon={value=><SupplyChoiceIcon group="withdrawal" value={value}/>} value={withdrawal?.id || ""} className={input}
                  onValueChange={id => { setSeed(null); setWithdrawalId(id); setCycleId(cycle.id); }}>
                  <option value="">Sem retirada selecionada</option>
                  {compatibleCycleWithdrawals(retiradas, personId, process.user_id, process.id, cycle.id, new Set(data.itens.filter(i=>i.ciclo_id===cycle.id&&i.processo_id===process.id&&i.person_id===personId&&i.user_id===process.user_id).map(i=>i.medicamento_id))).map(r => <option key={r.id} value={r.id}>{r.medicamento_nome} · {fmt(r.data)} · {r.status}</option>)}
                </HealthRelationPicker>
                <p className="mt-2 text-[11px] text-ink-muted">{compatibleCycleWithdrawals(retiradas, personId, process.user_id, process.id, cycle.id, new Set(data.itens.filter(i=>i.ciclo_id===cycle.id&&i.processo_id===process.id&&i.person_id===personId&&i.user_id===process.user_id).map(i=>i.medicamento_id))).length} retirada(s) compatível(is) disponível(is). Selecionar mostra o registro; somente Vincular retirada a este ciclo salva a relação. A quantidade retirada não define automaticamente a quantidade mensal.</p>
              </details>}
              {cycle && (
                <div id="ciclo-atual" className="scroll-mt-24">
                <CyclePanel
                  key={personId + cycle.id}
                  cycle={cycle}
                  process={process}
                  data={data}
                  documents={documents.filter(d => d.person_id === personId && d.user_id === process.user_id)}
                  meds={medicamentos.filter(m => m.person_id === personId && m.user_id === process.user_id)}
                  withdrawal={withdrawal}
                  withdrawals={retiradas}
                  run={run}
                  pid={personId}
                />
                </div>
              )}
            </fieldset>
          )}
        </>
      )}
      </div>
    </main>
  );
}
export default function SupplyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-void" />}>
      <Scoped />
    </Suspense>
  );
}
function Scoped() {
  const supply = useHealthSupply();
  return <Content key={supply.personId || "none"} supply={supply} />;
}
