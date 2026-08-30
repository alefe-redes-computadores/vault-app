// app/saude/consultas/novo/page.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  motion,
} from "framer-motion";

import {
  Activity,
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  Camera,
  Check,
  Clock,
  Eraser,
  Flame,
  HeartPulse,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  ShieldAlert,
  Stethoscope,
  Upload,
  UserCheck,
  X,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  db,
} from "@/lib/db";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  uploadFile,
} from "@/lib/supabase/storage";

import {
  tratamentosRepository,
} from "@/lib/repositories/tratamentos";

import {
  cidsRepository,
} from "@/lib/repositories/cids";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  Button,
} from "@/components/ui/Button";

import {
  Input,
} from "@/components/ui/Input";

import {
  TextArea,
} from "@/components/ui/TextArea";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  SelectionModal,
} from "@/components/SelectionModal";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  useToast,
} from "@/components/ToastProvider";

import type {
  Attachment,
  Cid,
  Hospital,
  LocalSaude,
  Medico,
  Tratamento,
} from "@/lib/types";

// ============================================================
// ANIMAÇÃO
// ============================================================

const fadeUp = {
  initial: {
    opacity:
      0,

    y:
      12,
  },

  animate: {
    opacity:
      1,

    y:
      0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function getTodayISO(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatDateToDisplay(
  isoStr: string
): string {
  if (
    !isoStr
  ) {
    return "";
  }

  const parts =
    isoStr.split(
      "-"
    );

  if (
    parts.length !==
    3
  ) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(
  displayStr: string
): string | undefined {
  const clean =
    displayStr.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
  ) {
    return undefined;
  }

  const day =
    Number(
      clean.slice(
        0,
        2
      )
    );

  const month =
    Number(
      clean.slice(
        2,
        4
      )
    );

  const year =
    Number(
      clean.slice(
        4,
        8
      )
    );

  const parsed =
    new Date(
      year,
      month -
        1,
      day
    );

  if (
    parsed.getFullYear() !==
      year ||
    parsed.getMonth() !==
      month -
        1 ||
    parsed.getDate() !==
      day
  ) {
    return undefined;
  }

  return `${String(
    year
  ).padStart(
    4,
    "0"
  )}-${String(
    month
  ).padStart(
    2,
    "0"
  )}-${String(
    day
  ).padStart(
    2,
    "0"
  )}`;
}

function handleDateMask(
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
        8
      );

  if (
    clean.length >
    4
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2,
      4
    )}/${clean.slice(4)}`;
  }

  if (
    clean.length >
    2
  ) {
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
    )}:${clean.slice(2)}`;
  }

  return clean;
}

