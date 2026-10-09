"use client";
import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { triggerHaptic } from "@/lib/haptics";
import { SusCatalogBrowser } from "@/components/saude/SusCatalogBrowser";
import { SupplyPreparation } from "@/components/saude/SupplyPreparation";
import {
  catalogIndications,
  catalogSourceVersion,
  searchSusCatalog,
  medicationSusQuery,
  catalogEntry,
} from "@/lib/health-supply/catalog";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FolderHeart,
  Plus,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { useHealthSupply } from "@/hooks/useHealthSupply";
import { useMedicamentos } from "@/hooks/useMedicamentos";
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
const input =
  "mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/60";
const button =
  "rounded-xl bg-ice/10 px-3 py-3 text-xs font-bold text-ice disabled:opacity-40";
const panel = "rounded-[24px] border border-surface-border/60 bg-surface p-4";
const fmt = (v: string | null) =>
  v ? v.split("-").reverse().join("/") : "Não confirmado";
type Run = (action: () => Promise<unknown>, message?: string) => Promise<void>;
function ProcessForm({
  initial,
  medicationId,
  onSave,
  run,
  meds,
}: {
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
  const { medicos } = useMedicos(),
    { farmacias } = useFarmacias(),
    { locais } = useLocais();
  const [values, set] = useState({
    titulo: initial?.titulo || "",
    uf: initial?.uf || "MG",
    indicacao: initial?.indicacao || null,
    catalogo_versao: initial?.catalogo_versao || catalogSourceVersion,
    origem: initial?.origem || ("outro" as SupplyProcess["origem"]),
    status: initial?.status || ("ativo" as SupplyProcess["status"]),
    farmacia_id: initial?.farmacia_id || null,
    medico_id: initial?.medico_id || null,
    local_id: initial?.local_id || null,
    protocolo: initial?.protocolo || null,
    renovacao_meses: initial?.renovacao_meses ?? null,
    antecedencia_dias: initial?.antecedencia_dias ?? 30,
    receita_cada_retirada: initial?.receita_cada_retirada ?? false,
    observacoes: initial?.observacoes || null,
  });
  const [selected, select] = useState<string[]>(
    medicationId ? [medicationId] : []
  );
  const field = <K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K]
  ) => set((old) => ({ ...old, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => onSave(values, selected));
      }}
      className="space-y-3"
    >
      <label className="block text-xs text-ink-muted">
        Nome do processo
        <input
          required
          className={input}
          value={values.titulo}
          onChange={(e) => field("titulo", e.target.value)}
          placeholder="Ex.: Tratamento de dor crônica"
        />
      </label>
      <label className="block text-xs text-ink-muted">
        Origem do fornecimento
        <select
          className={input}
          value={values.origem}
          onChange={(e) => {
            const origem = e.target.value;
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
        </select>
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
            <select
              className={input}
              value={values.indicacao || ""}
              onChange={(e) => field("indicacao", e.target.value || null)}
            >
              <option value="">Conferir com o médico / unidade</option>
              {catalogIndications(values.origem).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Selecione a indicação documentada pelo médico. O catálogo estadual
            disponível nesta versão é de Minas Gerais.
          </p>
        </div>
      )}
      {!initial && (
        <fieldset>
          <legend className="text-xs text-ink-muted">
            Medicamentos deste processo
          </legend>
          <div className="mt-2 space-y-2">
            {meds
              .filter((m) => m.id && m.status !== "descontinuado")
              .map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id!)}
                    onChange={(e) =>
                      select((a) =>
                        e.target.checked
                          ? [...a, m.id!]
                          : a.filter((x) => x !== m.id)
                      )
                    }
                  />
                  {m.nome} · {m.dosagem}
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
          <select
            className={input}
            value={String(values[key as keyof typeof values] || "")}
            onChange={(e) =>
              field(key as keyof typeof values, e.target.value || null)
            }
          >
            <option value="">Não informado</option>
            {rows.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
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
          value={values.antecedencia_dias}
          onChange={(e) => field("antecedencia_dias", Number(e.target.value))}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-primary">
        <input
          type="checkbox"
          checked={values.receita_cada_retirada}
          onChange={(e) => field("receita_cada_retirada", e.target.checked)}
        />
        Receita exigida a cada retirada
      </label>
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
          <select
            className={input}
            value={values.status}
            onChange={(e) =>
              field("status", e.target.value as SupplyProcess["status"])
            }
          >
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado</option>
          </select>
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
      <p className="text-sm font-bold text-ink-primary">
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
          Quantidade mensal
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
            <select
              className={input}
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
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
            </select>
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
  run,
  pid,
}: {
  cycle: SupplyCycle;
  process: SupplyProcess;
  data: SupplyData;
  documents: HealthDocument[];
  meds: Medicamento[];
  withdrawal?: Retirada;
  run: Run;
  pid: string;
}) {
  const [status, setStatus] = useState(cycle.status),
    [start, setStart] = useState(cycle.inicio || ""),
    [end, setEnd] = useState(cycle.fim || ""),
    [notes, setNotes] = useState(cycle.observacoes || "");
  const [docId, setDocId] = useState(""),
    [kind, setKind] = useState<SupplyDocumentKind>("lme");
  const links = data.documentos.filter((x) => x.ciclo_id === cycle.id),
    items = data.itens.filter((x) => x.ciclo_id === cycle.id);
  const estimate =
    process.renovacao_meses && start
      ? estimatedCycleEnd(start, process.renovacao_meses)
      : null;
  const returnRoute = `/saude/fornecimento?id=${encodeURIComponent(
    process.id
  )}${
    withdrawal?.id ? `&retirada_id=${encodeURIComponent(withdrawal.id)}` : ""
  }`;
  const newDoc = (type: "lme" | "receita" | "documento_sus") =>
    `/saude/documentos/novo?type=${type}&fornecimento_ciclo_id=${encodeURIComponent(
      cycle.id
    )}&fornecimento_tipo=${kind}&fornecimento_person_id=${encodeURIComponent(
      pid
    )}&medicamento_id=${encodeURIComponent(items[0]?.medicamento_id || "")}${
      withdrawal?.id ? `&retirada_id=${encodeURIComponent(withdrawal.id)}` : ""
    }&return_to=${encodeURIComponent(returnRoute)}`;
  return (
    <div className="space-y-4">
      <SupplyPreparation
        process={process}
        cycle={cycle}
        data={data}
        documents={documents}
        meds={meds}
        withdrawal={withdrawal}
        run={run}
        pid={pid}
      />
      <div className={panel}>
        <h2 className="text-sm font-bold text-ink-primary">
          Checklist de documentos
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
            return (
              <div
                key={i.id}
                className="mt-3 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-ink-muted"
              >
                <p className="font-bold text-ink-primary">{m.nome}</p>
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
                    Dose ou quantidade diferente do ciclo. Confira a atualização
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
                <Link
                  className="flex items-center gap-2 text-xs font-semibold text-ice"
                  href={`/saude/documentos/detalhes?id=${encodeURIComponent(
                    l.document_id
                  )}`}
                >
                  <FileText size={15} />
                  {doc?.title || "Documento não disponível"}
                </Link>
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
            <select
              className={input}
              value={kind}
              onChange={(e) => setKind(e.target.value as SupplyDocumentKind)}
            >
              {["lme", "receita", "formulario", "comprovante", "decisao"].map(
                (k) => (
                  <option key={k} value={k}>
                    {k === "lme" ? "LME" : k}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="block text-xs text-ink-muted">
            Documento de Saúde existente
            <select
              required
              className={input}
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
            >
              <option value="">Selecione um documento</option>
              {documents
                .filter((d) => d.category_id === "saude")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </select>
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
      </div>
      <div className={panel}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ice">
          Ciclo de fornecimento
        </p>
        <p className="mt-2 text-sm text-ink-primary">
          {cycle.status} · {fmt(cycle.inicio)} a {fmt(cycle.fim)}
        </p>
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
            <select
              className={input}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as SupplyCycle["status"])
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
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              Início confirmado
              <input
                type="date"
                className={input}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="text-xs text-ink-muted">
              Fim confirmado
              <input
                type="date"
                className={input}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
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
      </div>
      <div className={panel}>
        <h2 className="text-sm font-bold text-ink-primary">
          Medicamentos e quantidades
        </h2>
        {cycle.status === "preparando" ? (
          <details className="mt-3 rounded-xl border border-surface-border p-3">
            <summary className="cursor-pointer text-xs font-bold text-ice">
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
                    (m.status !== "descontinuado" ||
                      items.some((i) => i.medicamento_id === m.id))
                )
                .map((m) => (
                  <label
                    key={m.id}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
                  >
                    <input
                      type="checkbox"
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
                    {m.nome} · {m.dosagem}
                  </label>
                ))}
            </div>
          </details>
        ) : null}
        <div className="mt-3 space-y-3">
          {items.map((item) => (
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
          ))}
        </div>
      </div>
      {withdrawal && (
        <div className={panel}>
          <h2 className="text-sm font-bold text-ink-primary">
            Retirada de {fmt(withdrawal.data)}
          </h2>
          <p className="mt-2 text-xs text-ink-muted">
            {withdrawal.medicamento_nome} · {withdrawal.status}
          </p>
          <button
            className={button + " mt-3"}
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
  const params = useSearchParams(),
    { data, personId, loading } = supply,
    { medicamentos } = useMedicamentos(),
    { retiradas } = useRetiradas(),
    documents = useDocuments(),
    { showToast } = useToast();
  const [selected, setSelected] = useState(params.get("id") || ""),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState(false),
    [cycleId, setCycleId] = useState(params.get("ciclo_id") || ""),
    [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [nextReason, setNextReason] = useState<SupplyCycleReason>("renovacao");
  const medId = params.get("medicamento_id"),
    withdrawal = retiradas.find((r) => r.id === params.get("retirada_id"));
  const processes = data.processos.filter(
    (p) =>
      !medId ||
      data.itens.some(
        (i) => i.processo_id === p.id && i.medicamento_id === medId
      )
  );
  const process = data.processos.find((p) => p.id === selected) || processes[0];
  const cycles = data.ciclos
    .filter((c) => c.processo_id === process?.id)
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
  if (!personId)
    return (
      <main className="p-5 text-ink-muted">
        Selecione uma pessoa para organizar o fornecimento.
      </main>
    );
  return (
    <main key={personId} className="min-h-screen bg-void px-5 pb-32 pt-4">
      <header className="mb-5 flex items-center gap-3">
        <Link
          aria-label="Voltar"
          href={
            withdrawal
              ? `/saude/retiradas/detalhes?id=${withdrawal.id}`
              : medId
              ? `/saude/medicamentos/detalhes?id=${medId}`
              : "/saude"
          }
          className="rounded-xl bg-surface p-3 text-ink-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ice">
            Saúde · fornecimento
          </p>
          <h1 className="font-display text-xl font-bold text-ink-primary">
            Processos e documentos
          </h1>
        </div>
      </header>
      <div className={panel + " mb-4"}>
        <FolderHeart className="text-ice" size={22} />
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Organize onde recebe cada medicamento, prepare os documentos com
          antecedência e acompanhe a autorização e as próximas retiradas.
        </p>
      </div>
      <div className="mb-4">
        <SusCatalogBrowser />
      </div>
      {busy ? (
        <p role="status" className="mb-3 text-xs text-ice">
          Salvando…
        </p>
      ) : null}
      {loading ? (
        <p className="text-xs text-ink-muted">Carregando fornecimentos…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {processes.map((p) => (
              <button
                key={p.id}
                className={
                  button + (process?.id === p.id ? " border border-ice/50" : "")
                }
                onClick={() => {
                  setSelected(p.id);
                  setCycleId("");
                  setEditing(false);
                  setCreating(false);
                }}
              >
                {p.titulo} · {p.status}
              </button>
            ))}
            <button className={button} onClick={() => setCreating((v) => !v)}>
              <Plus size={14} className="inline" /> Novo processo
            </button>
          </div>
          {(creating || !processes.length) && (
            <section className={panel + " mb-4"}>
              <h2 className="mb-3 text-sm font-bold text-ink-primary">
                Organizar fornecimento
              </h2>
              <fieldset disabled={busy}>
                <ProcessForm
                  key={personId + "create"}
                  meds={medicamentos}
                  medicationId={medId || withdrawal?.medicamento_id || null}
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
          {process && (
            <fieldset disabled={busy} className="space-y-4">
              <div className={panel}>
                <p className="text-[10px] uppercase tracking-wider text-ice">
                  {SUPPLY_ORIGIN_LABELS[process.origem]}
                </p>
                <h2 className="mt-1 text-lg font-bold text-ink-primary">
                  {process.titulo}
                </h2>
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
                    <ProcessForm
                      key={process.id + process.updated_at}
                      initial={process}
                      meds={medicamentos}
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
                  <select
                    className={input}
                    value={cycle?.id || ""}
                    onChange={(e) => setCycleId(e.target.value)}
                  >
                    {cycles.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        Ciclo {cycles.length - i} · {c.status} · {fmt(c.inicio)}{" "}
                        a {fmt(c.fim)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-xs text-ink-muted">
                  Motivo do próximo ciclo
                  <select
                    className={input}
                    value={nextReason}
                    onChange={(e) =>
                      setNextReason(e.target.value as SupplyCycleReason)
                    }
                  >
                    {Object.entries(SUPPLY_REASON_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={button + " mt-3"}
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
                  O histórico fica preservado. O próximo ciclo começa sem
                  autorização e sem documentos herdados.
                </p>
              </div>
              {cycle && (
                <CyclePanel
                  key={personId + cycle.id + cycle.updated_at}
                  cycle={cycle}
                  process={process}
                  data={data}
                  documents={documents}
                  meds={medicamentos}
                  withdrawal={withdrawal}
                  run={run}
                  pid={personId}
                />
              )}
            </fieldset>
          )}
        </>
      )}
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
