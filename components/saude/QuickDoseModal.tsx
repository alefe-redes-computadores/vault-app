// components/saude/QuickDoseModal.tsx
"use client";
import {DormantQuickDoseModal} from "@/components/saude/DormantQuickDoseModal";
import {MACRO02_PREMIUM_UI_ENABLED} from "@/lib/dose-premium/dormant-release-authority";
import {useRouter} from "next/navigation";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthDateTimePicker } from "@/components/saude/HealthDateTimePicker";
import { DoseHistoricalUnitField, unitDraftSnapshot, type UnitDraft } from "@/components/hoje/DoseHistoricalUnitField";
import { readDoseUnit, describeHistoricalDose, type DoseUnitFields } from "@/lib/dose-premium/historical-unit";
import { civilDoseInstant } from "@/lib/dose-premium/review-intent";
import { buildDoseSlotIndex, resolveDoseSlot } from "@/lib/dose-slot-authority";
import { verifyDoseSnapshotAck, type DoseSnapshot } from "@/lib/dose-premium/compatibility";
import { cycleIdentity } from "@/lib/dose-premium/stock-cycle";
import { useAuth } from "@/hooks/useAuth";
import { comparableDebit, readStockEvidence } from "@/lib/dose-premium/stock-evidence";
import { observedStockContext, observedStockConversion } from "@/lib/dose-premium/stock-context";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Minus,
  Pill,
  Plus,
  Search,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useDoseLogs,
} from "@/hooks/useDoseLogs";

import {
  doseLogsRepository,
} from "@/lib/repositories/doseLogs";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import {
  assessDoseQuantitySafety,
} from "@/lib/health-intelligence/dose-quantity-safety";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useToast,
} from "@/components/ToastProvider";

import type {
  DoseLog,
  Medicamento,
} from "@/lib/types";

import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { contextualDoseQuantity } from "@/lib/dose-plan-authority";
import { useAndroidModalViewport } from "@/hooks/useAndroidModalViewport";
import { reconcileQuickDoseDraftSTB, selectQuickDoseMedicationSTB, editQuickDoseQuantitySTB, isQuickDoseContextSTB, maySuggestQuickDoseQuantitySTB, isValidQuickDoseDateSTB, type QuickDoseDraftSessionSTB } from "@/lib/ui/quick-dose-draft-stb";

// ============================================================
// TIPOS
// ============================================================

interface QuickDoseModalProps {
  isOpen: boolean;
  onClose: () => void;

  /*
   * Quando informado, abre diretamente para um medicamento
   * específico.
   */
  preselectedMedicamentoId?: string;
  initialSlot?: {day:string;hour:string};

  onSuccess?: () => void;
}

type DoseMode =
  | "scheduled"
  | "ad-hoc";

// ============================================================
// HELPERS — HORÁRIO
// ============================================================

