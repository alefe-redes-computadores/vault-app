// app/saude/exames/editar/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  Camera,
  Clock,
  Eraser,
  Flame,
  HeartPulse,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { getClinicalTheme } from "@/lib/health-utils";
import {
  deleteFile,
  uploadFile,
} from "@/lib/supabase/storage";
import { cidsRepository } from "@/lib/repositories/cids";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useExames } from "@/hooks/useExames";
import { useLocais } from "@/hooks/useLocais";
import { useMedicos } from "@/hooks/useMedicos";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useTratamentos } from "@/hooks/useTratamentos";

import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";

import type {
  Attachment,
  Cid,
  Exame,
  LocalSaude,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// ANIMATION
// ============================================================

const fadeUp = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatDateToDisplay(
  isoStr?: string
): string {
  if (!isoStr) {
    return "";
  }

  const datePart =
    isoStr.includes("T")
      ? isoStr.split("T")[0]
      : isoStr;

  const parts =
    datePart.split("-");

  if (parts.length !== 3) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(
  displayStr: string
): string | undefined {
  const clean =
    displayStr.replace(/\D/g, "");

  if (clean.length !== 8) {
    return undefined;
  }

  const day = Number(
    clean.slice(0, 2)
  );

  const month = Number(
    clean.slice(2, 4)
  );

  const year = Number(
    clean.slice(4, 8)
  );

  const parsed =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return `${String(year).padStart(
    4,
    "0"
  )}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function handleDateMask(
  value: string
): string {
  const clean =
    value
      .replace(/\D/g, "")
      .slice(0, 8);

  if (clean.length > 4) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2,
      4
    )}/${clean.slice(4)}`;
  }

  if (clean.length > 2) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(2)}`;
  }

  return clean;
}

function handleTimeMask(
  value: string
): string {
  const clean =
    value
      .replace(/\D/g, "")
      .slice(0, 4);

  if (clean.length > 2) {
    return `${clean.slice(
      0,
      2
    )}:${clean.slice(2)}`;
  }

  return clean;
}

function isValidTime(
  value: string
): boolean {
  if (!value) {
    return true;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function isVaultStorageUrl(
  url?: string
): boolean {
  return Boolean(
    url &&
      url.includes(
        "/storage/v1/object/public/vault-attachments/"
      )
  );
}

function getTratamentoIcon(
  nome: string
) {
  const normalized =
    nome.toLowerCase();

  if (
    normalized.includes("tdah")
  ) {
    return Brain;
  }

  if (
    normalized.includes("dor") ||
    normalized.includes("neuropática")
  ) {
    return Flame;
  }

  if (
    normalized.includes("depress")
  ) {
    return HeartPulse;
  }

  if (
    normalized.includes("ansied") ||
    normalized.includes("ansiolítico")
  ) {
    return ShieldAlert;
  }

  return Activity;
}

function sanitizeIds(
  ids: string[] | undefined,
  validIds: Set<string>
): string[] {
  if (!ids?.length) {
    return [];
  }

  return Array.from(
    new Set(
      ids.filter((id) =>
        validIds.has(id)
      )
    )
  );
}

// ============================================================
// PAGE
// ============================================================

export default function EditarExamePage() {
  return (
    <Suspense
      fallback={<DetailSkeleton />}
    >
      <EditarExameContent />
    </Suspense>
  );
}

// ============================================================
// CONTENT
// ============================================================

function EditarExameContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id");

  const { trigger } =
    useHapticFeedback();

  const { showToast } =
    useToast();

  /*
   * Auth permanece apenas por causa do Storage.
   */
  const { user } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    getExame,
    updateExame,
  } =
    useExames();

  const {
    medicos,
    addMedico,
  } =
    useMedicos();

  const {
    locais,
    addLocal,
  } =
    useLocais();

  const {
    addTratamento,
  } =
    useTratamentos();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(false);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );

  // ==========================================================
  // DATA
  // ==========================================================

  const tratamentos =
    useLiveQuery<Tratamento[]>(
      async () => {
        if (!activePersonId) {
          return [];
        }

        return db.tratamentos
          .where("person_id")
          .equals(activePersonId)
          .toArray();
      },
      [activePersonId]
    ) ?? [];

  const cids =
    useLiveQuery<Cid[]>(
      async () => {
        if (!activePersonId) {
          return [];
        }

        return db.cids
          .where("person_id")
          .equals(activePersonId)
          .toArray();
      },
      [activePersonId]
    ) ?? [];

  // ==========================================================
  // BASE STATE
  // ==========================================================

  const [
    exame,
    setExame,
  ] =
    useState<Exame | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    nome,
    setNome,
  ] =
    useState("");

  const [
    laboratorio,
    setLaboratorio,
  ] =
    useState("");

  const [
    localId,
    setLocalId,
  ] =
    useState("");

  const [
    medico,
    setMedico,
  ] =
    useState("");

  const [
    medicoId,
    setMedicoId,
  ] =
    useState("");

  const [
    dataSolicitacaoDisplay,
    setDataSolicitacaoDisplay,
  ] =
    useState("");

  const [
    horario,
    setHorario,
  ] =
    useState("");

  const [
    dataRetornoDisplay,
    setDataRetornoDisplay,
  ] =
    useState("");

  const [
    motivo,
    setMotivo,
  ] =
    useState("");

  const [
    observacoes,
    setObservacoes,
  ] =
    useState("");

  const [
    anexoUrl,
    setAnexoUrl,
  ] =
    useState("");

  // ==========================================================
  // ATTACHMENT
  // ==========================================================

  const [
    attachment,
    setAttachment,
  ] =
    useState<Attachment | null>(
      null
    );

  const [
    localFile,
    setLocalFile,
  ] =
    useState<File | null>(
      null
    );

  // ==========================================================
  // RELATIONS
  // ==========================================================

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
  ] =
    useState<string[]>([]);

  const [
    cidsSelecionados,
    setCidsSelecionados,
  ] =
    useState<string[]>([]);

  // ==========================================================
  // MODALS
  // ==========================================================

  const [
    isTratamentoModalOpen,
    setIsTratamentoModalOpen,
  ] =
    useState(false);

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(false);

  const [
    isDoctorModalOpen,
    setIsDoctorModalOpen,
  ] =
    useState(false);

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(false);

  // ==========================================================
  // QUICK CREATE
  // ==========================================================

  const [
    isCreatingTratamento,
    setIsCreatingTratamento,
  ] =
    useState(false);

  const [
    newTratamentoName,
    setNewTratamentoName,
  ] =
    useState("");

  const [
    isSavingTratamento,
    setIsSavingTratamento,
  ] =
    useState(false);

  const [
    isCreatingDoctor,
    setIsCreatingDoctor,
  ] =
    useState(false);

  const [
    newDocName,
    setNewDocName,
  ] =
    useState("");

  const [
    newDocEspecialidade,
    setNewDocEspecialidade,
  ] =
    useState("");

  const [
    isCreatingLocal,
    setIsCreatingLocal,
  ] =
    useState(false);

  const [
    newLocalName,
    setNewLocalName,
  ] =
    useState("");

  const [
    isCreatingCid,
    setIsCreatingCid,
  ] =
    useState(false);

  const [
    newCidCodigo,
    setNewCidCodigo,
  ] =
    useState("");

  const [
    newCidDescricao,
    setNewCidDescricao,
  ] =
    useState("");

  const [
    isSavingCid,
    setIsSavingCid,
  ] =
    useState(false);

  // ==========================================================
  // ERRORS
  // ==========================================================

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<string, string>
    >({});

  const clearError = (
    key: string
  ) => {
    setErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }

      const next = {
        ...previous,
      };

      delete next[key];

      return next;
    });
  };

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/exames"
      );
      return;
    }

    if (!activePersonId) {
      setExame(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load =
      async () => {
        setIsLoading(true);

        try {
          const data =
            await getExame(id);

          if (cancelled) {
            return;
          }

          if (!data) {
            showToast(
              "Exame não encontrado para a pessoa ativa.",
              "error"
            );

            router.replace(
              "/saude/exames"
            );

            return;
          }

          const [
            allowedTratamentos,
            allowedCids,
          ] =
            await Promise.all([
              db.tratamentos
                .where("person_id")
                .equals(
                  activePersonId
                )
                .toArray(),

              db.cids
                .where("person_id")
                .equals(
                  activePersonId
                )
                .toArray(),
            ]);

          if (cancelled) {
            return;
          }

          const tratamentoIds =
            new Set<string>(
              allowedTratamentos
                .map((item) =>
                  item.id
                )
                .filter(
                  (
                    relationId
                  ): relationId is string =>
                    Boolean(
                      relationId
                    )
                )
            );

          const cidIds =
            new Set<string>(
              allowedCids
                .map((item) =>
                  item.id
                )
                .filter(
                  (
                    relationId
                  ): relationId is string =>
                    Boolean(
                      relationId
                    )
                )
            );

          setExame(data);

          setNome(
            data.nome || ""
          );

          setLaboratorio(
            data.laboratorio ||
              ""
          );

          setLocalId(
            data.local_id ||
              ""
          );

          setMedico(
            data.medico || ""
          );

          setMedicoId(
            data.medico_id ||
              ""
          );

          setDataSolicitacaoDisplay(
            formatDateToDisplay(
              data.data
            )
          );

          setHorario(
            data.horario ||
              ""
          );

          setDataRetornoDisplay(
            formatDateToDisplay(
              data.data_retorno
            )
          );

          setMotivo(
            data.motivo ||
              ""
          );

          setObservacoes(
            data.observacoes ||
              ""
          );

          setAnexoUrl(
            data.anexo_url ||
              ""
          );

          setTratamentosSelecionados(
            sanitizeIds(
              data.tratamento_ids,
              tratamentoIds
            )
          );

          setCidsSelecionados(
            sanitizeIds(
              data.cid_ids,
              cidIds
            )
          );
        } catch (error) {
          console.error(
            "Erro ao carregar exame:",
            error
          );

          if (!cancelled) {
            showToast(
              "Não foi possível carregar o exame.",
              "error"
            );

            router.replace(
              "/saude/exames"
            );
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    activePersonId,
    getExame,
    router,
    showToast,
  ]);

  // ==========================================================
  // SELECTED GLOBAL ENTITIES
  // ==========================================================

  const selectedMedico =
    medicos.find(
      (item) =>
        item.id === medicoId
    );

  const selectedLocal =
    locais.find(
      (item) =>
        item.id === localId
    );

  // ==========================================================
  // FILE
  // ==========================================================

  const setPreviewFile = (
    file: File,
    name: string
  ) => {
    if (
      attachment?.url.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        attachment.url
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    setLocalFile(file);

    setAttachment({
      id: crypto.randomUUID(),
      url: objectUrl,
      name,
      type:
        file.type.startsWith(
          "image"
        )
          ? "image"
          : "pdf",
      uploaded_at:
        new Date().toISOString(),
    });
  };

  const handleFileSelect = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      trigger("vibrate");

      setPreviewFile(
        file,
        file.name
      );
    }

    event.target.value = "";
  };

  const handleCameraCapture = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      trigger("vibrate");

      setPreviewFile(
        file,
        `exame_${Date.now()}.jpg`
      );
    }

    event.target.value = "";
  };

  const removeNewAttachment =
    () => {
      if (
        attachment?.url.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          attachment.url
        );
      }

      setAttachment(null);
      setLocalFile(null);

      trigger("vibrate");
    };

  const removeCurrentAttachment =
    () => {
      setAnexoUrl("");

      trigger("vibrate");
    };

  // ==========================================================
  // QUICK MEDICO
  // ==========================================================

  const handleCreateDoctor =
    async () => {
      const doctorName =
        newDocName.trim();

      if (!doctorName) {
        return;
      }

      trigger("vibrate");

      try {
        const newId =
          await addMedico({
            nome:
              doctorName,

            especialidade:
              newDocEspecialidade.trim() ||
              "Geral",
          });

        setMedicoId(newId);
        setMedico(doctorName);

        setIsCreatingDoctor(
          false
        );

        setNewDocName("");
        setNewDocEspecialidade(
          ""
        );

        trigger("success");

        showToast(
          "Médico cadastrado",
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao cadastrar médico:",
          error
        );

        trigger("error");

        showToast(
          "Erro ao cadastrar médico",
          "error"
        );
      }
    };

  // ==========================================================
  // QUICK LOCAL
  // ==========================================================

  const handleCreateLocal =
    async () => {
      const localName =
        newLocalName.trim();

      if (!localName) {
        return;
      }

      trigger("vibrate");

      try {
        const newId =
          await addLocal({
            nome:
              localName,

            tipo:
              "laboratorio",
          });

        setLocalId(newId);

        setLaboratorio(
          localName
        );

        setIsCreatingLocal(
          false
        );

        setNewLocalName("");

        trigger("success");

        showToast(
          "Local cadastrado",
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao cadastrar local:",
          error
        );

        trigger("error");

        showToast(
          "Erro ao cadastrar local",
          "error"
        );
      }
    };

  // ==========================================================
  // QUICK TRATAMENTO
  // ==========================================================

  const handleCreateTratamento =
    async () => {
      const treatmentName =
        newTratamentoName.trim();

      if (
        !treatmentName ||
        isSavingTratamento
      ) {
        return;
      }

      if (!activePersonId) {
        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        trigger("error");

        return;
      }

      setIsSavingTratamento(
        true
      );

      trigger("vibrate");

      try {
        const newId =
          await addTratamento({
            nome:
              treatmentName,

            status:
              "ativo",
          });

        setTratamentosSelecionados(
          (previous) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        setIsCreatingTratamento(
          false
        );

        setNewTratamentoName(
          ""
        );

        trigger("success");

        showToast(
          "Tratamento cadastrado",
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao cadastrar tratamento:",
          error
        );

        trigger("error");

        showToast(
          "Erro ao cadastrar tratamento",
          "error"
        );
      } finally {
        setIsSavingTratamento(
          false
        );
      }
    };

  // ==========================================================
  // QUICK CID
  // ==========================================================

  const handleCreateCid =
    async () => {
      const codigo =
        newCidCodigo.trim();

      const descricao =
        newCidDescricao.trim();

      if (
        !codigo ||
        !descricao ||
        isSavingCid
      ) {
        return;
      }

      if (!activePersonId) {
        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        trigger("error");

        return;
      }

      setIsSavingCid(true);

      trigger("vibrate");

      try {
        const newId =
          await cidsRepository.create(
            {
              person_id:
                activePersonId,

              codigo,

              descricao,
            }
          );

        setCidsSelecionados(
          (previous) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        setIsCreatingCid(
          false
        );

        setNewCidCodigo("");
        setNewCidDescricao("");

        trigger("success");

        showToast(
          "CID cadastrado",
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao cadastrar CID:",
          error
        );

        trigger("error");

        showToast(
          "Erro ao cadastrar CID",
          "error"
        );
      } finally {
        setIsSavingCid(false);
      }
    };

  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validate = (): boolean => {
    const newErrors:
      Record<string, string> =
      {};

    if (
      !activePersonId ||
      !exame ||
      exame.person_id !==
        activePersonId
    ) {
      newErrors.person =
        "O exame não pertence à pessoa ativa";
    }

    if (!nome.trim()) {
      newErrors.nome =
        "Nome é obrigatório";
    }

    if (
      !parseDateToISO(
        dataSolicitacaoDisplay
      )
    ) {
      newErrors.data =
        "Informe uma data válida";
    }

    if (
      dataRetornoDisplay &&
      !parseDateToISO(
        dataRetornoDisplay
      )
    ) {
      newErrors.dataRetorno =
        "Informe uma data de retorno válida";
    }

    if (
      !isValidTime(horario)
    ) {
      newErrors.horario =
        "Horário inválido (use HH:MM)";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors)
        .length === 0
    );
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSave = () => {
    if (!id) {
      return;
    }

    trigger("vibrate");

    if (!validate()) {
      trigger("error");

      showToast(
        "Revise os campos antes de salvar.",
        "error"
      );

      return;
    }

    if (
      !activePersonId ||
      !exame ||
      exame.person_id !==
        activePersonId
    ) {
      trigger("error");

      showToast(
        "Não foi possível validar o exame para a pessoa ativa.",
        "error"
      );

      return;
    }

    if (
      isSubmitLocked.current ||
      isSubmitting
    ) {
      return;
    }

    isSubmitLocked.current =
      true;

    run(
      async () => {
        let uploadedNewUrl:
          | string
          | undefined;

        let updateSucceeded =
          false;

        try {
          const dataISO =
            parseDateToISO(
              dataSolicitacaoDisplay
            );

          if (!dataISO) {
            throw new Error(
              "Data inválida"
            );
          }

          const retornoISO =
            dataRetornoDisplay
              ? parseDateToISO(
                  dataRetornoDisplay
                )
              : undefined;

          if (
            dataRetornoDisplay &&
            !retornoISO
          ) {
            throw new Error(
              "Data de retorno inválida"
            );
          }

          const validTreatmentIds =
            new Set<string>(
              tratamentos
                .map(
                  (item) =>
                    item.id
                )
                .filter(
                  (
                    relationId
                  ): relationId is string =>
                    Boolean(
                      relationId
                    )
                )
            );

          const validCidIds =
            new Set<string>(
              cids
                .map(
                  (item) =>
                    item.id
                )
                .filter(
                  (
                    relationId
                  ): relationId is string =>
                    Boolean(
                      relationId
                    )
                )
            );

          const safeTreatmentIds =
            sanitizeIds(
              tratamentosSelecionados,
              validTreatmentIds
            );

          const safeCidIds =
            sanitizeIds(
              cidsSelecionados,
              validCidIds
            );

          let finalAttachmentUrl =
            anexoUrl.trim() ||
            undefined;

          if (localFile) {
            if (!user?.id) {
              throw new Error(
                "Usuário não autenticado para upload."
              );
            }

            const {
              url,
              error,
            } =
              await uploadFile(
                user.id,
                localFile,
                "saude"
              );

            if (error) {
              throw error;
            }

            if (!url) {
              throw new Error(
                "Upload concluído sem URL."
              );
            }

            uploadedNewUrl =
              url;

            finalAttachmentUrl =
              url;
          }

          const finalDoctorName =
            medicoId
              ? selectedMedico?.nome ||
                medico.trim() ||
                undefined
              : medico.trim() ||
                undefined;

          const finalLabName =
            localId
              ? selectedLocal?.nome ||
                laboratorio.trim() ||
                undefined
              : laboratorio.trim() ||
                undefined;

          await updateExame(
            id,
            {
              nome:
                nome.trim(),

              laboratorio:
                finalLabName,

              local_id:
                localId ||
                undefined,

              medico:
                finalDoctorName,

              medico_id:
                medicoId ||
                undefined,

              data:
                dataISO,

              horario:
                horario ||
                undefined,

              data_retorno:
                retornoISO,

              motivo:
                motivo.trim() ||
                undefined,

              observacoes:
                observacoes.trim() ||
                undefined,

              anexo_url:
                finalAttachmentUrl,

              tratamento_ids:
                safeTreatmentIds.length >
                0
                  ? safeTreatmentIds
                  : undefined,

              cid_ids:
                safeCidIds.length >
                0
                  ? safeCidIds
                  : undefined,
            }
          );

          updateSucceeded =
            true;

          const oldUrl =
            exame.anexo_url?.trim();

          const newUrl =
            finalAttachmentUrl?.trim();

          if (
            oldUrl &&
            oldUrl !== newUrl &&
            isVaultStorageUrl(
              oldUrl
            )
          ) {
            const {
              error:
                deleteError,
            } =
              await deleteFile(
                oldUrl
              );

            if (deleteError) {
              console.error(
                "Exame atualizado, mas o arquivo antigo não pôde ser removido:",
                deleteError
              );

              showToast(
                "Exame salvo, mas o arquivo antigo não pôde ser removido.",
                "info"
              );
            }
          }

          if (
            attachment?.url.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              attachment.url
            );
          }
        } catch (error) {
          if (
            uploadedNewUrl &&
            !updateSucceeded &&
            isVaultStorageUrl(
              uploadedNewUrl
            )
          ) {
            const {
              error:
                rollbackError,
            } =
              await deleteFile(
                uploadedNewUrl
              );

            if (rollbackError) {
              console.error(
                "Falha ao remover upload órfão após erro no update:",
                rollbackError
              );
            }
          }

          throw error;
        } finally {
          isSubmitLocked.current =
            false;
        }
      },
      {
        successMessage:
          "Exame atualizado com sucesso",

        errorMessage:
          "Erro ao atualizar exame",

        goBackOnSuccess:
          false,
      }
    )
      .then(() => {
        router.replace(
          `/saude/exames/detalhes?id=${id}`
        );
      })
      .catch(() => {
        // useSubmitAction já trata a apresentação do erro.
      });
  };

  if (isLoading) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !activePersonId ||
    !exame
  ) {
    return null;
  }

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={
            handleFileSelect
          }
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={
            handleCameraCapture
          }
        />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.replace(
                  `/saude/exames/detalhes?id=${id}`
                );
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              aria-label="Voltar para detalhes"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Editar Exame
              </h1>

              <p className="text-xs text-ink-muted">
                Atualizar dados e laudos
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity
                  size={16}
                  className="shrink-0 text-violet-400"
                />

                <label className="text-sm font-semibold text-ink-primary">
                  Tratamentos e CIDs Vinculados
                </label>
              </div>

              {(tratamentosSelecionados.length >
                0 ||
                cidsSelecionados.length >
                  0) && (
                <button
                  type="button"
                  onClick={() => {
                    trigger(
                      "vibrate"
                    );

                    setTratamentosSelecionados(
                      []
                    );

                    setCidsSelecionados(
                      []
                    );
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                  aria-label="Limpar relações"
                >
                  <Eraser
                    size={12}
                  />

                  Limpar
                </button>
              )}
            </div>

            {tratamentosSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {tratamentosSelecionados.map(
                  (tratamentoId) => {
                    const tratamento =
                      tratamentos.find(
                        (item) =>
                          item.id ===
                          tratamentoId
                      );

                    if (!tratamento) {
                      return null;
                    }

                    const Icon =
                      getTratamentoIcon(
                        tratamento.nome
                      );

                    return (
                      <div
                        key={
                          tratamentoId
                        }
                        className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5"
                      >
                        <Icon
                          size={14}
                          className="text-violet-400"
                        />

                        <span className="text-xs font-medium text-violet-300">
                          {
                            tratamento.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );

                            setTratamentosSelecionados(
                              (
                                previous
                              ) =>
                                previous.filter(
                                  (item) =>
                                    item !==
                                    tratamentoId
                                )
                            );
                          }}
                          className="ml-1 text-violet-400/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${tratamento.nome}`}
                        >
                          <X
                            size={14}
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {cidsSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {cidsSelecionados.map(
                  (cidId) => {
                    const cid =
                      cids.find(
                        (item) =>
                          item.id ===
                          cidId
                      );

                    if (!cid) {
                      return null;
                    }

                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const Icon =
                      theme.icon;

                    return (
                      <div
                        key={cidId}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}
                      >
                        <Icon
                          size={14}
                        />

                        <span className="text-xs font-medium">
                          {cid.codigo}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );

                            setCidsSelecionados(
                              (
                                previous
                              ) =>
                                previous.filter(
                                  (item) =>
                                    item !==
                                    cidId
                                )
                            );
                          }}
                          className="ml-1 text-current/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${cid.codigo}`}
                        >
                          <X
                            size={14}
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsTratamentoModalOpen(
                    true
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300"
              >
                <Plus size={16} />

                Adicionar Tratamento
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsCidModalOpen(
                    true
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300"
              >
                <Plus size={16} />

                Adicionar CID
              </button>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.03,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Nome do Exame *"
              placeholder="Ex: Hemograma..."
              value={nome}
              onChange={(event) => {
                setNome(
                  event.target.value
                );

                clearError("nome");
              }}
              error={errors.nome}
              required
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-ink-primary">
                  Laboratório / Local
                </label>

                {(localId ||
                  laboratorio) && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setLocalId("");
                      setLaboratorio(
                        ""
                      );
                    }}
                    className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                  >
                    <Eraser
                      size={12}
                    />

                    Limpar
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsLocalModalOpen(
                    true
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <span className="truncate">
                  {selectedLocal?.nome ||
                    laboratorio ||
                    "Selecionar laboratório ou local"}
                </span>

                <Building2
                  size={16}
                  className="shrink-0 text-ink-muted"
                />
              </button>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-ink-primary">
                  Médico Solicitante
                </label>

                {(medicoId ||
                  medico) && (
                  <button
                    type="button"
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      setMedicoId("");
                      setMedico("");
                    }}
                    className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                  >
                    <Eraser
                      size={12}
                    />

                    Limpar
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsDoctorModalOpen(
                    true
                  );
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
              >
                <span className="truncate">
                  {selectedMedico?.nome ||
                    medico ||
                    "Selecionar médico"}
                </span>

                <Stethoscope
                  size={16}
                  className="shrink-0 text-ink-muted"
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink-primary">
                  Data da Coleta{" "}
                  <span className="text-coral">
                    *
                  </span>
                </label>

                <div className="relative">
                  <Calendar
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={
                      dataSolicitacaoDisplay
                    }
                    onChange={(event) => {
                      setDataSolicitacaoDisplay(
                        handleDateMask(
                          event.target.value
                        )
                      );

                      clearError("data");
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.data
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50`}
                  />
                </div>

                {errors.data && (
                  <p className="ml-1 text-xs text-coral">
                    {errors.data}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink-primary">
                  Horário
                </label>

                <div className="relative">
                  <Clock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00"
                    maxLength={5}
                    value={horario}
                    onChange={(event) => {
                      setHorario(
                        handleTimeMask(
                          event.target.value
                        )
                      );

                      clearError(
                        "horario"
                      );
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.horario
                        ? "border-coral/50 text-coral"
                        : "border-surface-border/50 text-ink-primary"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm outline-none focus:border-ice/50`}
                  />
                </div>

                {errors.horario && (
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.horario
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-surface-border/30 pt-2">
              <label className="text-sm font-medium text-ink-primary">
                Data Previsão / Retorno
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={
                    dataRetornoDisplay
                  }
                  onChange={(event) => {
                    setDataRetornoDisplay(
                      handleDateMask(
                        event.target.value
                      )
                    );

                    clearError(
                      "dataRetorno"
                    );
                  }}
                  className={`w-full rounded-2xl border ${
                    errors.dataRetorno
                      ? "border-coral/50"
                      : "border-surface-border/50"
                  } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50`}
                />
              </div>

              {errors.dataRetorno && (
                <p className="ml-1 text-xs text-coral">
                  {
                    errors.dataRetorno
                  }
                </p>
              )}
            </div>

            <Input
              label="Motivo da Solicitação"
              value={motivo}
              onChange={(event) =>
                setMotivo(
                  event.target.value
                )
              }
            />

            <TextArea
              label="Observações / Resultados"
              value={observacoes}
              onChange={(event) =>
                setObservacoes(
                  event.target.value
                )
              }
            />

            <Input
              label="Link Externo (URL)"
              value={anexoUrl}
              onChange={(event) =>
                setAnexoUrl(
                  event.target.value
                )
              }
            />

            <div className="border-t border-surface-border/30 pt-3">
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Comprovante / Laudo
              </label>

              {attachment ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-ice/20 bg-ice/5 px-3 py-3">
                    <ImageIcon
                      size={16}
                      className="shrink-0 text-ice"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {
                          attachment.name
                        }
                      </p>

                      <p className="text-[10px] text-ice">
                        Novo arquivo selecionado
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        removeNewAttachment
                      }
                      className="text-ink-muted transition-colors hover:text-coral"
                      aria-label="Cancelar novo arquivo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : anexoUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                    <ImageIcon
                      size={16}
                      className="shrink-0 text-ice"
                    />

                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-primary">
                      {anexoUrl}
                    </p>

                    <button
                      type="button"
                      onClick={
                        removeCurrentAttachment
                      }
                      className="text-ink-muted transition-colors hover:text-coral"
                      aria-label="Remover anexo atual"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                    >
                      <Upload size={16} />
                      Substituir
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() =>
                        cameraInputRef.current?.click()
                      }
                    >
                      <Camera size={16} />
                      Nova foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    <Upload size={16} />
                    Arquivo
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      cameraInputRef.current?.click()
                    }
                  >
                    <Camera size={16} />
                    Câmera
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            disabled={
              isSubmitting ||
              !activePersonId
            }
            className="flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            {isSubmitting
              ? "Salvando..."
              : "Salvar Alterações"}
          </Button>
        </div>

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={() =>
            setIsLocalModalOpen(
              false
            )
          }
          onSelect={(item) => {
            if (!item.id) {
              return;
            }

            trigger("vibrate");

            setLocalId(
              item.id
            );

            setLaboratorio(
              item.nome
            );

            setIsLocalModalOpen(
              false
            );
          }}
          items={locais}
          title="Selecionar Hospital / Laboratório"
          placeholder="Buscar local..."
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">
                {item.nome}
              </p>

              {item.endereco && (
                <p className="text-xs text-ink-muted">
                  {
                    item.endereco
                  }
                </p>
              )}
            </div>
          )}
          getItemId={(item) =>
            item.id!
          }
          getItemLabel={(item) =>
            item.nome
          }
          onCreateNew={() => {
            setIsLocalModalOpen(
              false
            );

            setIsCreatingLocal(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Local"
        />

        <SelectionModal<Medico>
          isOpen={
            isDoctorModalOpen
          }
          onClose={() =>
            setIsDoctorModalOpen(
              false
            )
          }
          onSelect={(item) => {
            if (!item.id) {
              return;
            }

            trigger("vibrate");

            setMedicoId(
              item.id
            );

            setMedico(
              item.nome
            );

            setIsDoctorModalOpen(
              false
            );
          }}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">
                Dr(a).{" "}
                {item.nome}
              </p>

              {item.especialidade && (
                <p className="text-xs text-ink-muted">
                  {
                    item.especialidade
                  }
                </p>
              )}
            </div>
          )}
          getItemId={(item) =>
            item.id!
          }
          getItemLabel={(item) =>
            item.nome
          }
          onCreateNew={() => {
            setIsDoctorModalOpen(
              false
            );

            setIsCreatingDoctor(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal<Tratamento>
          isOpen={
            isTratamentoModalOpen
          }
          onClose={() =>
            setIsTratamentoModalOpen(
              false
            )
          }
          onSelect={(item) => {
            if (!item.id) {
              return;
            }

            trigger("vibrate");

            setTratamentosSelecionados(
              (previous) =>
                previous.includes(
                  item.id!
                )
                  ? previous
                  : [
                      ...previous,
                      item.id!,
                    ]
            );
          }}
          items={tratamentos}
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={(item) => {
            const Icon =
              getTratamentoIcon(
                item.nome
              );

            const isSelected =
              Boolean(
                item.id &&
                  tratamentosSelecionados.includes(
                    item.id
                  )
              );

            return (
              <div className="flex w-full items-center gap-2">
                <Icon
                  size={16}
                  className="text-violet-400"
                />

                <span
                  className={`text-sm font-medium ${
                    isSelected
                      ? "text-violet-400"
                      : "text-ink-primary"
                  }`}
                >
                  {item.nome}
                </span>

                {isSelected && (
                  <span className="ml-auto text-[10px] text-emerald-400">
                    Selecionado
                  </span>
                )}
              </div>
            );
          }}
          getItemId={(item) =>
            item.id!
          }
          getItemLabel={(item) =>
            item.nome
          }
          onCreateNew={() => {
            setIsTratamentoModalOpen(
              false
            );

            setIsCreatingTratamento(
              true
            );
          }}
          createNewLabel="Cadastrar Novo Tratamento"
        />

        <SelectionModal<Cid>
          isOpen={
            isCidModalOpen
          }
          onClose={() =>
            setIsCidModalOpen(
              false
            )
          }
          onSelect={(item) => {
            if (!item.id) {
              return;
            }

            trigger("vibrate");

            setCidsSelecionados(
              (previous) =>
                previous.includes(
                  item.id!
                )
                  ? previous
                  : [
                      ...previous,
                      item.id!,
                    ]
            );
          }}
          items={cids}
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={(item) => {
            const theme =
              getClinicalTheme(
                item.descricao ||
                  item.codigo
              );

            const Icon =
              theme.icon;

            const isSelected =
              Boolean(
                item.id &&
                  cidsSelecionados.includes(
                    item.id
                  )
              );

            return (
              <div className="flex w-full items-center gap-2">
                <Icon
                  size={16}
                  className={
                    theme.textClass
                  }
                />

                <span
                  className={`text-sm font-medium ${
                    isSelected
                      ? theme.textClass
                      : "text-ink-primary"
                  }`}
                >
                  {item.codigo} -{" "}
                  {item.descricao}
                </span>

                {isSelected && (
                  <span className="ml-auto text-[10px] text-emerald-400">
                    Selecionado
                  </span>
                )}
              </div>
            );
          }}
          getItemId={(item) =>
            item.id!
          }
          getItemLabel={(item) =>
            `${item.codigo} - ${item.descricao}`
          }
          onCreateNew={() => {
            setIsCidModalOpen(
              false
            );

            setIsCreatingCid(
              true
            );
          }}
          createNewLabel="Cadastrar Novo CID"
        />

        <BottomSheet
          isOpen={
            isCreatingTratamento
          }
          onClose={() =>
            setIsCreatingTratamento(
              false
            )
          }
          title="Novo Tratamento"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome do Tratamento"
              value={
                newTratamentoName
              }
              onChange={(event) =>
                setNewTratamentoName(
                  event.target.value
                )
              }
              autoFocus
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateTratamento
              }
              disabled={
                !newTratamentoName.trim() ||
                isSavingTratamento
              }
            >
              {isSavingTratamento ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Salvar e Selecionar"
              )}
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={
            isCreatingDoctor
          }
          onClose={() =>
            setIsCreatingDoctor(
              false
            )
          }
          title="Novo Médico"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome"
              value={
                newDocName
              }
              onChange={(event) =>
                setNewDocName(
                  event.target.value
                )
              }
              autoFocus
            />

            <Input
              label="Especialidade"
              value={
                newDocEspecialidade
              }
              onChange={(event) =>
                setNewDocEspecialidade(
                  event.target.value
                )
              }
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateDoctor
              }
              disabled={
                !newDocName.trim()
              }
            >
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={
            isCreatingLocal
          }
          onClose={() =>
            setIsCreatingLocal(
              false
            )
          }
          title="Novo Local"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Nome"
              value={
                newLocalName
              }
              onChange={(event) =>
                setNewLocalName(
                  event.target.value
                )
              }
              autoFocus
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateLocal
              }
              disabled={
                !newLocalName.trim()
              }
            >
              Salvar e Selecionar
            </Button>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={
            isCreatingCid
          }
          onClose={() =>
            setIsCreatingCid(
              false
            )
          }
          title="Novo CID"
        >
          <div className="space-y-4 px-1 pb-2">
            <Input
              label="Código CID"
              placeholder="Ex: F90.0"
              value={
                newCidCodigo
              }
              onChange={(event) =>
                setNewCidCodigo(
                  event.target.value
                )
              }
              autoFocus
            />

            <Input
              label="Descrição"
              value={
                newCidDescricao
              }
              onChange={(event) =>
                setNewCidDescricao(
                  event.target.value
                )
              }
            />

            <Button
              variant="primary"
              fullWidth
              onClick={
                handleCreateCid
              }
              disabled={
                !newCidCodigo.trim() ||
                !newCidDescricao.trim() ||
                isSavingCid
              }
            >
              {isSavingCid ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Salvar e Selecionar"
              )}
            </Button>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}