function isValidTime(
  value: string
): boolean {
  if (
    !value
  ) {
    return true;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function getTratamentoIcon(
  nome: string
) {
  const normalized =
    nome.toLowerCase();

  if (
    normalized.includes(
      "tdah"
    )
  ) {
    return Brain;
  }

  if (
    normalized.includes(
      "dor"
    ) ||
    normalized.includes(
      "neuropática"
    )
  ) {
    return Flame;
  }

  if (
    normalized.includes(
      "depress"
    )
  ) {
    return HeartPulse;
  }

  if (
    normalized.includes(
      "ansied"
    ) ||
    normalized.includes(
      "ansiolítico"
    )
  ) {
    return ShieldAlert;
  }

  return Activity;
}

function parseIdsParam(
  value: string | null
): string[] {
  if (
    !value
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(
          ","
        )
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

// ============================================================
// PAGE
// ============================================================

export default function NovaConsultaPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  /*
   * Auth continua necessário aqui somente para uploadFile().
   * CRUD da consulta não recebe mais user_id do caller.
   */
  const {
    user,
  } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    addConsulta,
  } =
    useConsultas();

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );

  /*
   * Impede que um query param seja reaplicado depois que
   * o usuário limpou ou alterou manualmente a seleção.
   */
  const appliedMedicoParamRef =
    useRef<string | null>(
      null
    );

  const appliedHospitalParamRef =
    useRef<string | null>(
      null
    );

  const appliedLocalParamRef =
    useRef<string | null>(
      null
    );

  const appliedTratamentosParamRef =
    useRef<string | null>(
      null
    );

  const appliedCidsParamRef =
    useRef<string | null>(
      null
    );

  const previousPersonIdRef =
    useRef<string | null>(
      null
    );

  const attachmentUrlRef =
    useRef<string | null>(
      null
    );

  // ==========================================================
  // GLOBAL
  // ==========================================================

  const medicos =
    useLiveQuery(
      () =>
        db.medicos.toArray(),
      [],
      []
    ) ||
    [];

  const hospitais =
    useLiveQuery(
      () =>
        db.hospitais.toArray(),
      [],
      []
    ) ||
    [];

  const locais =
    useLiveQuery(
      () =>
        db.locais.toArray(),
      [],
      []
    ) ||
    [];

  // ==========================================================
  // PERSON-OWNED
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.tratamentos
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [
        activePersonId,
      ],
      []
    ) ||
    [];

  const cids =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return db.cids
          .where(
            "person_id"
          )
          .equals(
            activePersonId
          )
          .toArray();
      },
      [
        activePersonId,
      ],
      []
    ) ||
    [];

  // ==========================================================
  // RELAÇÕES
  // ==========================================================

  const [
    medicoId,
    setMedicoId,
  ] =
    useState(
      ""
    );

  const [
    hospitalId,
    setHospitalId,
  ] =
    useState(
      ""
    );

  const [
    localId,
    setLocalId,
  ] =
    useState(
      ""
    );

  const [
    isMedicoModalOpen,
    setIsMedicoModalOpen,
  ] =
    useState(
      false
    );

  const [
    isHospitalModalOpen,
    setIsHospitalModalOpen,
  ] =
    useState(
      false
    );

  const [
    isLocalModalOpen,
    setIsLocalModalOpen,
  ] =
    useState(
      false
    );

  const [
    tratamentosSelecionados,
    setTratamentosSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    cidsSelecionados,
    setCidsSelecionados,
  ] =
    useState<string[]>(
      []
    );

  const [
    isTratamentoModalOpen,
    setIsTratamentoModalOpen,
  ] =
    useState(
      false
    );

  const [
    isCidModalOpen,
    setIsCidModalOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // QUICK CREATE
  // ==========================================================

  const [
    isCreatingTratamento,
    setIsCreatingTratamento,
  ] =
    useState(
      false
    );

  const [
    newTratamentoName,
    setNewTratamentoName,
  ] =
    useState(
      ""
    );

  const [
    isSavingTratamento,
    setIsSavingTratamento,
  ] =
    useState(
      false
    );

  const [
    isCreatingCid,
    setIsCreatingCid,
  ] =
    useState(
      false
    );

  const [
    newCidCodigo,
    setNewCidCodigo,
  ] =
    useState(
      ""
    );

  const [
    newCidDescricao,
    setNewCidDescricao,
  ] =
    useState(
      ""
    );

  const [
    isSavingCid,
    setIsSavingCid,
  ] =
    useState(
      false
    );

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    dataDisplay,
    setDataDisplay,
  ] =
    useState(
      formatDateToDisplay(
        getTodayISO()
      )
    );

  const [
    horario,
    setHorario,
  ] =
    useState(
      ""
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      | "agendada"
      | "realizada"
      | "cancelada"
    >(
      "agendada"
    );

  const [
    motivo,
    setMotivo,
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

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  // ==========================================================
  // QUERY PARAMS
  //
  // Atalhos suportados:
  //
  // ?medico_id=...
  // ?hospital_id=...
  // ?local_id=...
  // ?tratamento_id=...
  // ?tratamento_ids=id1,id2
  // ?cid_id=...
  // ?cid_ids=id1,id2
  //
  // Nenhum ID vindo da URL é aceito cegamente.
  // Ele precisa existir no conjunto permitido da tela.
  // ==========================================================

  const medicoParam =
    searchParams.get(
      "medico_id"
    )?.trim() ||
    "";

  const hospitalParam =
    searchParams.get(
      "hospital_id"
    )?.trim() ||
    "";

  const localParam =
    searchParams.get(
      "local_id"
    )?.trim() ||
    "";

  const tratamentoParamKey =
    [
      searchParams.get(
        "tratamento_id"
      ) ||
        "",
      searchParams.get(
        "tratamento_ids"
      ) ||
        "",
    ].join(
      "|"
    );

  const cidParamKey =
    [
      searchParams.get(
        "cid_id"
      ) ||
        "",
      searchParams.get(
        "cid_ids"
      ) ||
        "",
    ].join(
      "|"
    );

  useEffect(
    () => {
      if (
        !medicoParam ||
        appliedMedicoParamRef.current ===
          medicoParam
      ) {
        return;
      }

      const exists =
        medicos.some(
          (
            medico
          ) =>
            medico.id ===
            medicoParam
        );

      if (
        !exists
      ) {
        return;
      }

      setMedicoId(
        medicoParam
      );

      appliedMedicoParamRef.current =
        medicoParam;

      setErrors(
        (
          previous
        ) => {
          if (
            !previous.medicoId
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next.medicoId;

          return next;
        }
      );
    },
    [
      medicoParam,
      medicos,
    ]
  );

  useEffect(
    () => {
      if (
        !hospitalParam ||
        appliedHospitalParamRef.current ===
          hospitalParam
      ) {
        return;
      }

      const exists =
        hospitais.some(
          (
            hospital
          ) =>
            hospital.id ===
            hospitalParam
        );

      if (
        !exists
      ) {
        return;
      }

      setHospitalId(
        hospitalParam
      );

      appliedHospitalParamRef.current =
        hospitalParam;
    },
    [
      hospitalParam,
      hospitais,
    ]
  );

  useEffect(
    () => {
      if (
        !localParam ||
        appliedLocalParamRef.current ===
          localParam
      ) {
        return;
      }

      const exists =
        locais.some(
          (
            local
          ) =>
            local.id ===
            localParam
        );

      if (
        !exists
      ) {
        return;
      }

      setLocalId(
        localParam
      );

      appliedLocalParamRef.current =
        localParam;
    },
    [
      localParam,
      locais,
    ]
  );

  useEffect(
    () => {
      if (
        !activePersonId ||
        appliedTratamentosParamRef.current ===
          `${activePersonId}:${tratamentoParamKey}`
      ) {
        return;
      }

      const requestedIds =
        Array.from(
          new Set([
            ...parseIdsParam(
              searchParams.get(
                "tratamento_id"
              )
            ),

            ...parseIdsParam(
              searchParams.get(
                "tratamento_ids"
              )
            ),
          ])
        );

      if (
        requestedIds.length ===
        0
      ) {
        appliedTratamentosParamRef.current =
          `${activePersonId}:${tratamentoParamKey}`;

        return;
      }

      const availableIds =
        new Set(
          tratamentos
            .map(
              (
                tratamento
              ) =>
                tratamento.id
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(
                  id
                )
            )
        );

      const validIds =
        requestedIds.filter(
          (
            id
          ) =>
            availableIds.has(
              id
            )
        );

      /*
       * Se a coleção ainda estiver carregando e nenhum ID
       * tiver sido localizado, aguardamos a próxima emissão do
       * live query em vez de consumir o parâmetro cedo demais.
       */
      if (
        validIds.length ===
          0 &&
        tratamentos.length ===
          0
      ) {
        return;
      }

      if (
        validIds.length >
        0
      ) {
        setTratamentosSelecionados(
          (
            previous
          ) =>
            Array.from(
              new Set([
                ...previous,
                ...validIds,
              ])
            )
        );
      }

      appliedTratamentosParamRef.current =
        `${activePersonId}:${tratamentoParamKey}`;
    },
    [
      activePersonId,
      tratamentoParamKey,
      tratamentos,
      searchParams,
    ]
  );

  useEffect(
    () => {
      if (
        !activePersonId ||
        appliedCidsParamRef.current ===
          `${activePersonId}:${cidParamKey}`
      ) {
        return;
      }

      const requestedIds =
        Array.from(
          new Set([
            ...parseIdsParam(
              searchParams.get(
                "cid_id"
              )
            ),

            ...parseIdsParam(
              searchParams.get(
                "cid_ids"
              )
            ),
          ])
        );

      if (
        requestedIds.length ===
        0
      ) {
        appliedCidsParamRef.current =
          `${activePersonId}:${cidParamKey}`;

        return;
      }

      const availableIds =
        new Set(
          cids
            .map(
              (
                cid
              ) =>
                cid.id
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(
                  id
                )
            )
        );

      const validIds =
        requestedIds.filter(
          (
            id
          ) =>
            availableIds.has(
              id
            )
        );

      if (
        validIds.length ===
          0 &&
        cids.length ===
          0
      ) {
        return;
      }

      if (
        validIds.length >
        0
      ) {
        setCidsSelecionados(
          (
            previous
          ) =>
            Array.from(
              new Set([
                ...previous,
                ...validIds,
              ])
            )
        );
      }

      appliedCidsParamRef.current =
        `${activePersonId}:${cidParamKey}`;
    },
    [
      activePersonId,
      cidParamKey,
      cids,
      searchParams,
    ]
  );

  // ==========================================================
  // PERSON CHANGE
  //
  // Tratamentos e CIDs são person-owned.
  //
  // Se a pessoa ativa mudar enquanto o formulário estiver
  // aberto, nunca carregamos relações clínicas da pessoa
  // anterior para a nova consulta.
  // ==========================================================

  useEffect(
    () => {
      const previousPersonId =
        previousPersonIdRef.current;

      if (
        previousPersonId &&
        activePersonId &&
        previousPersonId !==
          activePersonId
      ) {
        setTratamentosSelecionados(
          []
        );

        setCidsSelecionados(
          []
        );

        setIsTratamentoModalOpen(
          false
        );

        setIsCidModalOpen(
          false
        );

        setIsCreatingTratamento(
          false
        );

        setIsCreatingCid(
          false
        );

        setNewTratamentoName(
          ""
        );

        setNewCidCodigo(
          ""
        );

        setNewCidDescricao(
          ""
        );

        /*
         * Permite avaliar novamente os query params no novo
         * contexto, mas somente se realmente pertencerem à
         * nova pessoa.
         */
        appliedTratamentosParamRef.current =
          null;

        appliedCidsParamRef.current =
          null;
      }

      if (
        activePersonId
      ) {
        previousPersonIdRef.current =
          activePersonId;
      }
    },
    [
      activePersonId,
    ]
  );

  // ==========================================================
  // SELECTED
  // ==========================================================

  const selectedMedico =
    medicos.find(
      (
        medico
      ) =>
        medico.id ===
        medicoId
    );

  const selectedHospital =
    hospitais.find(
      (
        hospital
      ) =>
        hospital.id ===
        hospitalId
    );

  const selectedLocal =
    locais.find(
      (
        local
      ) =>
        local.id ===
        localId
    );

  // ==========================================================
  // ERROR
  // ==========================================================

  const clearError =
    (
      key: string
    ) => {
      setErrors(
        (
          previous
        ) => {
          if (
            !previous[
              key
            ]
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[
            key
          ];

          return next;
        }
      );
    };

  // ==========================================================
  // BLOB CLEANUP
  // ==========================================================

  const releaseTemporaryAttachment =
    () => {
      const currentUrl =
        attachmentUrlRef.current;

      if (
        currentUrl?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          currentUrl
        );
      }

      attachmentUrlRef.current =
        null;
  };

  useEffect(
    () => {
      return () => {
        const currentUrl =
          attachmentUrlRef.current;

        if (
          currentUrl?.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            currentUrl
          );
        }
      };
    },
    []
  );

  // ==========================================================
  // FILE
  // ==========================================================

  const handleFileSelect =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (
        file
      ) {
        trigger(
          "vibrate"
        );

        releaseTemporaryAttachment();

        const objectUrl =
          URL.createObjectURL(
            file
          );

        attachmentUrlRef.current =
          objectUrl;

        setLocalFile(
          file
        );

        setAttachment({
          id:
            crypto.randomUUID(),

          url:
            objectUrl,

          name:
            file.name,

          type:
            file.type.startsWith(
              "image"
            )
              ? "image"
              : "pdf",

          uploaded_at:
            new Date().toISOString(),
        });
      }

      event.target.value =
        "";
    };

  const handleCameraCapture =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (
        file
      ) {
        trigger(
          "vibrate"
        );

        releaseTemporaryAttachment();

        const objectUrl =
          URL.createObjectURL(
            file
          );

        attachmentUrlRef.current =
          objectUrl;

        setLocalFile(
          file
        );

        setAttachment({
          id:
            crypto.randomUUID(),

          url:
            objectUrl,

          name:
            `consulta_${Date.now()}.jpg`,

          type:
            "image",

          uploaded_at:
            new Date().toISOString(),
        });
      }

      event.target.value =
        "";
    };

  const removeAttachment =
    () => {
      releaseTemporaryAttachment();

      setAttachment(
        null
      );

      setLocalFile(
        null
      );

      trigger(
        "vibrate"
      );
    };

  // ==========================================================
  // QUICK TREATMENT
  // ==========================================================

  const handleCreateTratamento =
    async () => {
      const nome =
        newTratamentoName.trim();

      if (
        !nome ||
        isSavingTratamento
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
          "Selecione uma pessoa antes de criar um tratamento.",
          "error"
        );

        return;
      }

      setIsSavingTratamento(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await tratamentosRepository.create({
            nome,

            status:
              "ativo",

            person_id:
              activePersonId,
          });

        setTratamentosSelecionados(
          (
            previous
          ) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        showToast(
          "Tratamento cadastrado",
          "success"
        );

        setIsCreatingTratamento(
          false
        );

        setNewTratamentoName(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao criar tratamento:",
          error
        );

        trigger(
          "error"
        );

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

      if (
        !activePersonId
      ) {
        trigger(
          "error"
        );

        showToast(
          "Selecione uma pessoa antes de criar um CID.",
          "error"
        );

        return;
      }

      setIsSavingCid(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const newId =
          await cidsRepository.create({
            codigo,

            descricao,

            person_id:
              activePersonId,
          });

        setCidsSelecionados(
          (
            previous
          ) =>
            previous.includes(
              newId
            )
              ? previous
              : [
                  ...previous,
                  newId,
                ]
        );

        showToast(
          "CID cadastrado",
          "success"
        );

        setIsCreatingCid(
          false
        );

        setNewCidCodigo(
          ""
        );

        setNewCidDescricao(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao criar CID:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao cadastrar CID",
          "error"
        );
      } finally {
        setIsSavingCid(
          false
        );
      }
    };

  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validate =
    (): boolean => {
      const newErrors:
        Record<
          string,
          string
        > = {};

      if (
        !activePersonId
      ) {
        newErrors.person_id =
          "Pessoa ativa não identificada";
      }

      if (
        !medicoId
      ) {
        newErrors.medicoId =
          "Selecione o médico";
      }

      if (
        medicoId &&
        !selectedMedico
      ) {
        newErrors.medicoId =
          "O médico selecionado não está mais disponível";
      }

      if (
        hospitalId &&
        !selectedHospital
      ) {
        newErrors.hospitalId =
          "O hospital selecionado não está mais disponível";
      }

      if (
        localId &&
        !selectedLocal
      ) {
        newErrors.localId =
          "O local selecionado não está mais disponível";
      }

      if (
        !parseDateToISO(
          dataDisplay
        )
      ) {
        newErrors.data =
          "Informe uma data válida";
      }

      if (
        !isValidTime(
          horario
        )
      ) {
        newErrors.horario =
          "Horário inválido (use HH:MM)";
      }

      const tratamentoIdsDisponiveis =
        new Set(
          tratamentos
            .map(
              (
                tratamento
              ) =>
                tratamento.id
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(
                  id
                )
            )
        );

      if (
        tratamentosSelecionados.some(
          (
            id
          ) =>
            !tratamentoIdsDisponiveis.has(
              id
            )
        )
      ) {
        newErrors.tratamentos =
          "Há um tratamento selecionado que não pertence à pessoa ativa";
      }

      const cidIdsDisponiveis =
        new Set(
          cids
            .map(
              (
                cid
              ) =>
                cid.id
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(
                  id
                )
            )
        );

      if (
        cidsSelecionados.some(
          (
            id
          ) =>
            !cidIdsDisponiveis.has(
              id
            )
        )
      ) {
        newErrors.cids =
          "Há um CID selecionado que não pertence à pessoa ativa";
      }

      setErrors(
        newErrors
      );

      return (
        Object.keys(
          newErrors
        ).length ===
        0
      );
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    () => {
      trigger(
        "vibrate"
      );

      if (
        !validate()
      ) {
        trigger(
          "error"
        );

        showToast(
          "Revise os campos antes de salvar.",
          "error"
        );

        return;
      }

      if (
        !activePersonId
      ) {
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
          try {
            let anexoUrl:
              | string
              | undefined;

            if (
              localFile
            ) {
              if (
                !user?.id
              ) {
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

              if (
                error
              ) {
                throw error;
              }

              if (
                url
              ) {
                anexoUrl =
                  url;
              }
            }

            const dataISO =
              parseDateToISO(
                dataDisplay
              );

            if (
              !dataISO
            ) {
              throw new Error(
                "Data inválida"
              );
            }

            /*
             * person_id é injetado por useConsultas().
             * user_id é injetado pelo repository.
             */
            await addConsulta({
              especialidade:
                selectedMedico?.especialidade ||
                "Geral",

              medico:
                selectedMedico?.nome ||
                "Médico",

              medico_id:
                medicoId,

              hospital_id:
                hospitalId ||
                undefined,

              local_id:
                localId ||
                undefined,

              data:
                dataISO,

              horario:
                horario ||
                undefined,

              status,

              motivo:
                motivo.trim() ||
                undefined,

              observacoes:
                observacoes.trim() ||
                undefined,

              anexo_url:
                anexoUrl,

              tratamento_ids:
                tratamentosSelecionados.length >
                0
                  ? Array.from(
                      new Set(
                        tratamentosSelecionados
                      )
                    )
                  : undefined,

              cid_ids:
                cidsSelecionados.length >
                0
                  ? Array.from(
                      new Set(
                        cidsSelecionados
                      )
                    )
                  : undefined,
            });

            /*
             * O blob temporário não é mais necessário depois
             * que a consulta foi persistida com URL remota.
             */
            releaseTemporaryAttachment();
          } finally {
            isSubmitLocked.current =
              false;
          }
        },
        {
          successMessage:
            "Consulta criada",

          errorMessage:
            "Erro ao salvar",

          goBackOnSuccess:
            true,
        }
      );
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={
            fileInputRef
          }
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={
            handleFileSelect
          }
        />

        <input
          ref={
            cameraInputRef
          }
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
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  router.back();
                }
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  18
                }
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Stethoscope
                  size={
                    16
                  }
                  className="text-ice"
                />

                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Agenda
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova Consulta
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {!activePersonId && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              className="rounded-[24px] border border-coral/30 bg-coral/10 p-4"
            >
              <p className="text-sm font-semibold text-coral">
                Pessoa ativa não identificada
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Selecione uma pessoa no Vault antes de cadastrar uma consulta.
              </p>
            </motion.div>
          )}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.01,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <label className="text-sm font-semibold text-ink-primary">
                  Tratamentos e CIDs Relacionados
                </label>
              </div>

              {(tratamentosSelecionados.length >
                0 ||
                cidsSelecionados.length >
                  0) && (
                <button
                  type="button"
                  onClick={
                    () => {
                      trigger(
                        "vibrate"
                      );

                      setTratamentosSelecionados(
                        []
                      );

                      setCidsSelecionados(
                        []
                      );
                    }
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser
                    size={
                      12
                    }
                  />

                  Limpar
                </button>
              )}
            </div>

            {errors.tratamentos && (
              <p className="mb-2 text-xs text-coral">
                {
                  errors.tratamentos
                }
              </p>
            )}

            {errors.cids && (
              <p className="mb-2 text-xs text-coral">
                {
                  errors.cids
                }
              </p>
            )}

            {tratamentosSelecionados.length >
              0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {tratamentosSelecionados.map(
                  (
                    tratamentoId
                  ) => {
                    const tratamento =
                      tratamentos.find(
                        (
                          item
                        ) =>
                          item.id ===
                          tratamentoId
                      );

                    if (
                      !tratamento
                    ) {
                      return null;
                    }

                    const IconComp =
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
                        <IconComp
                          size={
                            14
                          }
                          className="text-violet-400"
                        />

                        <span className="text-xs font-medium text-violet-300">
                          {
                            tratamento.nome
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            (
                              event
                            ) => {
                              event.stopPropagation();

                              trigger(
                                "vibrate"
                              );

                              setTratamentosSelecionados(
                                (
                                  previous
                                ) =>
                                  previous.filter(
                                    (
                                      item
                                    ) =>
                                      item !==
                                      tratamentoId
                                  )
                              );

                              clearError(
                                "tratamentos"
                              );
                            }
                          }
                          className="ml-1 text-violet-400/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${tratamento.nome}`}
                        >
                          <X
                            size={
                              14
                            }
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
                  (
                    cidId
                  ) => {
                    const cid =
                      cids.find(
                        (
                          item
                        ) =>
                          item.id ===
                          cidId
                      );

                    if (
                      !cid
                    ) {
                      return null;
                    }

                    const theme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const IconComp =
                      theme.icon;

                    return (
                      <div
                        key={
                          cidId
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}
                      >
                        <IconComp
                          size={
                            14
                          }
                        />

                        <span className="text-xs font-medium">
                          {
                            cid.codigo
                          }
                        </span>

                        <button
                          type="button"
                          onClick={
                            (
                              event
                            ) => {
                              event.stopPropagation();

                              trigger(
                                "vibrate"
                              );

                              setCidsSelecionados(
                                (
                                  previous
                                ) =>
                                  previous.filter(
                                    (
                                      item
                                    ) =>
                                      item !==
                                      cidId
                                  )
                              );

                              clearError(
                                "cids"
                              );
                            }
                          }
                          className="ml-1 text-current/60 transition-colors hover:text-coral"
                          aria-label={`Remover ${cid.codigo}`}
                        >
                          <X
                            size={
                              14
                            }
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
                disabled={
                  !activePersonId
                }
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsTratamentoModalOpen(
                      true
                    );
                  }
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-violet-300 transition-colors hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-sm font-medium">
                  Vincular Tratamento
                </span>
              </button>

              <button
                type="button"
                disabled={
                  !activePersonId
                }
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsCidModalOpen(
                      true
                    );
                  }
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus
                  size={
                    16
                  }
                />

                <span className="text-sm font-medium">
                  Vincular CID
                </span>
              </button>
            </div>
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.02,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Médico{" "}
                <span className="text-coral">
                  *
                </span>
              </label>

              {medicoId &&
                selectedMedico && (
                  <button
                    type="button"
                    onClick={
                      () => {
                        trigger(
                          "vibrate"
                        );

                        setMedicoId(
                          ""
                        );

                        clearError(
                          "medicoId"
                        );
                      }
                    }
                    className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                  >
                    <Eraser
                      size={
                        12
                      }
                    />

                    Limpar
                  </button>
                )}
            </div>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsMedicoModalOpen(
                    true
                  );
                }
              }
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                errors.medicoId
                  ? "border-coral/50"
                  : "border-surface-border/50"
              } bg-surface-raised`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <UserCheck
                  size={
                    16
                  }
                  className="shrink-0 text-ice"
                />

                <span className="truncate text-ink-primary">
                  {selectedMedico
                    ? `Dr(a). ${selectedMedico.nome} (${selectedMedico.especialidade || "Geral"})`
                    : "Selecionar médico"}
                </span>
              </div>
            </button>

            {errors.medicoId && (
              <p className="ml-1 mt-1 text-xs text-coral">
                {
                  errors.medicoId
                }
              </p>
            )}
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.03,
            }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Hospital
                </label>

                {hospitalId &&
                  selectedHospital && (
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setHospitalId(
                            ""
                          );

                          clearError(
                            "hospitalId"
                          );
                        }
                      }
                      className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                    >
                      <Eraser
                        size={
                          12
                        }
                      />

                      Limpar
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsHospitalModalOpen(
                      true
                    );
                  }
                }
                className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3 text-left text-ink-primary ${
                  errors.hospitalId
                    ? "border-coral/50"
                    : "border-surface-border/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Building2
                    size={
                      16
                    }
                    className="shrink-0 text-violet-400"
                  />

                  <span className="truncate">
                    {selectedHospital
                      ? selectedHospital.nome
                      : "Vincular hospital..."}
                  </span>
                </div>
              </button>

              {errors.hospitalId && (
                <p className="ml-1 mt-1 text-xs text-coral">
                  {
                    errors.hospitalId
                  }
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink-primary">
                  Clínica / Posto
                </label>

                {localId &&
                  selectedLocal && (
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setLocalId(
                            ""
                          );

                          clearError(
                            "localId"
                          );
                        }
                      }
                      className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                    >
                      <Eraser
                        size={
                          12
                        }
                      />

                      Limpar
                    </button>
                  )}
              </div>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsLocalModalOpen(
                      true
                    );
                  }
                }
                className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3 text-left text-ink-primary ${
                  errors.localId
                    ? "border-coral/50"
                    : "border-surface-border/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <MapPin
                    size={
                      16
                    }
                    className="shrink-0 text-emerald-400"
                  />

                  <span className="truncate">
                    {selectedLocal
                      ? selectedLocal.nome
                      : "Vincular local..."}
                  </span>
                </div>
              </button>

              {errors.localId && (
                <p className="ml-1 mt-1 text-xs text-coral">
                  {
                    errors.localId
                  }
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.06,
            }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Data{" "}
                  <span className="text-coral">
                    *
                  </span>
                </label>

                <div className="relative">
                  <Calendar
                    size={
                      16
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={
                      10
                    }
                    value={
                      dataDisplay
                    }
                    onChange={
                      (
                        event
                      ) => {
                        setDataDisplay(
                          handleDateMask(
                            event.target.value
                          )
                        );

                        clearError(
                          "data"
                        );
                      }
                    }
                    className={`w-full rounded-2xl border ${
                      errors.data
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    } bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50`}
                  />
                </div>

                {errors.data && (
                  <p className="ml-1 text-xs text-coral">
                    {
                      errors.data
                    }
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
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
                    placeholder="00:00"
                    maxLength={
                      5
                    }
                    value={
                      horario
                    }
                    onChange={
                      (
                        event
                      ) => {
                        setHorario(
                          handleTimeMask(
                            event.target.value
                          )
                        );

                        clearError(
                          "horario"
                        );
                      }
                    }
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
                Status
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    "agendada",
                    "realizada",
                    "cancelada",
                  ] as const
                ).map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setStatus(
                            item
                          );
                        }
                      }
                      className={`rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        status ===
                        item
                          ? "bg-ice text-void shadow-sm"
                          : "border border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                      aria-pressed={
                        status ===
                        item
                      }
                    >
                      {
                        item
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.09,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Motivo / Assunto"
              placeholder="Ex: Retorno..."
              value={
                motivo
              }
              onChange={
                (
                  event
                ) =>
                  setMotivo(
                    event.target.value
                  )
              }
            />
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.12,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Anotações"
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
              placeholder="Instruções do médico, exames solicitados..."
            />
          </motion.div>

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.15,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">
                Comprovante / Anexo
              </label>
            </div>

            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={
                    () =>
                      fileInputRef.current?.click()
                  }
                >
                  <Upload
                    size={
                      16
                    }
                  />

                  Arquivo
                </Button>

                <Button
                  variant="secondary"
                  onClick={
                    () =>
                      cameraInputRef.current?.click()
                  }
                >
                  <Camera
                    size={
                      16
                    }
                  />

                  Câmera
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                <ImageIcon
                  size={
                    16
                  }
                  className="shrink-0 text-ice"
                />

                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-primary">
                  {
                    attachment.name
                  }
                </p>

                <button
                  type="button"
                  onClick={
                    removeAttachment
                  }
                  className="text-ink-muted transition-colors hover:text-coral"
                  aria-label="Remover anexo"
                >
                  <X
                    size={
                      14
                    }
                  />
                </button>
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={
              handleSubmit
            }
            disabled={
              isSubmitting ||
              !activePersonId
            }
          >
            {isSubmitting ? (
              <>
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />

                Salvando...
              </>
            ) : (
              "Salvar Consulta"
            )}
          </Button>
        </div>

        <SelectionModal<Medico>
          isOpen={
            isMedicoModalOpen
          }
          onClose={
            () =>
              setIsMedicoModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setMedicoId(
                item.id
              );

              clearError(
                "medicoId"
              );

              setIsMedicoModalOpen(
                false
              );
            }
          }
          items={
            medicos
          }
          title="Selecionar Médico"
          renderItem={
            (
              item
            ) => (
              <div>
                <p className="font-medium text-ink-primary">
                  Dr(a).{" "}
                  {
                    item.nome
                  }
                </p>

                {item.especialidade && (
                  <p className="text-xs text-ink-muted">
                    {
                      item.especialidade
                    }
                  </p>
                )}
              </div>
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsMedicoModalOpen(
                false
              );

              router.push(
                "/saude/medicos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Médico"
        />

        <SelectionModal<Hospital>
          isOpen={
            isHospitalModalOpen
          }
          onClose={
            () =>
              setIsHospitalModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setHospitalId(
                item.id
              );

              clearError(
                "hospitalId"
              );

              setIsHospitalModalOpen(
                false
              );
            }
          }
          items={
            hospitais
          }
          title="Selecionar Hospital"
          renderItem={
            (
              item
            ) => (
              <div>
                <p className="font-medium text-ink-primary">
                  {
                    item.nome
                  }
                </p>
              </div>
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsHospitalModalOpen(
                false
              );

              router.push(
                "/saude/hospitais/novo"
              );
            }
          }
          createNewLabel="Cadastrar Hospital"
        />

        <SelectionModal<LocalSaude>
          isOpen={
            isLocalModalOpen
          }
          onClose={
            () =>
              setIsLocalModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setLocalId(
                item.id
              );

              clearError(
                "localId"
              );

              setIsLocalModalOpen(
                false
              );
            }
          }
          items={
            locais
          }
          title="Selecionar Local / Posto"
          renderItem={
            (
              item
            ) => (
              <div>
                <p className="font-medium text-ink-primary">
                  {
                    item.nome
                  }
                </p>
              </div>
            )
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsLocalModalOpen(
                false
              );

              router.push(
                "/saude/locais/novo"
              );
            }
          }
          createNewLabel="Cadastrar Local"
        />

        <SelectionModal<Tratamento>
          isOpen={
            isTratamentoModalOpen
          }
          onClose={
            () =>
              setIsTratamentoModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setTratamentosSelecionados(
                (
                  previous
                ) =>
                  previous.includes(
                    item.id!
                  )
                    ? previous
                    : [
                        ...previous,
                        item.id!,
                      ]
              );

              clearError(
                "tratamentos"
              );
            }
          }
          items={
            tratamentos
          }
          title="Vincular Tratamentos"
          placeholder="Buscar tratamento..."
          renderItem={
            (
              item
            ) => {
              const IconComp =
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
                  <IconComp
                    size={
                      16
                    }
                    className="text-violet-400"
                  />

                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? "text-violet-400"
                        : "text-ink-primary"
                    }`}
                  >
                    {
                      item.nome
                    }
                  </span>

                  {isSelected && (
                    <Check
                      size={
                        14
                      }
                      className="ml-auto text-emerald-400"
                    />
                  )}
                </div>
              );
            }
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              item.nome
          }
          onCreateNew={
            () => {
              setIsTratamentoModalOpen(
                false
              );

              setIsCreatingTratamento(
                true
              );
            }
          }
          createNewLabel="Cadastrar Novo Tratamento"
        />

        <SelectionModal<Cid>
          isOpen={
            isCidModalOpen
          }
          onClose={
            () =>
              setIsCidModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              if (
                !item.id
              ) {
                return;
              }

              trigger(
                "vibrate"
              );

              setCidsSelecionados(
                (
                  previous
                ) =>
                  previous.includes(
                    item.id!
                  )
                    ? previous
                    : [
                        ...previous,
                        item.id!,
                      ]
              );

              clearError(
                "cids"
              );
            }
          }
          items={
            cids
          }
          title="Vincular CIDs"
          placeholder="Buscar CID..."
          renderItem={
            (
              item
            ) => {
              const theme =
                getClinicalTheme(
                  item.descricao ||
                    item.codigo
                );

              const IconComp =
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
                  <IconComp
                    size={
                      16
                    }
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
                    {
                      item.codigo
                    }{" "}
                    -{" "}
                    {
                      item.descricao
                    }
                  </span>

                  {isSelected && (
                    <Check
                      size={
                        14
                      }
                      className="ml-auto text-emerald-400"
                    />
                  )}
                </div>
              );
            }
          }
          getItemId={
            (
              item
            ) =>
              item.id!
          }
          getItemLabel={
            (
              item
            ) =>
              `${item.codigo} - ${item.descricao}`
          }
          onCreateNew={
            () => {
              setIsCidModalOpen(
                false
              );

              setIsCreatingCid(
                true
              );
            }
          }
          createNewLabel="Cadastrar Novo CID"
        />

        <BottomSheet
          isOpen={
            isCreatingTratamento
          }
          onClose={
            () =>
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
              onChange={
                (
                  event
                ) =>
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
                isSavingTratamento ||
                !activePersonId
              }
            >
              {isSavingTratamento ? (
                <Loader2
                  size={
                    16
                  }
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
            isCreatingCid
          }
          onClose={
            () =>
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
              onChange={
                (
                  event
                ) =>
                  setNewCidCodigo(
                    event.target.value
                  )
              }
              autoFocus
            />

            <Input
              label="Descrição"
              placeholder="Ex: Transtorno de déficit de atenção"
              value={
                newCidDescricao
              }
              onChange={
                (
                  event
                ) =>
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
                isSavingCid ||
                !activePersonId
              }
            >
              {isSavingCid ? (
                <Loader2
                  size={
                    16
                  }
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