// app/saude/renovacao/nova/page.tsx
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

import {
  motion,
} from "framer-motion";

import {
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  Check,
  DollarSign,
  Eraser,
  FileWarning,
  Loader2,
  MapPin,
  Minus,
  PackagePlus,
  Receipt,
  Save,
  Store,
  Stethoscope,
  TrendingDown,
  TrendingUp,
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
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useRenovacaoInteligente,
} from "@/hooks/useRenovacaoInteligente";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useSubmitAction,
} from "@/hooks/useSubmitAction";

import {
  deleteFile,
  uploadFile,
} from "@/lib/supabase/storage";

import {
  analisarValidadeReceita,
  calcularDataValidadeReceita,
  RECEITA_VALIDADE_PADRAO_DIAS,
} from "@/lib/health-insights";

import {
  getClinicalTheme,
  getDaysUntil,
  getLocalTodayISO,
} from "@/lib/health-utils";

import type {
  Attachment,
  Farmacia,
  Hospital,
  LocalSaude,
  Medico,
  Medicamento,
} from "@/lib/types";

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

// ============================================================
// ANIMAÇÃO
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
// DATAS
// ============================================================

function formatDateToDisplay(
  isoStr: string
): string {
  if (!isoStr) {
    return "";
  }

  const clean =
    isoStr.split("T")[0];

  const parts =
    clean.split("-");

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
): string {
  const clean =
    displayStr.replace(
      /\D/g,
      ""
    );

  if (
    clean.length !==
    8
  ) {
    return "";
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

  if (
    !Number.isInteger(
      day
    ) ||
    !Number.isInteger(
      month
    ) ||
    !Number.isInteger(
      year
    ) ||
    day <
      1 ||
    month <
      1 ||
    month >
      12
  ) {
    return "";
  }

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return "";
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
    )}/${clean.slice(
      4
    )}`;
  }

  if (
    clean.length >
    2
  ) {
    return `${clean.slice(
      0,
      2
    )}/${clean.slice(
      2
    )}`;
  }

  return clean;
}

// ============================================================
// MOEDA / QUANTIDADE
// ============================================================

function handleCurrencyMask(
  value: string
): string {
  const clean =
    value.replace(
      /\D/g,
      ""
    );

  if (!clean) {
    return "";
  }

  const numberVal =
    parseInt(
      clean,
      10
    ) /
    100;

  return numberVal.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
}

function parseCurrency(
  value: string
): number | undefined {
  if (
    !value.trim()
  ) {
    return undefined;
  }

  const parsed =
    Number(
      value
        .replace(
          /\./g,
          ""
        )
        .replace(
          ",",
          "."
        )
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <
      0
  ) {
    return undefined;
  }

  return parsed;
}

function parsePositiveNumber(
  value: string
): number | undefined {
  if (
    !value.trim()
  ) {
    return undefined;
  }

  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <=
      0
  ) {
    return undefined;
  }

  return parsed;
}

// ============================================================
// PAGE
// ============================================================

function NovaRenovacaoContent() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const autoSelectMedId =
    searchParams.get(
      "medicamento_id"
    );

  const {
    run,
    isSubmitting,
  } =
    useSubmitAction();

  const isSubmitLocked =
    useRef(
      false
    );

  const {
    user,
  } =
    useAuth();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    medicamentos,
  } =
    useMedicamentos();

  const {
    addRenovacao,
  } =
    useRenovacoes();

  const {
    farmacias,
  } =
    useFarmacias();

  const {
    medicos,
  } =
    useMedicos();

  const {
    hospitais,
  } =
    useHospitais();

  const {
    locais,
  } =
    useLocais();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement>(
      null
    );

  // ==========================================================
  // VÍNCULOS
  // ==========================================================

  const [
    medicamentoId,
    setMedicamentoId,
  ] =
    useState(
      ""
    );

  const [
    medicoId,
    setMedicoId,
  ] =
    useState(
      ""
    );

  const [
    medicoNome,
    setMedicoNome,
  ] =
    useState(
      ""
    );

  const [
    farmaciaId,
    setFarmaciaId,
  ] =
    useState(
      ""
    );

  const [
    farmaciaNome,
    setFarmaciaNome,
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
    hospitalNome,
    setHospitalNome,
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
    localNome,
    setLocalNome,
  ] =
    useState(
      ""
    );

  // ==========================================================
  // MODAIS
  // ==========================================================

  const [
    isMedModalOpen,
    setIsMedModalOpen,
  ] =
    useState(
      false
    );

  const [
    isPharmacyModalOpen,
    setIsPharmacyModalOpen,
  ] =
    useState(
      false
    );

  const [
    isDoctorModalOpen,
    setIsDoctorModalOpen,
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

  // ==========================================================
  // RECEITA / RENOVAÇÃO
  // ==========================================================

  const [
    dataDisplay,
    setDataDisplay,
  ] =
    useState(
      formatDateToDisplay(
        getLocalTodayISO()
      )
    );

  const [
    proximaDisplay,
    setProximaDisplay,
  ] =
    useState(
      ""
    );

  const [
    proximaEditadaManualmente,
    setProximaEditadaManualmente,
  ] =
    useState(
      false
    );

  // ==========================================================
  // AQUISIÇÃO
  // ==========================================================

  const [
    tipoAquisicao,
    setTipoAquisicao,
  ] =
    useState<
      | "comprado"
      | "sus"
    >(
      "comprado"
    );

  const [
    dataAquisicaoDisplay,
    setDataAquisicaoDisplay,
  ] =
    useState(
      formatDateToDisplay(
        getLocalTodayISO()
      )
    );

  const [
    preco,
    setPreco,
  ] =
    useState(
      ""
    );

  /*
   * Não existe quantidade padrão.
   *
   * A quantidade adquirida/retirada precisa ser informada
   * explicitamente pelo usuário.
   */
  const [
    quantidadeAdicionar,
    setQuantidadeAdicionar,
  ] =
    useState(
      ""
    );

  const [
    lote,
    setLote,
  ] =
    useState(
      ""
    );

  const [
    validadeProduto,
    setValidadeProduto,
  ] =
    useState(
      ""
    );

  const [
    dataProximaRetirada,
    setDataProximaRetirada,
  ] =
    useState(
      ""
    );

  const [
    exigeNovaReceita,
    setExigeNovaReceita,
  ] =
    useState(
      false
    );

  // ==========================================================
  // OUTROS
  // ==========================================================

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
    >(
      {}
    );

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const selectedMedicamento =
    medicamentos.find(
      (
        item
      ) =>
        item.id ===
        medicamentoId
    );

  const selectedFarmacia =
    farmacias.find(
      (
        item
      ) =>
        item.id ===
        farmaciaId
    );

  const selectedMedico =
    medicos.find(
      (
        item
      ) =>
        item.id ===
        medicoId
    );

  const selectedHospital =
    hospitais.find(
      (
        item
      ) =>
        item.id ===
        hospitalId
    );

  const selectedLocal =
    locais.find(
      (
        item
      ) =>
        item.id ===
        localId
    );

  /*
   * O hook continua responsável pela inteligência de preço.
   *
   * A validade da receita é canônica no health-insights.ts.
   */
  const {
    analisePreco,
  } =
    useRenovacaoInteligente(
      medicamentoId,
      farmaciaId,
      preco,
      quantidadeAdicionar
    );

  const theme =
    getClinicalTheme(
      selectedMedicamento
        ?.nome ||
        "Nova Renovação"
    );

  const dataPrescricaoISO =
    dataDisplay.length ===
      10
      ? parseDateToISO(
          dataDisplay
        )
      : "";

  const validadeCanonica =
    dataPrescricaoISO
      ? analisarValidadeReceita(
          dataPrescricaoISO
        )
      : null;

  // ==========================================================
  // VALIDADE CANÔNICA
  // ==========================================================

  const recalcularProximaData =
    (
      dataAtual:
        string,
      ignorarEdicaoManual:
        boolean = false
    ) => {
      if (
        proximaEditadaManualmente &&
        !ignorarEdicaoManual
      ) {
        return;
      }

      if (
        dataAtual.length !==
        10
      ) {
        setProximaDisplay(
          ""
        );

        return;
      }

      const currentISO =
        parseDateToISO(
          dataAtual
        );

      if (
        !currentISO
      ) {
        setProximaDisplay(
          ""
        );

        return;
      }

      const proxISO =
        calcularDataValidadeReceita(
          currentISO
        );

      setProximaDisplay(
        proxISO
          ? formatDateToDisplay(
              proxISO
            )
          : ""
      );
    };

  // ==========================================================
  // SELEÇÃO DO MEDICAMENTO
  // ==========================================================

  const handleSelectMedicamento =
    (
      item:
        Medicamento
    ) => {
      trigger(
        "vibrate"
      );

      setMedicamentoId(
        item.id!
      );

      setIsMedModalOpen(
        false
      );

      if (
        item.medico_id
      ) {
        setMedicoId(
          item.medico_id
        );

        const medicoEncontrado =
          medicos.find(
            (
              medico
            ) =>
              medico.id ===
              item.medico_id
          );

        setMedicoNome(
          medicoEncontrado
            ?.nome ||
            item.medico ||
            ""
        );
      } else {
        setMedicoId(
          ""
        );

        setMedicoNome(
          item.medico ||
            ""
        );
      }

      if (
        item.farmacia_id
      ) {
        setFarmaciaId(
          item.farmacia_id
        );

        const farmaciaEncontrada =
          farmacias.find(
            (
              farmacia
            ) =>
              farmacia.id ===
              item.farmacia_id
          );

        setFarmaciaNome(
          farmaciaEncontrada
            ?.nome ||
            item.farmacia ||
            ""
        );
      } else {
        setFarmaciaId(
          ""
        );

        setFarmaciaNome(
          item.farmacia ||
            ""
        );
      }

      setProximaEditadaManualmente(
        false
      );

      recalcularProximaData(
        dataDisplay,
        true
      );
    };

  useEffect(
    () => {
      if (
        !autoSelectMedId ||
        medicamentoId ||
        medicamentos.length ===
          0
      ) {
        return;
      }

      const med =
        medicamentos.find(
          (
            item
          ) =>
            item.id ===
            autoSelectMedId
        );

      if (
        med
      ) {
        handleSelectMedicamento(
          med
        );
      }
    },
    [
      autoSelectMedId,
      medicamentos,
      medicamentoId,
    ]
  );

  // ==========================================================
  // BLOB CLEANUP
  // ==========================================================

  useEffect(
    () => {
      return () => {
        if (
          attachment?.url?.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            attachment.url
          );
        }
      };
    },
    [
      attachment,
    ]
  );

  // ==========================================================
  // DATA
  // ==========================================================

  const handleDataChange =
    (
      value:
        string
    ) => {
      const masked =
        handleDateMask(
          value
        );

      setDataDisplay(
        masked
      );

      recalcularProximaData(
        masked
      );
    };

  // ==========================================================
  // ANEXO
  // ==========================================================

  const setSelectedFile =
    (
      file:
        File,
      nameOverride?:
        string
    ) => {
      trigger(
        "vibrate"
      );

      if (
        attachment?.url?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          attachment.url
        );
      }

      const previewUrl =
        URL.createObjectURL(
          file
        );

      setLocalFile(
        file
      );

      setAttachment({
        id:
          crypto.randomUUID(),

        url:
          previewUrl,

        name:
          nameOverride ||
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
    };

  const handleFileSelect =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[
          0
        ];

      if (
        file
      ) {
        setSelectedFile(
          file
        );
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
        event.target.files?.[
          0
        ];

      if (
        file
      ) {
        setSelectedFile(
          file,
          `renovacao_${Date.now()}.jpg`
        );
      }

      event.target.value =
        "";
    };

  const removeAttachment =
    () => {
      if (
        attachment?.url?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          attachment.url
        );
      }

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
  // VALIDAÇÃO
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
        newErrors.person =
          "Pessoa ativa não identificada.";
      }

      if (
        !medicamentoId
      ) {
        newErrors.medicamentoId =
          "Selecione o medicamento";
      }

      const dataISO =
        parseDateToISO(
          dataDisplay
        );

      if (
        !dataISO
      ) {
        newErrors.data =
          "Data inválida";
      }

      if (
        proximaDisplay &&
        !parseDateToISO(
          proximaDisplay
        )
      ) {
        newErrors.proxima =
          "Data inválida";
      }

      const dataAquisicaoISO =
        parseDateToISO(
          dataAquisicaoDisplay
        );

      if (
        !dataAquisicaoISO
      ) {
        newErrors.dataAquisicao =
          tipoAquisicao ===
            "sus"
            ? "Data da retirada inválida"
            : "Data da compra inválida";
      }

      if (
        validadeProduto &&
        !parseDateToISO(
          validadeProduto
        )
      ) {
        newErrors.validadeProduto =
          "Data inválida";
      }

      if (
        tipoAquisicao ===
          "sus" &&
        dataProximaRetirada &&
        !parseDateToISO(
          dataProximaRetirada
        )
      ) {
        newErrors.dataProximaRetirada =
          "Data inválida";
      }

      if (
        quantidadeAdicionar.trim() &&
        parsePositiveNumber(
          quantidadeAdicionar
        ) ===
          undefined
      ) {
        newErrors.quantidadeAdicionar =
          "Informe uma quantidade maior que zero";
      }

      if (
        tipoAquisicao ===
          "comprado" &&
        preco.trim() &&
        parseCurrency(
          preco
        ) ===
          undefined
      ) {
        newErrors.preco =
          "Preço inválido";
      }

      setErrors(
        newErrors
      );

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        trigger(
          "error"
        );
      }

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
        isSubmitLocked.current ||
        isSubmitting
      ) {
        return;
      }

      if (
        !validate()
      ) {
        return;
      }

      isSubmitLocked.current =
        true;

      run(
        async () => {
          if (
            !activePersonId
          ) {
            throw new Error(
              "Pessoa ativa não identificada."
            );
          }

          if (
            !medicamentoId
          ) {
            throw new Error(
              "Medicamento não identificado."
            );
          }

          const dataISO =
            parseDateToISO(
              dataDisplay
            );

          if (
            !dataISO
          ) {
            throw new Error(
              "Data da renovação inválida."
            );
          }

          const dataAquisicaoISO =
            parseDateToISO(
              dataAquisicaoDisplay
            );

          if (
            !dataAquisicaoISO
          ) {
            throw new Error(
              tipoAquisicao ===
                "sus"
                ? "Data da retirada inválida."
                : "Data da compra inválida."
            );
          }

          /*
           * A validade nasce automaticamente da regra canônica
           * atual do Vault.
           *
           * Quando o usuário altera o campo manualmente,
           * preservamos a data explicitamente escolhida.
           */
          const proximaISO =
            proximaDisplay
              ? parseDateToISO(
                  proximaDisplay
                ) ||
                undefined
              : calcularDataValidadeReceita(
                  dataISO
                ) ||
                undefined;

          const dataProximaRetiradaISO =
            tipoAquisicao ===
              "sus" &&
            dataProximaRetirada
              ? parseDateToISO(
                  dataProximaRetirada
                ) ||
                undefined
              : undefined;

          const validadeProdutoISO =
            validadeProduto
              ? parseDateToISO(
                  validadeProduto
                ) ||
                undefined
              : undefined;

          const precoNumerico =
            tipoAquisicao ===
              "comprado"
              ? parseCurrency(
                  preco
                )
              : undefined;

          const quantidadeNum =
            parsePositiveNumber(
              quantidadeAdicionar
            );

          let uploadedStorageUrl:
            string | undefined;

          try {
            // ==================================================
            // 1. ANEXO
            //
            // Upload remoto fica fora da transaction IndexedDB.
            // Se a operação de domínio falhar depois, o arquivo
            // recém-enviado é removido no catch.
            // ==================================================

            if (
              localFile
            ) {
              if (
                !user
              ) {
                throw new Error(
                  "É necessário estar autenticado para enviar o anexo."
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
                error ||
                !url
              ) {
                throw new Error(
                  "Não foi possível enviar o anexo da renovação."
                );
              }

              uploadedStorageUrl =
                url;
            }

            // ==================================================
            // 2. OPERAÇÃO DE DOMÍNIO
            //
            // O repository é responsável atomicamente por:
            //
            // - criar o evento histórico de renovação;
            // - validar person ownership;
            // - atualizar estado atual do medicamento;
            // - incrementar estoque somente quando quantidade
            //   explícita for conhecida;
            // - enfileirar renovação;
            // - enfileirar medicamento;
            // - iniciar sync somente após commit local.
            //
            // A página NÃO atualiza mais medicamento diretamente.
            // ==================================================

            await addRenovacao(
              {
                medicamento_id:
                  medicamentoId,

                medico_id:
                  medicoId ||
                  undefined,

                farmacia_id:
                  farmaciaId ||
                  undefined,

                hospital_id:
                  hospitalId ||
                  undefined,

                local_id:
                  localId ||
                  undefined,

                tipo_aquisicao:
                  tipoAquisicao,

                data_proxima_retirada:
                  dataProximaRetiradaISO,

                /*
                 * Informação declarada no evento atual.
                 *
                 * O Vault não interpreta este campo como
                 * prescrição ou regra médica.
                 */
                exige_nova_receita:
                  tipoAquisicao ===
                    "sus"
                    ? exigeNovaReceita
                    : undefined,

                quantidade:
                  quantidadeNum,

                preco:
                  precoNumerico,

                lote:
                  lote.trim() ||
                  undefined,

                validade_produto:
                  validadeProdutoISO,

                data:
                  dataISO,

                data_aquisicao:
                  dataAquisicaoISO,

                anexo_url:
                  uploadedStorageUrl,

                observacoes:
                  observacoes.trim() ||
                  undefined,
              },
              {
                proximaRenovacao:
                  proximaISO,
              }
            );
          } catch (
            error
          ) {
            /*
             * Não existe mais rollback manual da Renovacao.
             *
             * A criação da renovação + alteração do medicamento +
             * filas de sincronização pertencem à mesma transaction
             * no repository.
             *
             * Portanto, se essa operação falhar, o Dexie desfaz
             * todo o bloco automaticamente.
             *
             * O único recurso externo à transaction é o arquivo
             * enviado ao Storage. Esse sim precisa de compensação.
             */
            if (
              uploadedStorageUrl
            ) {
              try {
                await deleteFile(
                  uploadedStorageUrl
                );
              } catch (
                cleanupError
              ) {
                console.error(
                  "[NovaRenovacao] Falha ao limpar anexo órfão:",
                  cleanupError
                );
              }
            }

            throw error;
          }

          if (
            attachment?.url?.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              attachment.url
            );
          }
        },
        {
          successMessage:
            "Aquisição registrada com sucesso",

          errorMessage:
            "Erro ao salvar renovação",

          goBackOnSuccess:
            true,
        }
      ).finally(
        () => {
          isSubmitLocked.current =
            false;
        }
      );
    };

  // ==========================================================
  // VALIDADE DERIVADA
  // ==========================================================

  const proximaISOAtual =
    proximaDisplay.length ===
      10
      ? parseDateToISO(
          proximaDisplay
        )
      : "";

  /*
   * Se a data permanece automática, usamos diretamente a
   * análise canônica produzida pelo cérebro.
   *
   * Se houve edição manual, calculamos somente a distância até
   * a data explicitamente informada.
   */
  const calcDiasVencimento =
    proximaEditadaManualmente
      ? proximaISOAtual
        ? getDaysUntil(
            proximaISOAtual
          )
        : null
      : validadeCanonica
          ?.diasRestantes ??
        null;

  // ==========================================================
  // RENDER
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

        {/* ====================================================
            HEADER
            ==================================================== */}

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
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova aquisição / retirada
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* ==================================================
              IDENTIDADE
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all duration-300 ${theme.borderClass}`}
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <Receipt
                  size={
                    24
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`font-mono text-xs font-bold uppercase tracking-wider ${theme.textClass}`}
                >
                  AQUISIÇÃO
                </p>

                <h2 className="mt-0.5 line-clamp-2 font-display text-base font-semibold text-ink-primary">
                  {selectedMedicamento
                    ? selectedMedicamento.nome
                    : "Aguardando seleção..."}
                </h2>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              MEDICAMENTO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              Medicamento Vinculado{" "}
              <span className="text-coral">
                *
              </span>
            </label>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsMedModalOpen(
                    true
                  );
                }
              }
              className={`flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3 text-left text-ink-primary ${
                errors.medicamentoId
                  ? "border-coral/50"
                  : "border-surface-border/50"
              }`}
            >
              <span className="truncate">
                {selectedMedicamento
                  ? `${selectedMedicamento.nome}${
                      selectedMedicamento.dosagem
                        ? ` · ${selectedMedicamento.dosagem}`
                        : ""
                    }`
                  : "Selecionar medicamento"}
              </span>
            </button>

            {errors.medicamentoId && (
              <p className="mt-1 text-xs text-coral">
                {
                  errors.medicamentoId
                }
              </p>
            )}
          </motion.div>

          {/* ==================================================
              MÉDICO
              ================================================== */}

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
                Médico Prescritor
              </label>

              {(medicoId ||
                medicoNome) && (
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

                      setMedicoNome(
                        ""
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

                  setIsDoctorModalOpen(
                    true
                  );
                }
              }
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Stethoscope
                  size={
                    16
                  }
                  className="shrink-0 text-ice"
                />

                <span className="truncate">
                  {selectedMedico
                    ?.nome ||
                    medicoNome ||
                    "Selecionar médico..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              HOSPITAL
              ================================================== */}

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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Hospital
              </label>

              {hospitalId && (
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

                      setHospitalNome(
                        ""
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
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2
                  size={
                    16
                  }
                  className="shrink-0 text-violet-400"
                />

                <span className="truncate">
                  {selectedHospital
                    ?.nome ||
                    hospitalNome ||
                    "Selecionar hospital..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              LOCAL
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.04,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Local / Posto
              </label>

              {localId && (
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

                      setLocalNome(
                        ""
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
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin
                  size={
                    16
                  }
                  className="shrink-0 text-emerald-400"
                />

                <span className="truncate">
                  {selectedLocal
                    ?.nome ||
                    localNome ||
                    "Selecionar local..."}
                </span>
              </span>

              <span className="text-xs font-medium text-ice">
                Alterar
              </span>
            </button>
          </motion.div>

          {/* ==================================================
              DATAS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.05,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Data da Prescrição *
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
                    placeholder="DD/MM/AAAA"
                    value={
                      dataDisplay
                    }
                    onChange={
                      (
                        event
                      ) =>
                        handleDataChange(
                          event.target.value
                        )
                    }
                    maxLength={
                      10
                    }
                    inputMode="numeric"
                    className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50 ${
                      errors.data
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    }`}
                  />
                </div>

                {errors.data && (
                  <p className="mt-1 text-xs text-coral">
                    {
                      errors.data
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Validade / próxima renovação
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
                    placeholder="DD/MM/AAAA"
                    value={
                      proximaDisplay
                    }
                    onChange={
                      (
                        event
                      ) => {
                        setProximaEditadaManualmente(
                          true
                        );

                        setProximaDisplay(
                          handleDateMask(
                            event.target.value
                          )
                        );
                      }
                    }
                    maxLength={
                      10
                    }
                    inputMode="numeric"
                    className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50 ${
                      errors.proxima
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    }`}
                  />
                </div>

                {errors.proxima && (
                  <p className="mt-1 text-xs text-coral">
                    {
                      errors.proxima
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-ice/15 bg-ice/5 px-3.5 py-3">
              <div className="flex items-start gap-2">
                <Calendar
                  size={
                    14
                  }
                  className="mt-0.5 shrink-0 text-ice"
                />

                <div>
                  <p className="text-[11px] font-semibold text-ink-primary">
                    Validade calculada pelo Vault
                  </p>

                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                    O Vault preenche automaticamente esta data em{" "}
                    {RECEITA_VALIDADE_PADRAO_DIAS} dias após a prescrição, conforme a regra atual do aplicativo. Você pode alterar a data manualmente quando necessário.
                  </p>

                  {proximaEditadaManualmente && (
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setProximaEditadaManualmente(
                            false
                          );

                          recalcularProximaData(
                            dataDisplay,
                            true
                          );
                        }
                      }
                      className="mt-2 text-[11px] font-semibold text-ice"
                    >
                      Restaurar cálculo automático
                    </button>
                  )}
                </div>
              </div>
            </div>

            {calcDiasVencimento !==
              null && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  calcDiasVencimento <
                  0
                    ? "border-coral/20 bg-coral/10 text-coral"
                    : calcDiasVencimento <=
                        7
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                }`}
              >
                <Calendar
                  size={
                    14
                  }
                />

                {calcDiasVencimento <
                0
                  ? `A data informada passou há ${Math.abs(
                      calcDiasVencimento
                    )} dia(s).`
                  : calcDiasVencimento ===
                      0
                    ? "A data informada é hoje."
                    : `Faltam ${calcDiasVencimento} dia(s) para a data informada.`}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              AQUISIÇÃO
              ================================================== */}

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
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">
              Forma de Aquisição
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setTipoAquisicao(
                      "comprado"
                    );
                  }
                }
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  tipoAquisicao ===
                  "comprado"
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                <Store
                  size={
                    16
                  }
                />

                Particular
              </button>

              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setTipoAquisicao(
                      "sus"
                    );
                  }
                }
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  tipoAquisicao ===
                  "sus"
                    ? "border-emerald-500 bg-emerald-500/12 text-emerald-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                <Receipt
                  size={
                    16
                  }
                />

                SUS / Governo
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
                0.065,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <Calendar
                size={
                  16
                }
                className={
                  tipoAquisicao ===
                    "sus"
                    ? "text-emerald-400"
                    : "text-ice"
                }
              />

              <div>
                <h3 className="text-sm font-semibold text-ink-primary">
                  {tipoAquisicao ===
                  "sus"
                    ? "Data da retirada"
                    : "Data da compra"}
                </h3>

                <p className="mt-0.5 text-[11px] text-ink-muted">
                  Esta é a data usada no histórico de aquisições e no financeiro do Vault.
                </p>
              </div>
            </div>

            <div className="relative">
              <Calendar
                size={
                  16
                }
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />

              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={
                  dataAquisicaoDisplay
                }
                onChange={
                  (
                    event
                  ) =>
                    setDataAquisicaoDisplay(
                      handleDateMask(
                        event.target.value
                      )
                    )
                }
                maxLength={
                  10
                }
                inputMode="numeric"
                className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none ${
                  errors.dataAquisicao
                    ? "border-coral/50"
                    : tipoAquisicao ===
                        "sus"
                      ? "border-surface-border/50 focus:border-emerald-500/50"
                      : "border-surface-border/50 focus:border-ice/50"
                }`}
              />
            </div>

            {errors.dataAquisicao && (
              <p className="mt-1 text-xs text-coral">
                {
                  errors.dataAquisicao
                }
              </p>
            )}
          </motion.div>

          {/* ==================================================
              COMPRA
              ================================================== */}

          {tipoAquisicao ===
          "comprado" ? (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.07,
              }}
              className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <Store
                  size={
                    16
                  }
                  className="text-ice"
                />

                <h3 className="text-sm font-semibold text-ink-primary">
                  Dados da Compra
                </h3>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-ink-primary">
                    Farmácia
                  </label>

                  {farmaciaId && (
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setFarmaciaId(
                            ""
                          );

                          setFarmaciaNome(
                            ""
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
                    () =>
                      setIsPharmacyModalOpen(
                        true
                      )
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                >
                  <span className="truncate font-medium text-ink-primary">
                    {selectedFarmacia
                      ?.nome ||
                      farmaciaNome ||
                      "Onde comprou?"}
                  </span>

                  <span className="text-xs font-bold text-ice">
                    Selecionar
                  </span>
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Valor total da compra (R$)
                </label>

                <div className="relative">
                  <DollarSign
                    size={
                      16
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={
                      preco
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setPreco(
                          handleCurrencyMask(
                            event.target.value
                          )
                        )
                    }
                    className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none focus:border-ice/50 ${
                      errors.preco
                        ? "border-coral/50"
                        : "border-surface-border/50"
                    }`}
                  />
                </div>

                {errors.preco && (
                  <p className="mt-1 text-xs text-coral">
                    {
                      errors.preco
                    }
                  </p>
                )}

                <p className="mt-1.5 text-[11px] text-ink-muted">
                  Informe o valor total pago nesta compra. A quantidade adquirida é registrada separadamente e não multiplica este valor.
                </p>

                {analisePreco && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {analisePreco.diff >
                    0 ? (
                      <>
                        <TrendingDown
                          size={
                            14
                          }
                          className="text-emerald-400"
                        />

                        <span className="text-emerald-400">
                          R${" "}
                          {analisePreco.diff
                            .toFixed(
                              2
                            )
                            .replace(
                              ".",
                              ","
                            )}{" "}
                          mais barato que a compra anterior para a mesma quantidade
                          {analisePreco.farmaciaAnteriorName
                            ? ` em ${analisePreco.farmaciaAnteriorName}`
                            : ""}
                          .
                        </span>
                      </>
                    ) : analisePreco.diff <
                      0 ? (
                      <>
                        <TrendingUp
                          size={
                            14
                          }
                          className="text-coral"
                        />

                        <span className="text-coral">
                          R${" "}
                          {Math.abs(
                            analisePreco.diff
                          )
                            .toFixed(
                              2
                            )
                            .replace(
                              ".",
                              ","
                            )}{" "}
                          mais caro que a compra anterior para a mesma quantidade
                          {analisePreco.farmaciaAnteriorName
                            ? ` em ${analisePreco.farmaciaAnteriorName}`
                            : ""}
                          .
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus
                          size={
                            14
                          }
                          className="text-ink-muted"
                        />

                        <span className="text-ink-muted">
                          Mesmo custo proporcional da compra anterior.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-primary">
                  <PackagePlus
                    size={
                      16
                    }
                    className="text-ink-muted"
                  />

                  Quantidade adquirida
                </label>

                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  placeholder="Opcional"
                  value={
                    quantidadeAdicionar
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setQuantidadeAdicionar(
                        event.target.value
                      )
                  }
                  error={
                    errors.quantidadeAdicionar
                  }
                />

                <p className="mt-1.5 text-[11px] text-ink-muted">
                  Se informada, essa quantidade será adicionada ao saldo atual do medicamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Lote (opcional)"
                  value={
                    lote
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setLote(
                        event.target.value
                      )
                  }
                  placeholder="Lote..."
                />

                <Input
                  label="Validade do produto"
                  value={
                    validadeProduto
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setValidadeProduto(
                        handleDateMask(
                          event.target.value
                        )
                      )
                  }
                  placeholder="DD/MM/AAAA"
                  maxLength={
                    10
                  }
                  inputMode="numeric"
                  error={
                    errors.validadeProduto
                  }
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.07,
              }}
              className="space-y-4 rounded-[28px] border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check
                    size={
                      16
                    }
                  />
                </div>

                <h3 className="text-sm font-semibold text-emerald-400">
                  Retirada SUS / Governo
                </h3>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-ink-primary">
                    Posto / Farmácia Pública
                  </label>

                  {farmaciaId && (
                    <button
                      type="button"
                      onClick={
                        () => {
                          trigger(
                            "vibrate"
                          );

                          setFarmaciaId(
                            ""
                          );

                          setFarmaciaNome(
                            ""
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
                    () =>
                      setIsPharmacyModalOpen(
                        true
                      )
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                >
                  <span className="truncate font-medium text-ink-primary">
                    {selectedFarmacia
                      ?.nome ||
                      farmaciaNome ||
                      "Onde retirou?"}
                  </span>

                  <span className="text-xs font-bold text-ice">
                    Selecionar
                  </span>
                </button>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-primary">
                  <PackagePlus
                    size={
                      16
                    }
                    className="text-ink-muted"
                  />

                  Quantidade retirada
                </label>

                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  placeholder="Opcional"
                  value={
                    quantidadeAdicionar
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setQuantidadeAdicionar(
                        event.target.value
                      )
                  }
                  error={
                    errors.quantidadeAdicionar
                  }
                />

                <p className="mt-1.5 text-[11px] text-ink-muted">
                  Se informada, essa quantidade será adicionada ao saldo atual do medicamento.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                  Próxima data informada para retorno
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
                    placeholder="DD/MM/AAAA"
                    value={
                      dataProximaRetirada
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setDataProximaRetirada(
                          handleDateMask(
                            event.target.value
                          )
                        )
                    }
                    maxLength={
                      10
                    }
                    inputMode="numeric"
                    className={`w-full rounded-2xl border bg-surface-raised py-3 pl-9 pr-4 font-mono text-sm text-ink-primary outline-none ${
                      errors.dataProximaRetirada
                        ? "border-coral/50"
                        : "border-surface-border/50 focus:border-emerald-500/50"
                    }`}
                  />
                </div>

                {errors.dataProximaRetirada && (
                  <p className="mt-1 text-xs text-coral">
                    {
                      errors.dataProximaRetirada
                    }
                  </p>
                )}

                <p className="mt-1.5 text-[11px] text-ink-muted">
                  O Vault poderá usar essa data como referência para lembretes e insights de próxima retirada.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  checked={
                    exigeNovaReceita
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setExigeNovaReceita(
                        event.target.checked
                      )
                  }
                  className="h-4 w-4 rounded border-surface-border/50 bg-surface-raised text-ice focus:ring-ice/20"
                />

                <span className="text-sm text-ink-primary">
                  Foi informado que será necessária nova receita na próxima retirada
                </span>
              </label>
            </motion.div>
          )}

          {/* ==================================================
              OBSERVAÇÕES
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.08,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações (opcional)"
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
              placeholder="Notas sobre esta renovação..."
            />
          </motion.div>

          {/* ==================================================
              ANEXO
              ================================================== */}

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
            <label className="mb-3 block text-sm font-medium text-ink-primary">
              Receita / Comprovante (opcional)
            </label>

            {!attachment ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised p-6">
                <FileWarning
                  size={
                    32
                  }
                  className="mb-2 text-ink-muted"
                />

                <p className="text-sm font-semibold text-ink-primary">
                  Nenhum arquivo anexado
                </p>

                <p className="mb-4 mt-1 text-center text-xs text-ink-muted">
                  Você pode guardar foto ou PDF relacionado a esta renovação.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={
                      () =>
                        fileInputRef.current?.click()
                    }
                    className="flex items-center gap-2 rounded-xl bg-ice/10 px-4 py-2 text-xs font-bold text-ice active:scale-95"
                  >
                    <Upload
                      size={
                        14
                      }
                    />

                    Arquivo
                  </button>

                  <button
                    type="button"
                    onClick={
                      () =>
                        cameraInputRef.current?.click()
                    }
                    className="flex items-center gap-2 rounded-xl bg-ice/10 px-4 py-2 text-xs font-bold text-ice active:scale-95"
                  >
                    <Camera
                      size={
                        14
                      }
                    />

                    Câmera
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">
                  {attachment.type ===
                  "image" ? (
                    <img
                      src={
                        attachment.url
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileWarning
                      size={
                        20
                      }
                      className="m-auto text-coral"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {
                      attachment.name
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    removeAttachment
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"
                  aria-label="Remover anexo"
                >
                  <X
                    size={
                      16
                    }
                  />
                </button>
              </div>
            )}
          </motion.div>
        </section>

        {/* ====================================================
            FOOTER
            ==================================================== */}

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
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
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

            {isSubmitting
              ? "Salvando..."
              : "Salvar Renovação"}
          </Button>
        </div>

        {/* ====================================================
            MEDICAMENTO
            ==================================================== */}

        <SelectionModal<Medicamento>
          isOpen={
            isMedModalOpen
          }
          onClose={
            () =>
              setIsMedModalOpen(
                false
              )
          }
          onSelect={
            handleSelectMedicamento
          }
          items={
            medicamentos
          }
          title="Selecionar medicamento"
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

                {item.dosagem && (
                  <p className="text-xs text-ink-muted">
                    {
                      item.dosagem
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
              setIsMedModalOpen(
                false
              );

              router.push(
                "/saude/medicamentos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Medicamento"
        />

        {/* ====================================================
            MÉDICO
            ==================================================== */}

        <SelectionModal<Medico>
          isOpen={
            isDoctorModalOpen
          }
          onClose={
            () =>
              setIsDoctorModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setMedicoId(
                item.id!
              );

              setMedicoNome(
                item.nome
              );

              setIsDoctorModalOpen(
                false
              );
            }
          }
          items={
            medicos
          }
          title="Selecionar médico"
          placeholder="Buscar médico..."
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
              setIsDoctorModalOpen(
                false
              );

              router.push(
                "/saude/medicos/novo"
              );
            }
          }
          createNewLabel="Cadastrar Novo Médico"
        />

        {/* ====================================================
            HOSPITAL
            ==================================================== */}

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
              trigger(
                "vibrate"
              );

              setHospitalId(
                item.id!
              );

              setHospitalNome(
                item.nome
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
          placeholder="Buscar hospital..."
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

                {item.endereco && (
                  <p className="text-xs text-ink-muted">
                    {
                      item.endereco
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

        {/* ====================================================
            LOCAL
            ==================================================== */}

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
              trigger(
                "vibrate"
              );

              setLocalId(
                item.id!
              );

              setLocalNome(
                item.nome
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
          placeholder="Buscar local..."
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

                {item.endereco && (
                  <p className="text-xs text-ink-muted">
                    {
                      item.endereco
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

        {/* ====================================================
            FARMÁCIA
            ==================================================== */}

        <SelectionModal<Farmacia>
          isOpen={
            isPharmacyModalOpen
          }
          onClose={
            () =>
              setIsPharmacyModalOpen(
                false
              )
          }
          onSelect={
            (
              item
            ) => {
              trigger(
                "vibrate"
              );

              setFarmaciaId(
                item.id!
              );

              setFarmaciaNome(
                item.nome
              );

              setIsPharmacyModalOpen(
                false
              );
            }
          }
          items={
            farmacias
          }
          title="Selecionar farmácia"
          placeholder="Buscar farmácia..."
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

                {item.endereco && (
                  <p className="text-xs text-ink-muted">
                    {
                      item.endereco
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
              setIsPharmacyModalOpen(
                false
              );

              router.push(
                "/saude/farmacias/novo"
              );
            }
          }
          createNewLabel="Cadastrar Farmácia"
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function NovaRenovacaoPage() {
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
      <NovaRenovacaoContent />
    </Suspense>
  );
}