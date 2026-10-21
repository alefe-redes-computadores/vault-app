// app/saude/renovacao/nova-receita/page.tsx
"use client";
import { HealthRelationPicker } from "@/components/saude/HealthRelationPicker";
import { CustomDatePicker } from "@/components/DatePicker";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Pill,
  Save,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";
import { useDocumentActions } from "@/hooks/useDocuments";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  calcularDataValidadeReceita,
} from "@/lib/health-insights";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import {
  deleteFile,
  uploadFile,
} from "@/lib/supabase/storage";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  Button,
} from "@/components/ui/Button";

import {
  TextArea,
} from "@/components/ui/TextArea";

function NovaReceitaContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    user,
  } =
    useAuth();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    addRenovacao,
  } =
    useRenovacoes();
  const { createDocument, deleteDocument } = useDocumentActions();

  const medicamentoIdParam =
    searchParams.get(
      "medicamento_id"
    ) ||
    "";

  const rawReturnTo =
    searchParams.get(
      "return_to"
    );

  const returnTo =
    rawReturnTo?.startsWith("/") &&
    !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/saude/renovacao";

  const medicamentosAtivos =
    useMemo(
      () =>
        medicamentos
          .filter(
            (
              medicamento
            ) =>
              medicamento.status !==
                "descontinuado" &&
              (
                !activePersonId ||
                medicamento.person_id ===
                  activePersonId
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
          ),
      [
        medicamentos,
        activePersonId,
      ]
    );

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState(
      medicamentoIdParam
    );

  const [
    medicoId,
    setMedicoId,
  ] =
    useState(
      ""
    );

  const [
    dataReceita,
    setDataReceita,
  ] =
    useState(
      getLocalTodayISO()
    );

  const [
    proximaRenovacao,
    setProximaRenovacao,
  ] =
    useState(
      ""
    );

  const [
    observacoes,
    setObservacoes,
  ] =
    useState(
      ""
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    localFile,
    setLocalFile,
  ] = useState<File | null>(null);

  const [
    attachmentName,
    setAttachmentName,
  ] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const selectedMedicamento =
    useMemo(
      () =>
        medicamentosAtivos.find(
          (
            medicamento
          ) =>
            medicamento.id ===
            medicamentoId
        ),
      [
        medicamentosAtivos,
        medicamentoId,
      ]
    );

  useEffect(
    () => {
      if (
        !selectedMedicamento
      ) {
        setMedicoId(
          ""
        );

        setProximaRenovacao(
          ""
        );

        return;
      }

      setMedicoId(
        selectedMedicamento.medico_id ||
        ""
      );

      const next =
        calcularDataValidadeReceita(
          dataReceita,
          selectedMedicamento.tipo_receita ||
            30
        );

      setProximaRenovacao(
        next ||
        ""
      );
    },
    [
      selectedMedicamento,
      dataReceita,
    ]
  );

  const selectAttachment = (file: File, nameOverride?: string) => {
    trigger("vibrate");
    setLocalFile(file);
    setAttachmentName(nameOverride || file.name);
  };

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>, camera = false) => {
    const file = event.target.files?.[0];
    if (file) selectAttachment(file, camera ? `receita_${Date.now()}.jpg` : undefined);
    event.target.value = "";
  };

  const handleSave =
    async () => {
      if (
        saving
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        return;
      }

      if (
        !selectedMedicamento?.id
      ) {
        trigger(
          "error"
        );

        return;
      }

      setSaving(
        true
      );

      let uploadedStorageUrl: string | undefined;
      let createdDocumentId: string | undefined;

      try {
        if (localFile) {
          if (!user) throw new Error("É necessário estar autenticado para enviar a receita.");
          const uploaded = await uploadFile(user.id, localFile, "receitas");
          if (uploaded.error || !uploaded.url) throw new Error("Não foi possível enviar o anexo da receita.");
          uploadedStorageUrl = uploaded.url;
        }

        // A receita é um documento de saúde próprio, ligado ao medicamento.
        // A renovação aponta para ele, sem reaproveitar a receita anterior.
        createdDocumentId = await createDocument({
          category_id: "saude",
          type: "receita",
          title: `Receita — ${selectedMedicamento.nome}`,
          description: observacoes.trim() || undefined,
          metadata: {
            prescription_date: dataReceita,
            ...(proximaRenovacao ? { renewal_date: proximaRenovacao } : {}),
            medicamento_id: selectedMedicamento.id,
          },
          attachments: uploadedStorageUrl && localFile ? [{
            id: crypto.randomUUID(),
            url: uploadedStorageUrl,
            name: attachmentName || localFile.name,
            type: localFile.type.startsWith("image/") ? "image" : "pdf",
            uploaded_at: new Date().toISOString(),
          }] : [],
          is_favorite: false,
          medico_id: medicoId || undefined,
          entidade_tipo: "medicamento",
          entidade_id: selectedMedicamento.id,
        });

        await addRenovacao(
          {
            medicamento_id:
              selectedMedicamento.id,

            document_id: createdDocumentId,

            medico_id:
              medicoId ||
              undefined,

            /*
             * Este evento NÃO é uma aquisição.
             *
             * O repository preserva estoque, farmácia e
             * retirada atual do medicamento.
             */
            tipo_aquisicao:
              undefined,

            quantidade:
              undefined,

            preco:
              undefined,

            data:
              dataReceita,

            data_aquisicao:
              undefined,

            anexo_url:
              uploadedStorageUrl,

            observacoes:
              observacoes.trim() ||
              undefined,
          },
          {
            somenteReceita:
              true,

            proximaRenovacao:
              proximaRenovacao ||
              null,
          }
        );

        trigger(
          "success"
        );

        router.replace(
          returnTo
        );
      } catch (
        error
      ) {
        if (createdDocumentId) {
          try {
            await deleteDocument(createdDocumentId);
          } catch (cleanupError) {
            console.error("[NovaReceita] Falha ao limpar documento órfão:", cleanupError);
          }
        } else if (uploadedStorageUrl) {
          try {
            await deleteFile(uploadedStorageUrl);
          } catch (cleanupError) {
            console.error("[NovaReceita] Falha ao limpar anexo órfão:", cleanupError);
          }
        }
        console.error(
          "[NovaReceita] Falha ao registrar receita:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-10">
        <header className="sticky top-0 z-30 border-b border-surface-border/40 bg-void/90 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.replace(
                  returnTo
                );
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  18
                }
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText
                  size={
                    14
                  }
                  className="text-violet-300"
                />

                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-violet-300">
                  Prescrição
                </p>
              </div>

              <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                Renovar somente a receita
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-5">
          <div className="rounded-[26px] border border-violet-400/20 bg-violet-400/[0.06] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                <FileText
                  size={
                    17
                  }
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-ink-primary">
                  Só a nova prescrição
                </p>

                <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                  Use quando a receita foi renovada, mas você ainda não comprou nem retirou o medicamento. O estoque e a aquisição atual não serão alterados.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Pill
                  size={
                    13
                  }
                  className="text-amber-400"
                />

                Medicamento
              </label>

              <HealthRelationPicker title="Selecionar medicamento" medications={medicamentos}
                value={
                  medicamentoId
                }
                onValueChange={
                  (
                    event
                  ) =>
                    setMedicamentoId(
                      event
                    )
                }
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              >
                <option value="">
                  Selecione um medicamento
                </option>

                {medicamentosAtivos.map(
                  (
                    medicamento
                  ) => (
                    <option
                      key={
                        medicamento.id
                      }
                      value={
                        medicamento.id
                      }
                    >
                      {medicamento.nome}
                      {medicamento.dosagem
                        ? ` · ${medicamento.dosagem}`
                        : ""}
                    </option>
                  )
                )}
              </HealthRelationPicker>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Calendar
                  size={
                    13
                  }
                  className="text-ice"
                />

                Data da nova receita
              </label>

              <CustomDatePicker

                value={
                  dataReceita
                }
                onChange={
                  (
                    event
                  ) =>
                    setDataReceita(
                      event
                    )
                }
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Calendar size={13} className="text-violet-300" />
                Planejar próxima revisão da receita
              </label>
              <CustomDatePicker
                value={proximaRenovacao}
                onChange={setProximaRenovacao}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-violet-400/50"
              />
              <p className="mt-1.5 text-[10px] leading-4 text-ink-muted">
                O Vault sugere pela validade cadastrada, mas você pode usar o dia real em que pretende solicitar a próxima receita.
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-primary">
                <Stethoscope
                  size={
                    13
                  }
                  className="text-sky-400"
                />

                Médico
              </label>

              <HealthRelationPicker title="Selecionar prescritor" kind="doctor"
                value={
                  medicoId
                }
                onValueChange={
                  (
                    event
                  ) =>
                    setMedicoId(
                      event
                    )
                }
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-ice/50"
              >
                <option value="">
                  Sem médico vinculado
                </option>

                {medicos.map(
                  (
                    medico
                  ) => (
                    <option
                      key={
                        medico.id
                      }
                      value={
                        medico.id
                      }
                    >
                      {medico.nome}
                      {medico.especialidade
                        ? ` · ${medico.especialidade}`
                        : ""}
                    </option>
                  )
                )}
              </HealthRelationPicker>
            </div>
          </div>

          <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold text-ink-primary">Anexo da receita</p><p className="mt-1 text-[10px] text-ink-muted">Foto ou PDF fica ligado a este registro, sem criar aquisição.</p></div>
              {attachmentName ? <button type="button" onClick={() => { setLocalFile(null); setAttachmentName(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/20 text-rose-300" aria-label="Remover anexo"><X size={16}/></button> : null}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(event) => handleAttachment(event)} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleAttachment(event, true)} />
            {attachmentName ? <div className="mt-3 truncate rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-3 text-xs font-semibold text-emerald-200">{attachmentName}</div> : <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.05] text-xs font-semibold text-violet-200"><Upload size={15}/>Escolher arquivo</button><button type="button" onClick={() => cameraInputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] text-xs font-semibold text-emerald-200"><Camera size={15}/>Fotografar</button></div>}
          </div>

          {selectedMedicamento && (
            <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={
                    17
                  }
                  className="mt-0.5 shrink-0 text-emerald-400"
                />

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-primary">
                    O que será atualizado
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                    A receita atual de{" "}
                    <strong className="text-ink-primary">
                      {selectedMedicamento.nome}
                    </strong>{" "}
                    passa a ser a de{" "}
                    {dataReceita
                      .split(
                        "-"
                      )
                      .reverse()
                      .join(
                        "/"
                      )}
                    {proximaRenovacao
                      ? `. A próxima referência de renovação fica em ${proximaRenovacao
                          .split(
                            "-"
                          )
                          .reverse()
                          .join(
                            "/"
                          )}.`
                      : "."}
                  </p>

                  <p className="mt-2 text-[10px] leading-4 text-emerald-300">
                    Estoque, farmácia, preço, quantidade e retirada agendada permanecem intactos.
                  </p>
                </div>
              </div>
            </div>
          )}

          <TextArea
            label="Observações"
            value={
              observacoes
            }
            onChange={
              (
                event
              ) =>
                setObservacoes(
                  event.target.value
                )
            }
            placeholder="Ex.: receita renovada na consulta; compra será feita quando o estoque estiver próximo do fim."
            rows={
              4
            }
          />

          <Button
            size="lg"
            fullWidth
            onClick={
              handleSave
            }
            disabled={
              saving ||
              !activePersonId ||
              !selectedMedicamento
            }
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saving ? (
              <Loader2
                size={
                  16
                }
                className="animate-spin"
              />
            ) : (
              <Save
                size={
                  16
                }
              />
            )}

            {saving
              ? "Salvando..."
              : "Registrar nova receita"}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}

export default function NovaReceitaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-void">
          <Loader2
            className="animate-spin text-ice"
            size={
              24
            }
          />
        </div>
      }
    >
      <NovaReceitaContent />
    </Suspense>
  );
}