function handleTimeMask(
  value: string
): string {
  const clean =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        4
      );

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}:${clean.slice(
      2
    )}`;
  }

  return clean;
}

function isValidTime(
  value: string
): boolean {
  const match =
    /^(\d{2}):(\d{2})$/.exec(
      value
    );

  if (!match) {
    return false;
  }

  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );

  return (
    Number.isInteger(
      hours
    ) &&
    Number.isInteger(
      minutes
    ) &&
    hours >=
      0 &&
    hours <=
      23 &&
    minutes >=
      0 &&
    minutes <=
      59
  );
}

function getCurrentTime(): string {
  const now =
    new Date();

  return `${String(
    now.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    now.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
}

function timeToMinutes(
  value: string
): number {
  if (
    !isValidTime(
      value
    )
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(":")
      .map(Number);

  return (
    hour *
      60 +
    minute
  );
}

function buildLocalTakenAtIso(date:string,time:string):string {
  return civilDoseInstant(date,time,new Date().toISOString());
}

// ==========================================================
// HELPERS — MEDICAMENTO / DOSE
// ============================================================

function normalizeSchedules(
  medicamento?: Medicamento
): string[] {
  if (
    !medicamento ||
    medicamento.tipo_uso !==
      "continuo" ||
    !Array.isArray(
      medicamento.estoque_horarios
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      medicamento.estoque_horarios
        .map(
          (horario) =>
            horario
              ?.trim()
        )
        .filter(
          (
            horario
          ): horario is string =>
            Boolean(
              horario
            ) &&
            isValidTime(
              horario
            )
        )
    )
  ).sort(
    (
      first,
      second
    ) =>
      timeToMinutes(
        first
      ) -
      timeToMinutes(
        second
      )
  );
}

function isTakenLog(
  log: DoseLog
): boolean {
  return Boolean(
    log.tomado_em
  );
}

function findRecommendedSchedule(
  medicamento: Medicamento,
  doseLogs: DoseLog[]
): string | null {
  const schedules =
    normalizeSchedules(
      medicamento
    );

  if (
    schedules.length ===
    0
  ) {
    return null;
  }

  const medicationLogs =
    doseLogs.filter(
      (log) =>
        log.medicamento_id ===
        medicamento.id
    );

  const takenSchedules =
    new Set(
      medicationLogs
        .filter(
          isTakenLog
        )
        .map(
          (log) =>
            log.horario
        )
    );

  const pendingSchedules =
    schedules.filter(
      (horario) =>
        !takenSchedules.has(
          horario
        )
    );

  /*
   * Se todas as doses programadas já foram tomadas,
   * mantemos a rotina e selecionamos o horário mais próximo.
   *
   * Como setStatus é idempotente, uma segunda confirmação
   * daquele mesmo slot não descontará estoque novamente.
   */
  const candidates =
    pendingSchedules.length >
    0
      ? pendingSchedules
      : schedules;

  const currentMinutes =
    timeToMinutes(
      getCurrentTime()
    );

  return (
    [...candidates].sort(
      (
        first,
        second
      ) =>
        Math.abs(
          timeToMinutes(
            first
          ) -
            currentMinutes
        ) -
        Math.abs(
          timeToMinutes(
            second
          ) -
            currentMinutes
        )
    )[0] ||
    null
  );
}

function resolveDefaultDoseQuantity(medicamento?: Medicamento, slot?: DoseLog): number {
  return contextualDoseQuantity(medicamento, slot) ?? 0;
}

function resolveQuantityStep(
  medicamento?: Medicamento
): number {
  const configured =
    Number(
      medicamento
        ?.estoque_unidade_por_dose
    );

  /*
   * Se a dose configurada já utiliza fração,
   * permitimos ajuste em 0,5.
   */
  if (
    Number.isFinite(
      configured
    ) &&
    configured %
      1 !==
      0
  ) {
    return 0.5;
  }

  /*
   * Gotas costumam ser registradas em unidades inteiras.
   */
  const formato =
    String(
      medicamento?.formato ||
        ""
    ).toLowerCase();

  if (
    formato.includes(
      "gota"
    )
  ) {
    return 1;
  }

  return 0.5;
}

function formatQuantity(
  value: number
): string {
  if (
    Number.isInteger(
      value
    )
  ) {
    return String(
      value
    );
  }

  return value
    .toFixed(2)
    .replace(
      /\.00$/,
      ""
    )
    .replace(
      /(\.\d)0$/,
      "$1"
    )
    .replace(
      ".",
      ","
    );
}

// ============================================================
// COMPONENTE
// ============================================================

export function PremiumQuickDoseModal({
  isOpen,
  onClose,
  preselectedMedicamentoId,
  initialSlot,
  onSuccess,
}: QuickDoseModalProps) {
  const router=useRouter();
  const saveLock=useRef(false);
  const draftSessionSTB=useRef<QuickDoseDraftSessionSTB|null>(null);
  const extraReasonInputRef=useRef<HTMLInputElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [unitChoice,setUnitChoice]=useState<{key:string;draft:UnitDraft;noStock:boolean;touched:boolean}|null>(null);
  const { layerStyle, keyboardOpen } = useAndroidModalViewport(isOpen && portalReady);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    medicamentos:
      rawMedicamentos,
  } =
    useMedicamentos();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {user}=useAuth();
  const today = getLocalTodayISO();
  const maxScheduleDate = useMemo(() => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + 30);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, [today]);
  // VAULT_RETROACTIVE_DOSE_V70
  const [doseDate,setDoseDate]=useState(today);
  const [actualDraft,setActualDraft]=useState<{context:string;value:string}|null>(null);
  const reviewedSlotRef=useRef<{context:string;expected:DoseSnapshot|null}|null>(null);
  const { doseLogs, isLoading: doseScopeLoading } = useDoseLogs(doseDate,user?.id??null);

  // ==========================================================
  // MEDICAMENTOS DISPONÍVEIS
  // ==========================================================

  const medicamentosAtivos =
    useMemo(
      () => {
        if (
          !activePersonId ||
          !user?.id ||
          !rawMedicamentos
        ) {
          return [];
        }

        return rawMedicamentos.filter(
          (
            medicamento:
              Medicamento
          ) =>
            (medicamento.status !==
              "descontinuado" ||
              medicamento.tipo_uso ===
                "sos" ||
              medicamento.tipo_uso ===
                "esporadico") &&
            medicamento.person_id ===
              activePersonId && medicamento.user_id === user.id
        );
      },
      [
        rawMedicamentos,
        activePersonId,
        user?.id,
      ]
    );

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    doseMedId,
    setDoseMedId,
  ] =
    useState("");

  const [
    doseQtd,
    setDoseQtd,
  ] =
    useState(0);

  const [
    doseHora,
    setDoseHora,
  ] =
    useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    lateDoseDecisionOpen,
    setLateDoseDecisionOpen,
  ] =
    useState(
      false
    );

  const [
    recentDoseQuantities,
    setRecentDoseQuantities,
  ] =
    useState<
      number[]
    >(
      []
    );

  const [
    quantitySafetyOpen,
    setQuantitySafetyOpen,
  ] =
    useState(
      false
    );

  const [
    acceptedUnusualQuantity,
    setAcceptedUnusualQuantity,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [registerAsExtra, setRegisterAsExtra] =
    useState(false);

  const [doseReason, setDoseReason] =
    useState("");
  const [extraReasonErrorM1,setExtraReasonErrorM1]=useState(false);

  // ==========================================================
  // MEDICAMENTO SELECIONADO
  // ==========================================================

  const targetMedicationId =
    preselectedMedicamentoId ||
    doseMedId;

  const selectedMed =
    medicamentosAtivos.find(
      (
        medicamento
      ) =>
        medicamento.id ===
        targetMedicationId
    );

  const horariosProgramados=useMemo(()=>Array.from(new Set([
    ...normalizeSchedules(selectedMed),
    ...doseLogs.filter(log=>log.user_id===user?.id&&log.person_id===activePersonId&&log.medicamento_id===selectedMed?.id&&log.data===doseDate&&log.dose_kind==='planned').map(log=>log.horario),
  ].filter(isValidTime))).sort(),[selectedMed,doseLogs,doseDate,user?.id,activePersonId]);
  const existingSlot=useMemo(()=>resolveDoseSlot(buildDoseSlotIndex(doseLogs,{userId:user?.id,personId:activePersonId??undefined}),selectedMed?.id??'',doseDate,doseHora),[doseLogs,user?.id,activePersonId,selectedMed?.id,doseDate,doseHora]);
  const existingScheduledLog=existingSlot.records.length===1?existingSlot.records[0]:undefined;
  const doseMode:DoseMode=!registerAsExtra&&(horariosProgramados.includes(doseHora)||existingSlot.records.length>0)?'scheduled':'ad-hoc';

  const chosenDoseTime =
    isValidTime(doseHora)
      ? new Date(`${doseDate}T${doseHora}:00`).getTime()
      : Number.NaN;
  const willScheduleAdHoc =
    doseMode === "ad-hoc" &&
    Number.isFinite(chosenDoseTime) &&
    chosenDoseTime > Date.now() + 30_000;

  const unitContext=JSON.stringify([selectedMed?.user_id,activePersonId,selectedMed?.id]);
  const actualContext=JSON.stringify([unitContext,doseDate,doseHora,doseMode]);
  const existingActual=existingScheduledLog?.tomado_em?new Date(existingScheduledLog.tomado_em):null;
  const actualDefault=existingActual&&Number.isFinite(existingActual.valueOf())?`${existingActual.getFullYear()}-${String(existingActual.getMonth()+1).padStart(2,'0')}-${String(existingActual.getDate()).padStart(2,'0')}T${String(existingActual.getHours()).padStart(2,'0')}:${String(existingActual.getMinutes()).padStart(2,'0')}`:`${doseDate}T${doseHora}`;
  const actualValue=actualDraft?.context===actualContext?actualDraft.value:actualDefault;
  const currentUnitChoice=unitChoice?.key===unitContext?unitChoice:null;
  const historicalUnit=doseMode==='scheduled'?readDoseUnit(existingScheduledLog??{}):readDoseUnit({});
  const unitDraft:UnitDraft=currentUnitChoice?.draft??{code:null,customLabel:''};
  const scheduledAlreadyTaken =
    doseMode ===
      "scheduled" &&
    Boolean(
      existingScheduledLog
        ?.tomado_em
    );

  const quantityStep =
    resolveQuantityStep(
      selectedMed
    );

  useEffect(
    () => {
      let cancelled =
        false;

      const loadHistory =
        async () => {
          if (
            !activePersonId ||
            !selectedMed?.id
          ) {
            setRecentDoseQuantities(
              []
            );

            return;
          }

          try {
            const quantities =
              await doseLogsRepository.getRecentQuantities(
                activePersonId,
                selectedMed.id,
                20
              );

            if (
              !cancelled
            ) {
              setRecentDoseQuantities(
                quantities
              );
            }
          } catch (
            error
          ) {
            console.error(
              "[QuickDoseModal] Falha ao carregar histórico de quantidades:",
              error
            );

            if (
              !cancelled
            ) {
              setRecentDoseQuantities(
                []
              );
            }
          }
        };

      void loadHistory();

      return () => {
        cancelled =
          true;
      };
    },
    [
      activePersonId,
      selectedMed?.id,
    ]
  );

  const quantitySafetyAssessment =
    useMemo(
      () =>
        assessDoseQuantitySafety({
          quantity:
            doseQtd,

          configuredQuantity:
            selectedMed
              ?.estoque_unidade_por_dose,

          historicalQuantities:
            recentDoseQuantities,

          unitLabel:
            selectedMed
              ?.estoque_unidade_medida ||
            (
              String(
                selectedMed?.formato ||
                  ""
              )
                .toLowerCase()
                .includes(
                  "gota"
                )
                ? "gota(s)"
                : "unidade(s)"
            ),
        }),
      [
        doseQtd,
        selectedMed
          ?.estoque_unidade_por_dose,
        selectedMed
          ?.estoque_unidade_medida,
        selectedMed
          ?.formato,
        recentDoseQuantities,
      ]
    );

  // ==========================================================
  // RESET / ABERTURA
  // ==========================================================

  useEffect(
    () => {
      const transition=reconcileQuickDoseDraftSTB(draftSessionSTB.current,isOpen,activePersonId,preselectedMedicamentoId);
      draftSessionSTB.current=transition.session;
      if (transition.reset==="none") return;
      setUnitChoice(null);setActualDraft(null);reviewedSlotRef.current=null;
      setDoseQtd(0);

      setSearchQuery(
        ""
      );

      setLateDoseDecisionOpen(
        false
      );

      setQuantitySafetyOpen(
        false
      );

      setAcceptedUnusualQuantity(
        null
      );

      setRegisterAsExtra(false);
      setDoseReason("");
      setExtraReasonErrorM1(false);
      if (transition.reset==="session") {
        setDoseDate(initialSlot?.day??today);
        setDoseHora(initialSlot?.hour??getCurrentTime());
      }

      if (
        preselectedMedicamentoId
      ) {
        setDoseMedId(
          preselectedMedicamentoId
        );

        return;
      }

      setDoseMedId("");
    },
    [
      isOpen,
      preselectedMedicamentoId,
      activePersonId,
      today,
    ]
  );

  /* STB-01: suggestions follow the selected slot only before a manual quantity edit.
   * Date/time are never reset by reactive medication or dose-log updates. */
  useEffect(
    () => {
      if (
        !isOpen ||
        !selectedMed ||
        !maySuggestQuickDoseQuantitySTB(draftSessionSTB.current,activePersonId,selectedMed.id)
      ) {
        return;
      }

      setDoseQtd(
        resolveDefaultDoseQuantity(selectedMed, existingScheduledLog)
      );

      // M137: não substituir o horário escolhido ao atualizar quantidade.
      // O efeito de abertura já define o horário inicial.
    },
    [
      isOpen,
      activePersonId,
      preselectedMedicamentoId,
      selectedMed?.id,
      selectedMed?.estoque_unidade_por_dose,
      doseDate,
      doseHora,
      existingScheduledLog?.id,
      existingScheduledLog?.quantidade,
    ]
  );

  // ==========================================================
  // BUSCA
  // ==========================================================

  const filteredMedicamentos =
    useMemo(
      () => {
        const normalizedQuery =
          searchQuery
            .toLowerCase()
            .trim();

        if (
          !normalizedQuery
        ) {
          return medicamentosAtivos;
        }

        return medicamentosAtivos.filter(
          (
            medicamento
          ) => {
            const nome =
              medicamento.nome
                ?.toLowerCase() ||
              "";

            const dosagem =
              medicamento.dosagem
                ?.toLowerCase() ||
              "";

            return (
              nome.includes(
                normalizedQuery
              ) ||
              dosagem.includes(
                normalizedQuery
              )
            );
          }
        );
      },
      [
        medicamentosAtivos,
        searchQuery,
      ]
    );

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  const handleSelectMedication =
    (
      medicamento:
        Medicamento
    ) => {
      if (
        !medicamento.id ||
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      if (preselectedMedicamentoId && preselectedMedicamentoId!==medicamento.id) return;
      if (targetMedicationId!==medicamento.id) {
        draftSessionSTB.current=selectQuickDoseMedicationSTB(draftSessionSTB.current,medicamento.id);
        setUnitChoice(null);setActualDraft(null);reviewedSlotRef.current=null;
        setDoseQtd(0);
        setRegisterAsExtra(false);
        setDoseReason("");
        setExtraReasonErrorM1(false);
        setLateDoseDecisionOpen(false);
      }
      setDoseMedId(
        medicamento.id
      );

      setQuantitySafetyOpen(
        false
      );

      setAcceptedUnusualQuantity(
        null
      );
    };

  const handleSelectSchedule =
    (
      horario:
        string
    ) => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      setAcceptedUnusualQuantity(null);
      setDoseHora(
        horario
      );

      setLateDoseDecisionOpen(
        false
      );
    };

  const markQuantityEditedSTB=()=>{
    draftSessionSTB.current=editQuickDoseQuantitySTB(draftSessionSTB.current);
    setAcceptedUnusualQuantity(null);
  };

  const handleDecreaseQuantity =
    () => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      markQuantityEditedSTB();
      setDoseQtd(
        (
          current
        ) =>
          Math.max(
            quantityStep,
            Number(
              (
                current -
                quantityStep
              ).toFixed(
                3
              )
            )
          )
      );
    };

  const handleIncreaseQuantity =
    () => {
      if (
        isSaving
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      markQuantityEditedSTB();
      setDoseQtd(
        (
          current
        ) =>
          Number(
            (
              current +
              quantityStep
            ).toFixed(
              3
            )
          )
      );
    };

  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose =
    () => {
      if (
        isSaving
      ) {
        return;
      }

      if (
        quantitySafetyOpen
      ) {
        trigger(
          "vibrate"
        );

        setQuantitySafetyOpen(
          false
        );

        return;
      }

      if (
        lateDoseDecisionOpen
      ) {
        trigger(
          "vibrate"
        );

        setLateDoseDecisionOpen(
          false
        );

        return;
      }

      trigger(
        "vibrate"
      );

      onClose();
    };

  // ==========================================================
  // SALVAR
  // ==========================================================

  const handleSalvar =
    async (
      options?: {
        tomadoEm?: string;
        status?: "taken" | "ignored";
        skipLatePrompt?: boolean;
        skipQuantityGuard?: boolean;
      }
    ) => {
      if (
        isSaving || saveLock.current
      ) {
        return;
      }

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Pessoa ativa não identificada.",
          "error"
        );

        return;
      }

      if (
        !selectedMed?.id
      ) {
        trigger(
          "error"
        );

        showToast(
          "Selecione um medicamento.",
          "error"
        );

        return;
      }

      if (
        !isValidTime(
          doseHora
        )
      ) {
        trigger(
          "error"
        );

        showToast(
          "Informe um horário válido.",
          "error"
        );

        return;
      }

      if (!isQuickDoseContextSTB(draftSessionSTB.current,activePersonId,selectedMed.id)) {
        showToast("Confira a pessoa e o medicamento antes de registrar.","error");
        return;
      }
      if (!isValidQuickDoseDateSTB(doseDate) || doseDate>maxScheduleDate) {
        showToast("Informe uma data válida.","error");
        return;
      }

      if (selectedMed.tipo_uso === "temporario" && doseMode === "ad-hoc" &&
          (!registerAsExtra || !doseReason.trim())) {
        setExtraReasonErrorM1(true);
        trigger("error");
        showToast("Dose fora do período: marque como extra e informe uma justificativa antes de salvar.", "error");
        window.requestAnimationFrame(()=>extraReasonInputRef.current?.focus());
        return;
      }

      const requestedStatus = options?.status ?? "taken";
      if (requestedStatus==="taken" && (doseMode!=="scheduled"||options?.skipLatePrompt) && (!Number.isFinite(doseQtd) || doseQtd<=0)) {
        trigger(
          "error"
        );

        showToast(
          "Informe uma quantidade válida.",
          "error"
        );

        return;
      }

      const quantityAlreadyAccepted =
        acceptedUnusualQuantity ===
          doseQtd;

      if (
        !willScheduleAdHoc &&
        requestedStatus ===
          "taken" && Number.isFinite(doseQtd) && doseQtd>0 &&
        quantitySafetyAssessment.level !==
          "normal" &&
        !options?.skipQuantityGuard &&
        !quantityAlreadyAccepted
      ) {
        trigger(
          quantitySafetyAssessment.level ===
            "high"
            ? "error"
            : "vibrate"
        );

        setQuantitySafetyOpen(
          true
        );

        return;
      }

      // Macro02: explicit temporal decision is required even at the expected minute.
      // Editing the actual timestamp never changes the occurrence's civil slot.
      let expected:DoseSnapshot|null=null;
      if(doseMode==='scheduled'){
        if(doseScopeLoading||!user?.id||existingSlot.state==='conflict'||existingSlot.records.length>1){showToast('Confira os registros deste horário antes de alterar.','info');return;}
        if(!Number.isFinite(chosenDoseTime)||chosenDoseTime>Date.now()){showToast('O horário programado ainda não chegou. Nenhum registro foi alterado.','info');return;}
        if(existingScheduledLog){if(!existingScheduledLog.id||!existingScheduledLog.person_id||existingScheduledLog.user_id!==user.id||existingScheduledLog.person_id!==activePersonId){showToast('Registro fora do contexto ativo.','error');return;}expected={...existingScheduledLog,id:existingScheduledLog.id,person_id:existingScheduledLog.person_id};}
        if(requestedStatus==='taken'&&!options?.skipLatePrompt){reviewedSlotRef.current={context:actualContext,expected};trigger('vibrate');setLateDoseDecisionOpen(true);return;}
        const reviewed=reviewedSlotRef.current;
        if(!reviewed||reviewed.context!==actualContext||Boolean(reviewed.expected)!==Boolean(expected)||reviewed.expected&&expected&&!verifyDoseSnapshotAck(reviewed.expected,expected)){showToast('A dose mudou desde a revisão. Confira novamente.','info');setLateDoseDecisionOpen(false);return;}
        expected=reviewed.expected;
      }

      let explicitUnit:DoseUnitFields|undefined;
      let adjustDoseStock=true;
      if(doseScopeLoading||!user?.id||selectedMed.user_id!==user.id){showToast("Aguarde a confirmação dos registros da pessoa ativa.","info");return;}
      if(!willScheduleAdHoc&&requestedStatus==='taken'){
        if(historicalUnit.state==='invalid'){showToast('Unidade histórica inconsistente. Revise antes de alterar.','error');return;}
        if(historicalUnit.state==='known'){explicitUnit=historicalUnit.fields;}
        else{
          if(!currentUnitChoice?.touched){showToast('Confira e declare a unidade realmente administrada.','info');return;}
          try{explicitUnit=unitDraftSnapshot(unitDraft);}catch(error){showToast(error instanceof Error?error.message:'Unidade inválida.','error');return;}
        }
        adjustDoseStock=!currentUnitChoice?.noStock;
        if(!cycleIdentity(selectedMed.estoque_ciclo_id)&&adjustDoseStock){showToast('Confirme uma contagem física do estoque ou escolha registrar somente o histórico.','info');return;}
        if(readDoseUnit(explicitUnit??{}).state!=='known'&&adjustDoseStock){showToast('Sem unidade confirmada, registre somente o histórico.','info');return;}
        if(adjustDoseStock){
          try{const context=observedStockContext(selectedMed,{user_id:user.id,person_id:activePersonId,medicationId:selectedMed.id});
            const receipt=readStockEvidence(existingScheduledLog?.estoque_movimento);
            const sameQuantity=Boolean(existingScheduledLog?.tomado_em&&existingScheduledLog.quantidade===doseQtd&&receipt.state==='applied');
            if(!sameQuantity&&(context.balance===null||comparableDebit(doseQtd,explicitUnit??{},context,observedStockConversion(selectedMed,context))===null)){showToast('Unidade e saldo não comparáveis. Revise o estoque ou escolha somente histórico.','info');return;}
          }catch(error){showToast(error instanceof Error?error.message:'Estoque requer revisão.','error');return;}
        }
      }
      const savingSessionSTB=draftSessionSTB.current;
      saveLock.current=true;
      setIsSaving(
        true
      );

      setLateDoseDecisionOpen(
        false
      );

      setQuantitySafetyOpen(
        false
      );

      trigger(
        "vibrate"
      );

      try {
        let savedDoseId:string|undefined;
        if (willScheduleAdHoc) {
          await doseLogsRepository.agendarDoseAvulsa({
            personId: activePersonId,
            medicamentoId: selectedMed.id,
            data: doseDate,
            horario: doseHora,
            quantidade: doseQtd,
            motivo: doseReason,
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sync:process"));
          }
          if (draftSessionSTB.current!==savingSessionSTB) return;
          trigger("success");
          showToast(`Dose de ${selectedMed.nome} agendada para ${doseHora}. O estoque não foi alterado.`, "success");
          onSuccess?.();
          onClose();
          return;
        }

        /*
         * Dose programada:
         *
         * medicamento + pessoa + data + horário
         *
         * É um slot único.
         */
        if (
          doseMode ===
          "scheduled"
        ) {
          savedDoseId=await doseLogsRepository.setStatus({
            unit:explicitUnit,adjustStock:requestedStatus==='taken'?adjustDoseStock:!currentUnitChoice?.noStock,
            expected,
            personId:
              activePersonId,

            medicamentoId:
              selectedMed.id,

            data:
              doseDate,

            horario:
              doseHora,

            status:
              requestedStatus,

            quantidade: requestedStatus==='taken'?doseQtd:undefined,

            tomadoEm:
              requestedStatus ===
                "taken"
                ? (options?.tomadoEm ?? (doseDate<today ? buildLocalTakenAtIso(doseDate,doseHora) : undefined))
                : undefined,
          });
        } else {
          if (
            requestedStatus ===
            "ignored"
          ) {
            throw new Error(
              "Uma tomada avulsa não pode ser marcada como não tomada."
            );
          }

          /*
           * SOS / esporádica / horário fora da rotina:
           *
           * cada confirmação representa um evento independente.
           */
          savedDoseId=await doseLogsRepository.registrarTomadaAvulsa({
            unit:explicitUnit,adjustStock:adjustDoseStock,
            tomadoEm:buildLocalTakenAtIso(doseDate,doseHora),
            personId:
              activePersonId,

            medicamentoId:
              selectedMed.id,

            data:
              doseDate,

            horario:
              doseHora,

            quantidade:
              doseQtd,

            doseKind:
              selectedMed.tipo_uso === "sos" || selectedMed.tipo_uso === "esporadico"
                ? "sos"
                : "extra",

            motivo:
              doseReason,
          });
        }

        if (
          typeof window !==
          "undefined"
        ) {
          window.dispatchEvent(
            new Event(
              "sync:process"
            )
          );
        }

        if (draftSessionSTB.current!==savingSessionSTB) return;
        const savedEvidence=savedDoseId?await doseLogsRepository.getById(savedDoseId,activePersonId):undefined;
        if (draftSessionSTB.current!==savingSessionSTB) return;
        const savedUnit=readDoseUnit(savedEvidence??{});
        const expectedTakenAt=options?.tomadoEm??(doseMode==='ad-hoc'?buildLocalTakenAtIso(doseDate,doseHora):null);
        if(!savedEvidence||savedEvidence.user_id!==user.id||savedEvidence.person_id!==activePersonId||savedEvidence.medicamento_id!==selectedMed.id||savedEvidence.data!==doseDate||savedEvidence.horario.slice(0,5)!==doseHora||(requestedStatus==='taken'&&(!savedEvidence.tomado_em||Boolean(savedEvidence.ignorado_em)||savedEvidence.quantidade!==doseQtd||savedUnit.state==='invalid'||savedUnit.fields.unidade_dose!==(explicitUnit?.unidade_dose??null)||savedUnit.fields.unidade_dose_rotulo!==(explicitUnit?.unidade_dose_rotulo??null)||savedUnit.fields.fonte_unidade!==(explicitUnit?.fonte_unidade??null)||Boolean(expectedTakenAt&&Date.parse(savedEvidence.tomado_em)!==Date.parse(expectedTakenAt))))||(requestedStatus==='ignored'&&(!savedEvidence.ignorado_em||Boolean(savedEvidence.tomado_em)))){showToast('O registro local requer conferência. Consulte o histórico antes de tentar novamente.','info');return;}
        trigger("success");
        if(savedEvidence?.estoque_movimento?.state==='not_applied'&&requestedStatus==='taken'){
          showToast('Tomada salva neste aparelho, sem movimentar estoque. Aguardando sincronização.','info');
          onSuccess?.();onClose();return;
        }

        showToast(
          `${requestedStatus==='ignored'?`Não tomada de ${selectedMed.nome} registrada`:`Registro de ${selectedMed.nome} salvo neste aparelho`}. ${savedEvidence.synced?'Sincronização confirmada.':'Aguardando sincronização.'}`,
          "success"
        );

        onSuccess?.();

        onClose();
      } catch (
        error:
          unknown
      ) {
        console.error(
          "[QuickDoseModal] Falha ao registrar dose:",
          error
        );

        if (draftSessionSTB.current!==savingSessionSTB) return;
        trigger(
          "error"
        );

        showToast(
          error instanceof
          Error
            ? error.message
            : "Erro ao registrar dose.",
          "error"
        );
      } finally {
        saveLock.current=false;
        setIsSaving(
          false
        );
      }
    };

  // ==========================================================
  // CLOSED
  // ==========================================================

  if (
    !isOpen ||
    !portalReady
  ) {
    return null;
  }

  // ==========================================================
  // VISUAL
  // ==========================================================

  const stockQuantity =
    selectedMed
      ?.estoque_quantidade;

  const stockUnit =
    selectedMed
      ?.estoque_unidade_medida ||
    "unidade(s)";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar dose"
      data-keyboard-open={keyboardOpen ? "true" : "false"}
      style={layerStyle}
      className="vault-modal-layer fixed inset-0 z-[100] flex items-end justify-center bg-void/90 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={
        handleClose
      }
    >
      <motion.div
        initial={{
          opacity:
            0,

          y:
            50,

          scale:
            0.98,
        }}
        animate={{
          opacity:
            1,

          y:
            0,

          scale:
            1,
        }}
        exit={{
          opacity:
            0,

          y:
            50,

          scale:
            0.98,
        }}
        transition={{
          type:
            "spring",

          stiffness:
            280,

          damping:
            28,
        }}
        onClick={
          (
            event
          ) =>
            event.stopPropagation()
        }
        className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top,0px))] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border border-surface-border bg-surface shadow-2xl sm:max-h-[92dvh] sm:rounded-[32px]"
      >
        <AnimatePresence>
          {quantitySafetyOpen &&
            selectedMed && (
              <motion.div
                initial={{
                  opacity:
                    0,
                }}
                animate={{
                  opacity:
                    1,
                }}
                exit={{
                  opacity:
                    0,
                }}
                className="absolute inset-0 z-40 flex items-end bg-void/90 p-3 backdrop-blur-md sm:items-center"
                onPointerDown={
                  (
                    event
                  ) => {
                    if (
                      event.target ===
                        event.currentTarget &&
                      !isSaving
                    ) {
                      setQuantitySafetyOpen(
                        false
                      );
                    }
                  }
                }
              >
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      24,

                    scale:
                      0.98,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,

                    scale:
                      1,
                  }}
                  exit={{
                    opacity:
                      0,

                    y:
                      24,

                    scale:
                      0.98,
                  }}
                  onPointerDown={
                    (
                      event
                    ) =>
                      event.stopPropagation()
                  }
                  className={`w-full rounded-[28px] border p-5 shadow-2xl ${
                    quantitySafetyAssessment.level ===
                    "high"
                      ? "border-coral/40 bg-surface"
                      : "border-amber-400/30 bg-surface"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        quantitySafetyAssessment.level ===
                        "high"
                          ? "bg-coral/15 text-coral"
                          : "bg-amber-400/10 text-amber-400"
                      }`}
                    >
                      <AlertTriangle
                        size={
                          20
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                          quantitySafetyAssessment.level ===
                          "high"
                            ? "text-coral"
                            : "text-amber-400"
                        }`}
                      >
                        {quantitySafetyAssessment.level ===
                        "high"
                          ? "Confirmação reforçada"
                          : "Revise a quantidade"}
                      </p>

                      <h4 className="mt-1 text-base font-bold text-ink-primary">
                        {quantitySafetyAssessment.level ===
                        "high"
                          ? "Essa quantidade está muito fora do seu padrão"
                          : "Essa quantidade parece incomum"}
                      </h4>

                      {/* M94: valores explícitos, sem chamar a referência de dose correta. */}
                      <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Comparação com a referência registrada">
                        <div className="min-w-0 rounded-xl border border-coral/25 bg-coral/[0.07] p-2.5">
                          <p className="text-[10px] font-semibold text-ink-muted">Você informou</p>
                          <p className="mt-1 text-xl font-bold tabular-nums text-coral">{formatQuantity(doseQtd)}</p>
                          <p className="text-[10px] text-ink-muted">{quantitySafetyAssessment.unitLabel}</p>
                        </div>
                        <div className="min-w-0 rounded-xl border border-surface-border/60 bg-void/30 p-2.5">
                          <p className="text-[10px] font-semibold text-ink-muted">Referência registrada</p>
                          <p className="mt-1 text-xl font-bold tabular-nums text-ink-primary">{quantitySafetyAssessment.baseline !== null ? formatQuantity(quantitySafetyAssessment.baseline) : "—"}</p>
                          <p className="text-[10px] text-ink-muted">{quantitySafetyAssessment.unitLabel}</p>
                        </div>
                      </div>
                      {quantitySafetyAssessment.ratio !== null && (
                        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">A quantidade informada é aproximadamente <strong className={quantitySafetyAssessment.level === "high" ? "text-coral" : "text-amber-400"}>{quantitySafetyAssessment.ratio}×</strong> a referência interna. Esta comparação não determina uma dose clinicamente segura.</p>
                      )}
                    </div>
                  </div>

                  {quantitySafetyAssessment.suggestedQuantity !== null && (
                    <p className="mt-3 rounded-xl border border-ice/20 bg-ice/[0.045] px-3 py-2.5 text-[11px] leading-relaxed text-ink-secondary">
                      <strong className="block text-ice">Possível erro de digitação</strong>
                      Ao revisar, a referência registrada será preenchida no formulário para você conferir ou alterar. Ela não é uma recomendação de dose.
                    </p>
                  )}

                  {quantitySafetyAssessment.level ===
                    "high" && (
                    <div className="mt-4 rounded-2xl border border-coral/30 bg-coral/10 p-3.5">
                      <p className="text-xs font-bold text-coral">
                        Se essa quantidade já foi tomada
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                        O Vault não determina se uma quantidade é clinicamente segura. Se houver suspeita de intoxicação, sintomas importantes ou preocupação com o que foi ingerido, procure orientação imediatamente.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <a
                          href="tel:192"
                          className="flex items-center justify-center rounded-xl border border-coral/30 bg-coral/10 px-3 py-2.5 text-xs font-bold text-coral"
                        >
                          SAMU · 192
                        </a>

                        <a
                          href="tel:08007226001"
                          className="flex items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5 text-center text-xs font-bold text-ink-primary"
                        >
                          Disque-Intoxicação
                        </a>
                      </div>

                      <p className="mt-2 text-center font-mono text-[9px] text-ink-faint">
                        0800 722 6001
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <button type="button" disabled={isSaving}
                      onClick={() => {
                        trigger("vibrate");
                        const suggested = quantitySafetyAssessment.suggestedQuantity;
                        if (suggested !== null) {
                          markQuantityEditedSTB();
                          setDoseQtd(suggested);
                          setAcceptedUnusualQuantity(null);
                        }
                        setQuantitySafetyOpen(false);
                      }}
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-ice/30 bg-ice/10 px-4 py-3 text-xs font-bold text-ice active:scale-[0.99] motion-reduce:transform-none"
                    >
                      {quantitySafetyAssessment.suggestedQuantity !== null ? "Preencher referência e revisar" : "Revisar quantidade"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={
                        () => {
                          setAcceptedUnusualQuantity(
                            doseQtd
                          );

                          setQuantitySafetyOpen(
                            false
                          );

                          void handleSalvar({
                            skipQuantityGuard:
                              true,
                          });
                        }
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-xs font-bold active:scale-[0.99] ${
                        quantitySafetyAssessment.level ===
                        "high"
                          ? "border-coral/40 bg-coral/15 text-coral"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      Confirmar{" "}
                      {
                        formatQuantity(
                          doseQtd
                        )
                      }{" "}
                      {
                        quantitySafetyAssessment.unitLabel
                      }
                    </button>
                  </div>

                  <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-faint">
                    Este alerta compara apenas seu cadastro e seu histórico. Não representa limite clínico ou toxicológico.
                  </p>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {lateDoseDecisionOpen &&
            selectedMed &&
            doseMode ===
              "scheduled" && (
              <motion.div
                initial={{
                  opacity:
                    0,
                }}
                animate={{
                  opacity:
                    1,
                }}
                exit={{
                  opacity:
                    0,
                }}
                className="absolute inset-0 z-30 flex items-end bg-void/80 p-3 backdrop-blur-sm sm:items-center"
                onClick={
                  () =>
                    setLateDoseDecisionOpen(
                      false
                    )
                }
              >
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      20,

                    scale:
                      0.98,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,

                    scale:
                      1,
                  }}
                  exit={{
                    opacity:
                      0,

                    y:
                      20,

                    scale:
                      0.98,
                  }}
                  onClick={
                    (
                      event
                    ) =>
                      event.stopPropagation()
                  }
                  className="max-h-full w-full overflow-y-auto overscroll-contain rounded-[26px] border border-surface-border bg-surface-raised p-5 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                      <Clock
                        size={
                          20
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
                        Horário real da tomada
                      </p>

                      <h4 className="mt-1 text-base font-bold text-ink-primary">
                        Quando você tomou?
                      </h4>

                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {
                          selectedMed.nome
                        }{" "}
                        estava programado para{" "}
                        <strong className="text-ink-primary">
                          {
                            doseHora
                          }
                        </strong>
                        . O Vault usa sua resposta para diferenciar atraso na tomada de atraso apenas no registro.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={
                        () => {try{void handleSalvar({tomadoEm:buildLocalTakenAtIso(doseDate,doseHora),status:'taken',skipLatePrompt:true});}catch(error){showToast(error instanceof Error?error.message:'Confira o horário.','error');}}
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3.5 text-left transition-all active:scale-[0.99]"
                    >
                      <CheckCircle2
                        size={
                          18
                        }
                        className="shrink-0 text-emerald-400"
                      />

                      <span>
                        <span className="block text-sm font-semibold text-ink-primary">
                          Tomei às{" "}
                          {
                            doseHora
                          }
                        </span>

                        <span className="mt-0.5 block text-[10px] text-ink-muted">
                          Só esqueci de registrar no Vault.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={
                        () =>
                          handleSalvar({
                            tomadoEm:
                              new Date()
                                .toISOString(),

                            status:
                              "taken",

                            skipLatePrompt:
                              true,
                          })
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-ice/25 bg-ice/10 p-3.5 text-left transition-all active:scale-[0.99]"
                    >
                      <Timer
                        size={
                          18
                        }
                        className="shrink-0 text-ice"
                      />

                      <span>
                        <span className="block text-sm font-semibold text-ink-primary">
                          Tomei agora ·{" "}
                          {
                            getCurrentTime()
                          }
                        </span>

                        <span className="mt-0.5 block text-[10px] text-ink-muted">
                          Salvar o instante atual, sem mudar a programação original.
                        </span>
                      </span>
                    </button>

                    <section className="space-y-2 rounded-2xl border border-surface-border bg-surface/70 p-3">
                      <p className="text-sm font-semibold text-ink-primary">Tomei em outra data e horário</p><p className="text-xs text-ink-muted">Informe o instante real. O dia e horário programados serão preservados.</p>
                      <HealthDateTimePicker value={actualValue} onChange={value=>setActualDraft({context:actualContext,value})} max={`${today}T23:59`} disabled={isSaving}/>
                      <button type="button" disabled={isSaving} onClick={()=>{try{const [day,hour]=actualValue.split('T');const at=civilDoseInstant(day,hour,new Date().toISOString());void handleSalvar({tomadoEm:at,status:'taken',skipLatePrompt:true});}catch(error){showToast(error instanceof Error?error.message:'Confira a data e hora reais.','error');}}} className="min-h-11 w-full rounded-xl border border-ice/30 bg-ice/5 text-sm font-semibold text-ice disabled:opacity-50">Registrar neste instante</button>
                    </section>
                    <button
                      type="button"
                      disabled={
                        isSaving
                      }
                      onClick={
                        () =>
                          handleSalvar({
                            status:
                              "ignored",

                            skipLatePrompt:
                              true,
                          })
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-coral/25 bg-coral/10 p-3.5 text-left transition-all active:scale-[0.99]"
                    >
                      <X
                        size={
                          18
                        }
                        className="shrink-0 text-coral"
                      />

                      <span>
                        <span className="block text-sm font-semibold text-ink-primary">
                          Não tomei
                        </span>

                        <span className="mt-0.5 block text-[10px] text-ink-muted">
                          Marcar esta dose programada como não tomada.
                        </span>
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={
                      isSaving
                    }
                    onClick={
                      () =>
                        setLateDoseDecisionOpen(
                          false
                        )
                    }
                    className="mt-3 w-full rounded-xl py-2.5 text-xs font-semibold text-ink-muted"
                  >
                    Voltar
                  </button>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* ==================================================
            HANDLE MOBILE
            ================================================== */}

        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-border" />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] touch-pan-y sm:pt-6">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex items-start justify-between gap-3 border-b border-surface-border/40 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Zap
                  size={
                    21
                  }
                  fill="currentColor"
                />
              </div>

              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-ink-primary">
                  Registrar Dose
                </h3>

                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                  Confirme a quantidade e o horário.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={
                handleClose
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted transition-all hover:text-ink-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Fechar"
            >
              <X
                size={
                  18
                }
              />
            </button>
          </div>

          {/* ==================================================
              SEM PESSOA ATIVA
              ================================================== */}

          {!activePersonId && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <AlertTriangle
                size={
                  18
                }
                className="mt-0.5 shrink-0 text-amber-400"
              />

              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Pessoa ativa necessária
                </p>

                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Selecione uma pessoa ativa antes de registrar uma dose.
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              SELEÇÃO DO MEDICAMENTO
              ================================================== */}

          {!preselectedMedicamentoId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Medicamento
                </label>

                <span className="text-[10px] text-ink-faint">
                  {
                    filteredMedicamentos.length
                  }{" "}
                  disponível
                  {filteredMedicamentos.length ===
                  1
                    ? ""
                    : "is"}
                </span>
              </div>

              <div className="relative">
                <Search
                  size={
                    16
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />

                <input
                  type="text"
                  placeholder="Buscar medicamento ou dosagem..."
                  value={
                    searchQuery
                  }
                  disabled={
                    isSaving
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearchQuery(
                        event.target.value
                      )
                  }
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-9 pr-4 text-sm text-ink-primary outline-none transition-colors focus:border-emerald-400/50 disabled:opacity-50"
                />
              </div>

              {filteredMedicamentos.length >
              0 ? (
                <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
                  {filteredMedicamentos.map(
                    (
                      medicamento
                    ) => {
                      if (
                        !medicamento.id
                      ) {
                        return null;
                      }

                      const isSelected =
                        doseMedId ===
                        medicamento.id;

                      return (
                        <button
                          type="button"
                          key={
                            medicamento.id
                          }
                          disabled={
                            isSaving
                          }
                          onClick={
                            () =>
                              handleSelectMedication(
                                medicamento
                              )
                          }
                          className={`flex w-[92px] flex-shrink-0 flex-col items-center gap-2 rounded-[20px] border p-3 transition-all active:scale-95 disabled:opacity-50 ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-400/10 shadow-md shadow-emerald-400/5"
                              : "border-surface-border/50 bg-surface-raised"
                          }`}
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/60 bg-void/55">
                            <MedicationFormatIcon
                              formato={medicamento.formato}
                              cores={medicamento.cores}
                              size={25}
                            />
                          </div>

                          <span className="w-full truncate text-center text-[10px] font-semibold text-ink-primary">
                            {
                              medicamento.nome
                            }
                          </span>

                          {medicamento.dosagem && (
                            <span className="-mt-1 w-full truncate text-center text-[9px] text-ink-muted">
                              {
                                medicamento.dosagem
                              }
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-surface-border/50 bg-surface-raised p-4 text-center">
                  <Pill
                    size={
                      20
                    }
                    className="mx-auto mb-2 text-ink-faint"
                  />

                  <p className="text-xs text-ink-muted">
                    Nenhum medicamento ativo encontrado para a pessoa selecionada.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              MEDICAMENTO ATUAL
              ================================================== */}

          {selectedMed && <section className="rounded-2xl border border-surface-border/50 bg-surface-raised p-3" aria-label="Medicamento e saldo">
            <div className="flex items-start gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-void/55"><MedicationFormatIcon formato={selectedMed.formato} cores={selectedMed.cores} size={24}/></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold text-ink-primary">{selectedMed.nome}</p><p className="mt-1 text-xs text-ink-muted">{selectedMed.dosagem||'Dosagem não informada'} · {selectedMed.tipo_uso==='continuo'?'Contínuo':selectedMed.tipo_uso==='temporario'?'Por período':'SOS'}</p></div></div>
            <div className="mt-3 border-t border-surface-border pt-2 text-xs"><p className={typeof stockQuantity==='number'&&stockQuantity<=0?'text-coral':'text-ink-primary'}>Saldo cadastrado: <strong>{typeof stockQuantity==='number'?`${formatQuantity(stockQuantity)} ${stockUnit}`:'Não informado'}</strong></p><p className="mt-1 text-[11px] text-ink-muted">{doseLogs.filter(log=>log.medicamento_id===selectedMed.id&&log.person_id===activePersonId&&log.tomado_em&&!log.ignorado_em).length} tomadas registradas em {doseDate.split('-').reverse().join('/')}</p></div>
            <details className="mt-1 text-[11px] text-ink-muted"><summary className="min-h-11 cursor-pointer py-3">Conferir histórico e saldo</summary><p>Abrir este formulário não movimenta estoque.</p>{selectedMed.estoque_data_referencia?<p className="mt-1">Referência do saldo: {selectedMed.estoque_data_referencia.slice(0,10).split('-').reverse().join('/')}</p>:null}<button type="button" disabled={isSaving} onClick={()=>{onClose();router.push(`/saude/medicamentos/detalhes?id=${encodeURIComponent(selectedMed.id!)}`);}} className="mt-1 min-h-11 text-left text-xs font-semibold text-emerald-300">Abrir histórico do medicamento ›</button></details>
          </section>}

          {preselectedMedicamentoId &&
            !selectedMed && (
              <div className="flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-4">
                <AlertTriangle
                  size={
                    18
                  }
                  className="mt-0.5 shrink-0 text-coral"
                />

                <div>
                  <p className="text-sm font-semibold text-coral">
                    Medicamento indisponível
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    O medicamento não existe, está suspenso ou não pertence à pessoa ativa.
                  </p>
                </div>
              </div>
            )}

          {/* ==================================================
              TIPO DE REGISTRO
              ================================================== */}

          {selectedMed && (
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  doseMode
                }
                initial={{
                  opacity:
                    0,

                  y:
                    4,
                }}
                animate={{
                  opacity:
                    1,

                  y:
                    0,
                }}
                exit={{
                  opacity:
                    0,

                  y:
                    -4,
                }}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
                  doseMode ===
                  "scheduled"
                    ? scheduledAlreadyTaken
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-ice/30 bg-ice/10"
                    : "border-amber-400/30 bg-amber-400/10"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    doseMode ===
                    "scheduled"
                      ? scheduledAlreadyTaken
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-ice/10 text-ice"
                      : "bg-amber-400/10 text-amber-400"
                  }`}
                >
                  {doseMode ===
                  "scheduled" ? (
                    scheduledAlreadyTaken ? (
                      <CheckCircle2
                        size={
                          17
                        }
                      />
                    ) : (
                      <Timer
                        size={
                          17
                        }
                      />
                    )
                  ) : (
                    <Sparkles
                      size={
                        17
                      }
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold ${
                      doseMode ===
                      "scheduled"
                        ? scheduledAlreadyTaken
                          ? "text-emerald-400"
                          : "text-ice"
                        : "text-amber-400"
                    }`}
                  >
                    {doseMode ===
                    "scheduled"
                      ? scheduledAlreadyTaken
                        ? "Dose programada já registrada"
                        : "Dose programada"
                      : "Tomada avulsa"}
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                    {doseMode ===
                    "scheduled"
                      ? scheduledAlreadyTaken
                        ? "Confirmar novamente atualizará este mesmo horário, sem descontar o estoque duas vezes."
                        : "Este horário faz parte da rotina diária configurada para o medicamento."
                      : selectedMed.tipo_uso ===
                          "continuo"
                        ? "O horário informado está fora da rotina cadastrada e será salvo como uma tomada adicional."
                        : "Cada confirmação registra uma nova tomada, mesmo no mesmo horário."}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ==================================================
              HORÁRIOS PROGRAMADOS
              ================================================== */}

          {(selectedMed?.tipo_uso === "continuo" || selectedMed?.tipo_uso === "temporario") &&
            horariosProgramados.length >
              0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    {selectedMed?.tipo_uso === "temporario" ? "Horários do período" : "Rotina de hoje"}
                  </label>

                  <span className="text-[10px] text-ink-faint">
                    Toque para selecionar
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {horariosProgramados.map(
                    (
                      horario
                    ) => {
                      const existing =
                        doseLogs.find(
                          (
                            log
                          ) =>
                            log.medicamento_id ===
                              selectedMed.id &&
                            log.data ===
                              doseDate &&
                            log.horario ===
                              horario
                        );

                      const taken =
                        Boolean(
                          existing?.tomado_em
                        );

                      const selected =
                        doseHora ===
                        horario;

                      return (
                        <button
                          type="button"
                          key={
                            horario
                          }
                          disabled={
                            isSaving
                          }
                          onClick={
                            () =>
                              handleSelectSchedule(
                                horario
                              )
                          }
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                            selected
                              ? taken
                                ? "border-emerald-400 bg-emerald-400/15 text-emerald-400"
                                : "border-ice bg-ice/15 text-ice"
                              : taken
                                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                                : "border-surface-border/60 bg-surface-raised text-ink-muted"
                          }`}
                        >
                          {taken && (
                            <Check
                              size={
                                11
                              }
                            />
                          )}

                          {
                            horario
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

          {/* ==================================================
              QUANTIDADE / HORÁRIO
              ================================================== */}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Quantidade
              </label>

              <div className="flex h-[52px] items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-2">
                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={
                    handleDecreaseQuantity
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/60 bg-surface text-ink-primary transition-all active:scale-90 disabled:opacity-50"
                  aria-label="Diminuir quantidade"
                >
                  <Minus
                    size={
                      15
                    }
                  />
                </button>

                <span className="min-w-10 text-center text-base font-bold tabular-nums text-ink-primary">
                  {
                    formatQuantity(
                      doseQtd
                    )
                  }
                </span>

                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={
                    handleIncreaseQuantity
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border/60 bg-surface text-ink-primary transition-all active:scale-90 disabled:opacity-50"
                  aria-label="Aumentar quantidade"
                >
                  <Plus
                    size={
                      15
                    }
                  />
                </button>
              </div>

              {selectedMed && (
                <p className="break-words px-1 text-[10px] text-ink-muted">{historicalUnit.state==='known'?'Unidade histórica preservada':willScheduleAdHoc?'Quantidade planejada':'Informe a unidade real abaixo'}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Horário
              </label>

              <div className="relative">
                <Clock
                  size={
                    16
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={
                    5
                  }
                  disabled={
                    isSaving
                  }
                  value={
                    doseHora
                  }
                  onChange={
                    (
                      event
                    ) => {
                      setAcceptedUnusualQuantity(null);
                      setDoseHora(
                        handleTimeMask(
                          event.target.value
                        )
                      );
                    }
                  }
                  onBlur={
                    () => {
                      if (
                        doseHora &&
                        !isValidTime(
                          doseHora
                        )
                      ) {
                        trigger(
                          "error"
                        );
                      }
                    }
                  }
                  className={`h-[52px] w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm font-bold text-ink-primary outline-none transition-colors disabled:opacity-50 ${
                    doseHora &&
                    !isValidTime(
                      doseHora
                    )
                      ? "border-coral/60 focus:border-coral"
                      : "border-surface-border/50 focus:border-emerald-400/50"
                  }`}
                  placeholder="00:00"
                />
              </div>

              <label className="block px-1 pt-1"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-ink-faint">Data</span><CustomDatePicker className="[&_input]:text-xs [&_input]:pl-2 [&_input]:pr-8" value={doseDate} maxDate={maxScheduleDate} disabled={isSaving} onChange={next=>{if(isValidQuickDoseDateSTB(next)&&next<=maxScheduleDate){setAcceptedUnusualQuantity(null);setDoseDate(next);}}} /><span className="mt-1 block text-[9px] text-ink-faint">Horário passado registra a tomada; horário futuro agenda sem baixar o estoque.</span></label>
            </div>
          </div>

          {selectedMed&&!willScheduleAdHoc&&<section className="space-y-3 rounded-2xl border border-surface-border bg-surface-raised p-3" aria-label="Unidade e movimentação">
            {historicalUnit.state==='known'?<div className="space-y-1"><p className="text-xs font-semibold text-emerald-300">Unidade histórica confirmada</p><p className="break-words text-sm text-ink-primary">{describeHistoricalDose({...historicalUnit.fields,quantidade:doseQtd})}</p><p className="text-xs text-ink-muted">O registro conserva a unidade original.</p></div>:<DoseHistoricalUnitField value={unitDraft} disabled={isSaving} onChange={draft=>setUnitChoice({key:unitContext,draft,touched:true,noStock:currentUnitChoice?.noStock??false})}/>}
            <div className="rounded-xl border border-surface-border bg-void/40 p-3 text-xs leading-relaxed text-ink-muted">{cycleIdentity(selectedMed.estoque_ciclo_id)?'Movimentação somente com unidade e ciclo comprovados.':'O saldo ainda não tem uma contagem física identificada. Uma tomada pode ser registrada sem alterar o saldo; confira o estoque separadamente.'}</div>
            <button type="button" aria-pressed={Boolean(currentUnitChoice?.noStock)} disabled={isSaving} onClick={()=>setUnitChoice({key:unitContext,draft:unitDraft,touched:currentUnitChoice?.touched??false,noStock:!currentUnitChoice?.noStock})} className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm ${currentUnitChoice?.noStock?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-primary'}`}><CheckCircle2 size={17} aria-hidden="true"/>Registrar somente o histórico, sem alterar o estoque</button>
          </section>}

          {selectedMed && willScheduleAdHoc && (
            <div className="flex items-start gap-3 rounded-2xl border border-ice/25 bg-ice/[0.07] p-3.5">
              <Clock size={17} className="mt-0.5 shrink-0 text-ice" />
              <div>
                <p className="text-xs font-bold text-ice">Esta dose será agendada</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Ela ficará pendente para {doseDate.split("-").reverse().join("/")} às {doseHora}. Nenhuma unidade será retirada do estoque até você confirmar a tomada.</p>
              </div>
            </div>
          )}

          {selectedMed?.tipo_uso === "continuo" &&
            existingScheduledLog?.tomado_em && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3.5">
                <p className="text-xs font-bold text-amber-300">
                  Já existe uma tomada neste horário
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                  Escolha se deseja corrigir a tomada existente ou registrar outro evento no histórico.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisterAsExtra(false)}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${!registerAsExtra ? "border-ice bg-ice/15 text-ice" : "border-surface-border text-ink-muted"}`}
                  >
                    Corrigir existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterAsExtra(true)}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${registerAsExtra ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-surface-border text-ink-muted"}`}
                  >
                    Registrar dose extra
                  </button>
                </div>
              </div>
            )}

          {selectedMed?.tipo_uso === "temporario" && doseMode === "ad-hoc" && <div role="note" className="rounded-xl border border-amber-300/30 bg-amber-300/[.04] px-3 py-3 text-xs text-amber-200">
            Este horário está fora do período registrado. Não será tratado como SOS automaticamente.
            <button type="button" aria-pressed={registerAsExtra} onClick={() => setRegisterAsExtra(value => !value)}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 font-semibold">
              {registerAsExtra ? "Dose extra selecionada" : "Registrar explicitamente como dose extra"}
            </button>
            <p className="mt-1 text-[10px]">Informe um motivo abaixo antes de registrar. Se a dose pertence ao período, selecione o horário programado.</p>
          </div>}
          {selectedMed && doseMode === "ad-hoc" && (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                {selectedMed.tipo_uso === "temporario" ? "Justificativa obrigatória para dose extra" : "Motivo ou contexto (opcional)"}
              </span>
              <input
                ref={extraReasonInputRef}
                aria-invalid={extraReasonErrorM1}
                aria-describedby={extraReasonErrorM1?"m1-extra-reason-error":undefined}
                value={doseReason}
                onChange={(event) => {setDoseReason(event.target.value);setExtraReasonErrorM1(false);}}
                maxLength={160}
                placeholder={selectedMed.tipo_uso === "continuo" ? "Ex.: orientação excepcional" : "Ex.: sintoma observado"}
                className={`mt-2 h-[52px] w-full rounded-2xl border bg-surface-raised px-4 text-sm text-ink-primary outline-none focus:border-ice/50 ${extraReasonErrorM1?"border-rose-400 ring-2 ring-rose-400/25":"border-surface-border/50"}`}
              />
              {extraReasonErrorM1 && <span id="m1-extra-reason-error" role="alert" className="mt-2 block text-xs font-semibold text-rose-300">Informe o motivo e confirme a dose extra. A tomada não foi salva.</span>}
            </label>
          )}

          {/* ==================================================
              AVISO DE ESTOQUE NEGATIVO / INSUFICIENTE
              ================================================== */}

          {selectedMed &&
            !willScheduleAdHoc &&
            typeof stockQuantity ===
              "number" &&
            stockQuantity <
              doseQtd && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3.5">
                <AlertTriangle
                  size={
                    16
                  }
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <p className="text-[11px] leading-relaxed text-ink-muted">
                  A quantidade registrada é maior que o saldo informado. A tomada ainda pode ser registrada; o estoque ficará negativo para preservar o histórico e sinalizar que precisa ser reconciliado.
                </p>
              </div>
            )}

          {/* ==================================================
              CONFIRMAR
              ================================================== */}

          <button
            type="button"
            onClick={
              () =>
                handleSalvar()
            }
            disabled={
              isSaving ||
              !activePersonId ||
              !selectedMed ||
              !isValidTime(
                doseHora
              ) ||
              !Number.isFinite(
                doseQtd
              ) ||
              doseQtd <=
                0
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 font-bold text-void shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2
                  size={
                    18
                  }
                  className="animate-spin"
                />

                {willScheduleAdHoc ? "Agendando..." : "Registrando..."}
              </>
            ) : willScheduleAdHoc ? (
              <>
                <Clock size={18} />
                Agendar Dose
              </>
            ) : scheduledAlreadyTaken ? (
              <>
                <CheckCircle2
                  size={
                    18
                  }
                />

                Atualizar Dose
              </>
            ) : (
              <>
                <Zap
                  size={
                    18
                  }
                  fill="currentColor"
                />

                Registrar tomada agora
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

export function QuickDoseModal(props:QuickDoseModalProps){return MACRO02_PREMIUM_UI_ENABLED ? <PremiumQuickDoseModal {...props}/> : <DormantQuickDoseModal {...props}/>;}
