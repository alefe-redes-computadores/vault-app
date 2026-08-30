// app/saude/rede/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileHeart,
  FlaskConical,
  FolderHeart,
  MapPin,
  Phone,
  Pill,
  RefreshCw,
  Search,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useExames,
} from "@/hooks/useExames";

import {
  useCirurgias,
} from "@/hooks/useCirurgias";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useRegistrosSaude,
} from "@/hooks/useRegistrosSaude";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  Input,
} from "@/components/ui/Input";

import {
  ListCard,
} from "@/components/list";

import {
  isReceitaVencidaSegura,
  sugerirRenovacao,
} from "@/lib/health-insights";

import {
  getDaysUntil,
} from "@/lib/health-utils";

import type {
  Cirurgia,
  Consulta,
  Exame,
  Farmacia,
  Hospital,
  LocalSaude,
  Medico,
  Medicamento,
  Renovacao,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type TabType =
  | "visao-geral"
  | "medicos"
  | "farmacias"
  | "hospitais"
  | "locais"
  | "tratamentos";

type AlertaRede = {
  id: string;

  tipo:
    | "estoque"
    | "receita"
    | "consulta"
    | "exame";

  mensagem:
    string;

  urgencia:
    | "alta"
    | "media"
    | "baixa";

  link:
    string;
};

type TabsConfig = {
  id:
    TabType;

  label:
    string;

  icon:
    React.ElementType;
};

// ============================================================
// CONSTANTES
// ============================================================

const VALID_TABS:
  TabType[] = [
    "visao-geral",
    "medicos",
    "farmacias",
    "hospitais",
    "locais",
    "tratamentos",
  ];

const tabs:
  TabsConfig[] = [
    {
      id:
        "visao-geral",

      label:
        "Visão Geral",

      icon:
        Activity,
    },

    {
      id:
        "medicos",

      label:
        "Médicos",

      icon:
        Stethoscope,
    },

    {
      id:
        "farmacias",

      label:
        "Farmácias",

      icon:
        Pill,
    },

    {
      id:
        "hospitais",

      label:
        "Hospitais",

      icon:
        Building2,
    },

    {
      id:
        "locais",

      label:
        "Locais",

      icon:
        MapPin,
    },

    {
      id:
        "tratamentos",

      label:
        "Tratamentos",

      icon:
        FolderHeart,
    },
  ];

// ============================================================
// HELPERS
// ============================================================

function isTabType(
  value:
    string | null
): value is TabType {
  return Boolean(
    value &&
      VALID_TABS.includes(
        value as TabType
      )
  );
}

function formatDateDisplay(
  isoStr?:
    string | null
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

function normalizeSearch(
  value:
    string
): string {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "pt-BR"
    )
    .trim();
}

function getLocalTypeLabel(
  tipo?: string
): string {
  switch (
    tipo
  ) {
    case "posto_saude":
      return "Posto / UBS";

    case "laboratorio":
      return "Laboratório";

    case "clinica":
      return "Clínica";

    case "outro":
      return "Outro";

    default:
      return "Local de Saúde";
  }
}

// ============================================================
// PAGE
// ============================================================

export default function RedeSaudePage() {
  const {
    trigger,
  } =
    useHapticFeedback();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    activePersonId,
  } =
    useActivePersonId();

  // ==========================================================
  // GLOBAL ACCOUNT ENTITIES
  // ==========================================================

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    farmacias = [],
  } =
    useFarmacias();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  // ==========================================================
  // PERSON-OWNED ENTITIES
  // ==========================================================

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    exames = [],
  } =
    useExames();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const {
    registros = [],
  } =
    useRegistrosSaude();

  // ==========================================================
  // UI
  // ==========================================================

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const tabParam =
    searchParams.get(
      "tab"
    );

  const tabFromUrl:
    TabType =
    isTabType(
      tabParam
    )
      ? tabParam
      : "visao-geral";

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabType>(
      tabFromUrl
    );

  // ==========================================================
  // TAB SYNC
  // ==========================================================

  useEffect(
    () => {
      if (
        activeTab !==
        tabFromUrl
      ) {
        setActiveTab(
          tabFromUrl
        );
      }
    },
    [
      tabFromUrl,
      activeTab,
    ]
  );

  const handleTabChange =
    (
      tab:
        TabType
    ) => {
      trigger(
        "vibrate"
      );

      setActiveTab(
        tab
      );

      setSearch(
        ""
      );

      const params =
        new URLSearchParams(
          searchParams.toString()
        );

      if (
        tab ===
        "visao-geral"
      ) {
        params.delete(
          "tab"
        );
      } else {
        params.set(
          "tab",
          tab
        );
      }

      const query =
        params.toString();

      router.replace(
        query
          ? `/saude/rede?${query}`
          : "/saude/rede",
        {
          scroll:
            false,
        }
      );
    };

  // ==========================================================
  // PERSON SCOPE
  //
  // A Rede é uma tela agregadora.
  //
  // Mesmo que os hooks person-owned já filtrem pela pessoa
  // ativa, mantemos uma segunda barreira explícita.
  // ==========================================================

  const filteredMedicamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return medicamentos.filter(
          (
            medicamento:
              Medicamento
          ) =>
            medicamento.person_id ===
            activePersonId
        );
      },
      [
        medicamentos,
        activePersonId,
      ]
    );

  const filteredTratamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return tratamentos.filter(
          (
            tratamento:
              Tratamento
          ) =>
            tratamento.person_id ===
            activePersonId
        );
      },
      [
        tratamentos,
        activePersonId,
      ]
    );

  const filteredConsultas =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return consultas.filter(
          (
            consulta:
              Consulta
          ) =>
            consulta.person_id ===
            activePersonId
        );
      },
      [
        consultas,
        activePersonId,
      ]
    );

  const filteredExames =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return exames.filter(
          (
            exame:
              Exame
          ) =>
            exame.person_id ===
            activePersonId
        );
      },
      [
        exames,
        activePersonId,
      ]
    );

  const filteredCirurgias =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cirurgias.filter(
          (
            cirurgia:
              Cirurgia
          ) =>
            cirurgia.person_id ===
            activePersonId
        );
      },
      [
        cirurgias,
        activePersonId,
      ]
    );

  const filteredRenovacoes =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return renovacoes.filter(
          (
            renovacao:
              Renovacao
          ) =>
            renovacao.person_id ===
            activePersonId
        );
      },
      [
        renovacoes,
        activePersonId,
      ]
    );

  const filteredRegistros =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return registros.filter(
          (
            registro
          ) =>
            registro.person_id ===
            activePersonId
        );
      },
      [
        registros,
        activePersonId,
      ]
    );

  // ==========================================================
  // MÉDICOS VINCULADOS
  // ==========================================================

  const filteredMedicos =
    useMemo(
      () => {
        const linked =
          new Set<string>();

        for (
          const consulta of
          filteredConsultas
        ) {
          if (
            consulta.medico_id
          ) {
            linked.add(
              consulta.medico_id
            );
          }
        }

        for (
          const cirurgia of
          filteredCirurgias
        ) {
          if (
            cirurgia.medico_id
          ) {
            linked.add(
              cirurgia.medico_id
            );
          }
        }

        for (
          const medicamento of
          filteredMedicamentos
        ) {
          if (
            medicamento.medico_id
          ) {
            linked.add(
              medicamento.medico_id
            );
          }
        }

        for (
          const tratamento of
          filteredTratamentos
        ) {
          for (
            const medicoId of
            tratamento.medico_ids ||
            []
          ) {
            linked.add(
              medicoId
            );
          }
        }

        return medicos.filter(
          (
            medico:
              Medico
          ) =>
            Boolean(
              medico.id &&
                linked.has(
                  medico.id
                )
            )
        );
      },
      [
        medicos,
        filteredConsultas,
        filteredCirurgias,
        filteredMedicamentos,
        filteredTratamentos,
      ]
    );

  // ==========================================================
  // FARMÁCIAS VINCULADAS
  // ==========================================================

  const filteredFarmacias =
    useMemo(
      () => {
        const linked =
          new Set<string>();

        for (
          const medicamento of
          filteredMedicamentos
        ) {
          if (
            medicamento.farmacia_id
          ) {
            linked.add(
              medicamento.farmacia_id
            );
          }
        }

        for (
          const renovacao of
          filteredRenovacoes
        ) {
          if (
            renovacao.farmacia_id
          ) {
            linked.add(
              renovacao.farmacia_id
            );
          }
        }

        return farmacias.filter(
          (
            farmacia:
              Farmacia
          ) =>
            Boolean(
              farmacia.id &&
                linked.has(
                  farmacia.id
                )
            )
        );
      },
      [
        farmacias,
        filteredMedicamentos,
        filteredRenovacoes,
      ]
    );

  // ==========================================================
  // HOSPITAIS VINCULADOS
  //
  // Hospital e Local são entidades globais diferentes.
  // local_id nunca é tratado como hospital_id.
  // ==========================================================

  const filteredHospitais =
    useMemo(
      () => {
        const linked =
          new Set<string>();

        for (
          const consulta of
          filteredConsultas
        ) {
          if (
            consulta.hospital_id
          ) {
            linked.add(
              consulta.hospital_id
            );
          }
        }

        for (
          const cirurgia of
          filteredCirurgias
        ) {
          if (
            cirurgia.hospital_id
          ) {
            linked.add(
              cirurgia.hospital_id
            );
          }
        }

        for (
          const medicamento of
          filteredMedicamentos
        ) {
          if (
            medicamento.hospital_id
          ) {
            linked.add(
              medicamento.hospital_id
            );
          }
        }

        for (
          const renovacao of
          filteredRenovacoes
        ) {
          if (
            renovacao.hospital_id
          ) {
            linked.add(
              renovacao.hospital_id
            );
          }
        }

        for (
          const tratamento of
          filteredTratamentos
        ) {
          for (
            const hospitalId of
            tratamento.hospital_ids ||
            []
          ) {
            linked.add(
              hospitalId
            );
          }
        }

        return hospitais.filter(
          (
            hospital:
              Hospital
          ) =>
            Boolean(
              hospital.id &&
                linked.has(
                  hospital.id
                )
            )
        );
      },
      [
        hospitais,
        filteredConsultas,
        filteredCirurgias,
        filteredMedicamentos,
        filteredRenovacoes,
        filteredTratamentos,
      ]
    );

  // ==========================================================
  // LOCAIS VINCULADOS
  //
  // Local é global, mas entra na Rede desta pessoa quando
  // aparece no histórico clínico dela.
  // ==========================================================

  const filteredLocais =
    useMemo(
      () => {
        const linked =
          new Set<string>();

        for (
          const consulta of
          filteredConsultas
        ) {
          if (
            consulta.local_id
          ) {
            linked.add(
              consulta.local_id
            );
          }
        }

        for (
          const exame of
          filteredExames
        ) {
          if (
            exame.local_id
          ) {
            linked.add(
              exame.local_id
            );
          }
        }

        for (
          const cirurgia of
          filteredCirurgias
        ) {
          if (
            cirurgia.local_id
          ) {
            linked.add(
              cirurgia.local_id
            );
          }
        }

        for (
          const renovacao of
          filteredRenovacoes
        ) {
          if (
            renovacao.local_id
          ) {
            linked.add(
              renovacao.local_id
            );
          }
        }

        for (
          const medicamento of
          filteredMedicamentos
        ) {
          if (
            medicamento.local_id
          ) {
            linked.add(
              medicamento.local_id
            );
          }
        }

        for (
          const tratamento of
          filteredTratamentos
        ) {
          for (
            const localId of
            tratamento.local_ids ||
            []
          ) {
            linked.add(
              localId
            );
          }
        }

        return locais.filter(
          (
            local:
              LocalSaude
          ) =>
            Boolean(
              local.id &&
                linked.has(
                  local.id
                )
            )
        );
      },
      [
        locais,
        filteredConsultas,
        filteredExames,
        filteredCirurgias,
        filteredRenovacoes,
        filteredMedicamentos,
        filteredTratamentos,
      ]
    );

  // ==========================================================
  // ALERTAS
  // ==========================================================

  const alertas =
    useMemo(
      () => {
        const alerts:
          AlertaRede[] =
          [];

        // ------------------------------------------------------
        // MEDICAMENTOS
        // ------------------------------------------------------

        for (
          const medicamento of
          filteredMedicamentos
        ) {
          if (
            !medicamento.id
          ) {
            continue;
          }

          const insight =
            sugerirRenovacao(
              medicamento
            );

          if (
            insight.deveRenovar
          ) {
            alerts.push({
              id:
                `estoque-${medicamento.id}`,

              tipo:
                "estoque",

              mensagem:
                insight.mensagem,

              urgencia:
                insight.urgencia ===
                "nenhuma"
                  ? "baixa"
                  : insight.urgencia,

              link:
                `/saude/medicamentos/detalhes?id=${medicamento.id}`,
            });
          }

          if (
            medicamento.proxima_renovacao &&
            isReceitaVencidaSegura(
              medicamento.proxima_renovacao
            )
          ) {
            alerts.push({
              id:
                `receita-${medicamento.id}`,

              tipo:
                "receita",

              mensagem:
                `Validade registrada da receita de ${medicamento.nome} terminou em ${formatDateDisplay(
                  medicamento.proxima_renovacao
                )}.`,

              urgencia:
                "alta",

              link:
                `/saude/medicamentos/detalhes?id=${medicamento.id}`,
            });
          }
        }

        // ------------------------------------------------------
        // CONSULTAS
        // ------------------------------------------------------

        for (
          const consulta of
          filteredConsultas
        ) {
          if (
            consulta.status !==
              "agendada" ||
            !consulta.id
          ) {
            continue;
          }

          const dias =
            getDaysUntil(
              consulta.data
            );

          if (
            dias ===
              null ||
            dias <
              0 ||
            dias >
              7
          ) {
            continue;
          }

          const nomeMedico =
            consulta.medico ||
            "profissional de saúde";

          alerts.push({
            id:
              `consulta-${consulta.id}`,

            tipo:
              "consulta",

            mensagem:
              dias ===
              0
                ? `Consulta com ${nomeMedico} registrada para hoje.`
                : `Consulta com ${nomeMedico} em ${dias} dia${
                    dias !==
                    1
                      ? "s"
                      : ""
                  }.`,

            urgencia:
              dias <=
              2
                ? "alta"
                : "media",

            link:
              `/saude/consultas/detalhes?id=${consulta.id}`,
          });
        }

        // ------------------------------------------------------
        // EXAMES
        // ------------------------------------------------------

        for (
          const exame of
          filteredExames
        ) {
          if (
            !exame.data_retorno ||
            !exame.id
          ) {
            continue;
          }

          const dias =
            getDaysUntil(
              exame.data_retorno
            );

          if (
            dias ===
            null
          ) {
            continue;
          }

          if (
            dias <
            0
          ) {
            alerts.push({
              id:
                `exame-atrasado-${exame.id}`,

              tipo:
                "exame",

              mensagem:
                `A data registrada para apresentação de "${exame.nome}" passou há ${Math.abs(
                  dias
                )} dia(s).`,

              urgencia:
                "alta",

              link:
                `/saude/exames/detalhes?id=${exame.id}`,
            });

            continue;
          }

          if (
            dias <=
            7
          ) {
            alerts.push({
              id:
                `exame-proximo-${exame.id}`,

              tipo:
                "exame",

              mensagem:
                dias ===
                0
                  ? `Apresentação registrada do exame "${exame.nome}" para hoje.`
                  : `Apresentação registrada do exame "${exame.nome}" em ${dias} dia(s).`,

              urgencia:
                dias <=
                2
                  ? "alta"
                  : "media",

              link:
                `/saude/exames/detalhes?id=${exame.id}`,
            });
          }
        }

        const ordem = {
          alta:
            0,

          media:
            1,

          baixa:
            2,
        };

        return alerts.sort(
          (
            a,
            b
          ) =>
            ordem[
              a.urgencia
            ] -
            ordem[
              b.urgencia
            ]
        );
      },
      [
        filteredMedicamentos,
        filteredConsultas,
        filteredExames,
      ]
    );

  // ==========================================================
  // STATS
  // ==========================================================

  const stats =
    useMemo(
      () => {
        const consultasProximas =
          filteredConsultas.filter(
            (
              consulta
            ) => {
              if (
                consulta.status !==
                "agendada"
              ) {
                return false;
              }

              const dias =
                getDaysUntil(
                  consulta.data
                );

              return (
                dias !==
                  null &&
                dias >=
                  0
              );
            }
          ).length;

        return {
          medicamentos:
            filteredMedicamentos.length,

          medicamentosAtivos:
            filteredMedicamentos.filter(
              (
                medicamento
              ) =>
                medicamento.status ===
                "ativo"
            ).length,

          tratamentos:
            filteredTratamentos.length,

          tratamentosAtivos:
            filteredTratamentos.filter(
              (
                tratamento
              ) =>
                tratamento.status ===
                "ativo"
            ).length,

          registros:
            filteredRegistros.length,

          renovacoes:
            filteredRenovacoes.length,

          consultas:
            filteredConsultas.length,

          consultasProximas,

          exames:
            filteredExames.length,

          cirurgias:
            filteredCirurgias.length,

          medicos:
            filteredMedicos.length,

          farmacias:
            filteredFarmacias.length,

          hospitais:
            filteredHospitais.length,

          locais:
            filteredLocais.length,
        };
      },
      [
        filteredMedicamentos,
        filteredTratamentos,
        filteredRegistros,
        filteredRenovacoes,
        filteredConsultas,
        filteredExames,
        filteredCirurgias,
        filteredMedicos,
        filteredFarmacias,
        filteredHospitais,
        filteredLocais,
      ]
    );

  // ==========================================================
  // SEARCH
  // ==========================================================

  const normalizedSearch =
    useMemo(
      () =>
        normalizeSearch(
          search
        ),
      [
        search,
      ]
    );

  const filteredMedicosSearch =
    useMemo(
      () => {
        if (
          !normalizedSearch
        ) {
          return filteredMedicos;
        }

        return filteredMedicos.filter(
          (
            medico
          ) =>
            normalizeSearch(
              medico.nome
            ).includes(
              normalizedSearch
            ) ||
            normalizeSearch(
              medico.especialidade ||
                ""
            ).includes(
              normalizedSearch
            )
        );
      },
      [
        filteredMedicos,
        normalizedSearch,
      ]
    );

  const filteredFarmaciasSearch =
    useMemo(
      () => {
        if (
          !normalizedSearch
        ) {
          return filteredFarmacias;
        }

        return filteredFarmacias.filter(
          (
            farmacia
          ) =>
            normalizeSearch(
              farmacia.nome
            ).includes(
              normalizedSearch
            ) ||
            normalizeSearch(
              farmacia.endereco ||
                ""
            ).includes(
              normalizedSearch
            )
        );
      },
      [
        filteredFarmacias,
        normalizedSearch,
      ]
    );

  const filteredHospitaisSearch =
    useMemo(
      () => {
        if (
          !normalizedSearch
        ) {
          return filteredHospitais;
        }

        return filteredHospitais.filter(
          (
            hospital
          ) =>
            normalizeSearch(
              hospital.nome
            ).includes(
              normalizedSearch
            ) ||
            normalizeSearch(
              hospital.endereco ||
                ""
            ).includes(
              normalizedSearch
            )
        );
      },
      [
        filteredHospitais,
        normalizedSearch,
      ]
    );

  const filteredLocaisSearch =
    useMemo(
      () => {
        if (
          !normalizedSearch
        ) {
          return filteredLocais;
        }

        return filteredLocais.filter(
          (
            local
          ) =>
            normalizeSearch(
              local.nome
            ).includes(
              normalizedSearch
            ) ||
            normalizeSearch(
              local.endereco ||
                ""
            ).includes(
              normalizedSearch
            ) ||
            normalizeSearch(
              getLocalTypeLabel(
                local.tipo
              )
            ).includes(
              normalizedSearch
            )
        );
      },
      [
        filteredLocais,
        normalizedSearch,
      ]
    );

  const filteredTratamentosSearch =
    useMemo(
      () => {
        if (
          !normalizedSearch
        ) {
          return filteredTratamentos;
        }

        return filteredTratamentos.filter(
          (
            tratamento
          ) =>
            normalizeSearch(
              tratamento.nome
            ).includes(
              normalizedSearch
            ) ||
            normalizeSearch(
              tratamento.condicao ||
                ""
            ).includes(
              normalizedSearch
            )
        );
      },
      [
        filteredTratamentos,
        normalizedSearch,
      ]
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
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
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              >
                <ArrowLeft
                  size={
                    18
                  }
                />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Rede de Apoio
                </p>

                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                  Minha Rede de Saúde
                </h1>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map(
              (
                tab
              ) => {
                const Icon =
                  tab.icon;

                const active =
                  activeTab ===
                  tab.id;

                return (
                  <button
                    key={
                      tab.id
                    }
                    type="button"
                    onClick={
                      () =>
                        handleTabChange(
                          tab.id
                        )
                    }
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? "border-ice bg-ice/12 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <Icon
                      size={
                        14
                      }
                    />

                    {
                      tab.label
                    }
                  </button>
                );
              }
            )}
          </div>

          {activeTab !==
            "visao-geral" && (
            <div className="relative mt-4">
              <Search
                size={
                  16
                }
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />

              <Input
                placeholder={`Buscar ${
                  activeTab ===
                  "medicos"
                    ? "médico"
                    : activeTab ===
                        "farmacias"
                      ? "farmácia"
                      : activeTab ===
                          "hospitais"
                        ? "hospital"
                        : activeTab ===
                            "locais"
                          ? "local"
                          : "tratamento"
                }...`}
                value={
                  search
                }
                onChange={
                  (
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                }
                className="h-11 w-full rounded-2xl bg-surface-raised/60 pl-9 text-sm"
              />
            </div>
          )}
        </header>

        <section className="space-y-3.5 px-5 pt-4">
          {!activePersonId && (
            <div className="flex items-start gap-3 rounded-[24px] border border-amber-400/25 bg-amber-400/5 p-4">
              <AlertTriangle
                size={
                  17
                }
                className="mt-0.5 shrink-0 text-amber-400"
              />

              <div>
                <p className="text-xs font-semibold text-ink-primary">
                  Selecione uma pessoa
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                  A Rede de Saúde é montada a partir do histórico clínico da pessoa ativa.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence
            mode="wait"
          >
            {activeTab ===
              "visao-geral" && (
              <motion.div
                key="visao-geral"
                initial={{
                  opacity:
                    0,
                  y:
                    10,
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
                    -10,
                }}
                transition={{
                  duration:
                    0.2,
                }}
                className="space-y-4"
              >
                {alertas.length >
                  0 && (
                  <div className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle
                        size={
                          16
                        }
                        className="text-amber-400"
                      />

                      <h3 className="text-sm font-semibold text-ink-primary">
                        Alertas Inteligentes
                      </h3>

                      <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                        {
                          alertas.length
                        }
                      </span>
                    </div>

                    <div className="space-y-2">
                      {alertas
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            alerta
                          ) => (
                            <button
                              key={
                                alerta.id
                              }
                              type="button"
                              onClick={
                                () => {
                                  trigger(
                                    "vibrate"
                                  );

                                  router.push(
                                    alerta.link
                                  );
                                }
                              }
                              className={`flex w-full items-start gap-2 rounded-xl p-2 pl-2 text-left text-xs transition-colors hover:bg-surface-raised/50 ${
                                alerta.urgencia ===
                                "alta"
                                  ? "border-l-2 border-coral"
                                  : alerta.urgencia ===
                                      "media"
                                    ? "border-l-2 border-amber-400"
                                    : "border-l-2 border-ice"
                              }`}
                            >
                              {alerta.urgencia ===
                              "alta" ? (
                                <AlertTriangle
                                  size={
                                    14
                                  }
                                  className="mt-0.5 shrink-0 text-coral"
                                />
                              ) : alerta.urgencia ===
                                "media" ? (
                                <Clock
                                  size={
                                    14
                                  }
                                  className="mt-0.5 shrink-0 text-amber-400"
                                />
                              ) : (
                                <CheckCircle2
                                  size={
                                    14
                                  }
                                  className="mt-0.5 shrink-0 text-ice"
                                />
                              )}

                              <span className="text-ink-primary">
                                {
                                  alerta.mensagem
                                }
                              </span>
                            </button>
                          )
                        )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ResumoCard
                    icon={
                      Pill
                    }
                    label="Medicamentos"
                    value={
                      stats.medicamentos
                    }
                    sub={`${stats.medicamentosAtivos} ativos`}
                    color="#10B981"
                    onClick={
                      () =>
                        router.push(
                          "/saude/medicamentos"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      FolderHeart
                    }
                    label="Tratamentos"
                    value={
                      stats.tratamentos
                    }
                    sub={`${stats.tratamentosAtivos} ativos`}
                    color="#8B5CF6"
                    onClick={
                      () =>
                        router.push(
                          "/saude/tratamentos"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      FileHeart
                    }
                    label="Registros de Saúde"
                    value={
                      stats.registros
                    }
                    sub="Sintomas e medições"
                    color="#38BDF8"
                    onClick={
                      () =>
                        router.push(
                          "/saude/registros"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      RefreshCw
                    }
                    label="Renovações"
                    value={
                      stats.renovacoes
                    }
                    sub="Histórico de aquisições"
                    color="#F59E0B"
                    onClick={
                      () =>
                        router.push(
                          "/saude/renovacao"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      Calendar
                    }
                    label="Consultas"
                    value={
                      stats.consultas
                    }
                    sub={`${stats.consultasProximas} próximas`}
                    color="#38BDF8"
                    onClick={
                      () =>
                        router.push(
                          "/saude/consultas"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      FlaskConical
                    }
                    label="Exames"
                    value={
                      stats.exames
                    }
                    sub="Registrados"
                    color="#10B981"
                    onClick={
                      () =>
                        router.push(
                          "/saude/exames"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      Syringe
                    }
                    label="Cirurgias"
                    value={
                      stats.cirurgias
                    }
                    sub="Histórico"
                    color="#EF4444"
                    onClick={
                      () =>
                        router.push(
                          "/saude/cirurgias"
                        )
                    }
                  />

                  <ResumoCard
                    icon={
                      Users
                    }
                    label="Rede de Apoio"
                    value={
                      stats.medicos +
                      stats.farmacias +
                      stats.hospitais +
                      stats.locais
                    }
                    sub={`${stats.medicos} méd., ${stats.farmacias} farm., ${stats.hospitais} hosp., ${stats.locais} locais`}
                    color="#38BDF8"
                    onClick={
                      () =>
                        handleTabChange(
                          "medicos"
                        )
                    }
                  />
                </div>
              </motion.div>
            )}

            {activeTab ===
              "medicos" && (
              <TabList<Medico>
                key="medicos"
                items={
                  filteredMedicosSearch
                }
                icon={
                  Stethoscope
                }
                color="#38BDF8"
                emptyMessage="Nenhum médico vinculado ao histórico clínico desta pessoa."
                onItemClick={
                  (
                    item
                  ) => {
                    if (
                      item.id
                    ) {
                      router.push(
                        `/saude/medicos/detalhes?id=${item.id}`
                      );
                    }
                  }
                }
                renderItem={
                  (
                    item
                  ) => (
                    <div>
                      <p className="truncate font-display text-sm font-semibold text-ink-primary">
                        {
                          item.nome
                        }
                      </p>

                      {item.especialidade && (
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {
                            item.especialidade
                          }
                        </p>
                      )}

                      {item.crm && (
                        <p className="mt-0.5 text-xs text-ink-faint">
                          CRM{" "}
                          {
                            item.crm
                          }
                        </p>
                      )}

                      {item.telefone && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                          <Phone
                            size={
                              11
                            }
                          />

                          <span>
                            {
                              item.telefone
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )
                }
              />
            )}

            {activeTab ===
              "farmacias" && (
              <TabList<Farmacia>
                key="farmacias"
                items={
                  filteredFarmaciasSearch
                }
                icon={
                  Pill
                }
                color="#F59E0B"
                emptyMessage="Nenhuma farmácia vinculada ao histórico desta pessoa."
                onItemClick={
                  (
                    item
                  ) => {
                    if (
                      item.id
                    ) {
                      router.push(
                        `/saude/farmacias/detalhes?id=${item.id}`
                      );
                    }
                  }
                }
                renderItem={
                  (
                    item
                  ) => (
                    <div>
                      <p className="truncate font-display text-sm font-semibold text-ink-primary">
                        {
                          item.nome
                        }
                      </p>

                      {item.endereco && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin
                            size={
                              11
                            }
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {
                              item.endereco
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )
                }
              />
            )}

            {activeTab ===
              "hospitais" && (
              <TabList<Hospital>
                key="hospitais"
                items={
                  filteredHospitaisSearch
                }
                icon={
                  Building2
                }
                color="#8B5CF6"
                emptyMessage="Nenhum hospital vinculado ao histórico clínico desta pessoa."
                onItemClick={
                  (
                    item
                  ) => {
                    if (
                      item.id
                    ) {
                      router.push(
                        `/saude/hospitais/detalhes?id=${item.id}`
                      );
                    }
                  }
                }
                renderItem={
                  (
                    item
                  ) => (
                    <div>
                      <p className="truncate font-display text-sm font-semibold text-ink-primary">
                        {
                          item.nome
                        }
                      </p>

                      {item.endereco && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin
                            size={
                              11
                            }
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {
                              item.endereco
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )
                }
              />
            )}

            {activeTab ===
              "locais" && (
              <TabList<LocalSaude>
                key="locais"
                items={
                  filteredLocaisSearch
                }
                icon={
                  MapPin
                }
                color="#34D399"
                emptyMessage="Nenhum local de saúde vinculado ao histórico clínico desta pessoa."
                onItemClick={
                  (
                    item
                  ) => {
                    if (
                      item.id
                    ) {
                      router.push(
                        `/saude/locais/detalhes?id=${item.id}`
                      );
                    }
                  }
                }
                renderItem={
                  (
                    item
                  ) => (
                    <div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate font-display text-sm font-semibold text-ink-primary">
                          {
                            item.nome
                          }
                        </p>

                        <span className="shrink-0 rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase text-ink-muted">
                          {getLocalTypeLabel(
                            item.tipo
                          )}
                        </span>
                      </div>

                      {item.endereco && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin
                            size={
                              11
                            }
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {
                              item.endereco
                            }
                          </span>
                        </div>
                      )}

                      {item.telefone && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                          <Phone
                            size={
                              11
                            }
                            className="shrink-0"
                          />

                          <span>
                            {
                              item.telefone
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )
                }
              />
            )}

            {activeTab ===
              "tratamentos" && (
              <TabList<Tratamento>
                key="tratamentos"
                items={
                  filteredTratamentosSearch
                }
                icon={
                  FolderHeart
                }
                color="#8B5CF6"
                emptyMessage="Nenhum tratamento cadastrado para esta pessoa."
                onItemClick={
                  (
                    item
                  ) => {
                    if (
                      item.id
                    ) {
                      router.push(
                        `/saude/tratamentos/detalhes?id=${item.id}`
                      );
                    }
                  }
                }
                renderItem={
                  (
                    item
                  ) => {
                    const cor =
                      item.cor ||
                      "#8B5CF6";

                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                cor,
                            }}
                          />

                          <p className="truncate font-display text-sm font-semibold text-ink-primary">
                            {
                              item.nome
                            }
                          </p>
                        </div>

                        {item.condicao && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {
                              item.condicao
                            }
                          </p>
                        )}

                        <span
                          className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                            item.status ===
                            "ativo"
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                              : item.status ===
                                  "concluido"
                                ? "border-ice/20 bg-ice/10 text-ice"
                                : "border-coral/20 bg-coral/10 text-coral"
                          }`}
                        >
                          {item.status ===
                          "ativo"
                            ? "Ativo"
                            : item.status ===
                                "concluido"
                              ? "Concluído"
                              : "Suspenso"}
                        </span>
                      </div>
                    );
                  }
                }
              />
            )}
          </AnimatePresence>
        </section>
      </main>
    </PageTransition>
  );
}

// ============================================================
// RESUMO CARD
// ============================================================

interface ResumoCardProps {
  icon:
    React.ElementType;

  label:
    string;

  value:
    number | string;

  sub:
    string;

  color:
    string;

  onClick:
    () => void;
}

function ResumoCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
}: ResumoCardProps) {
  const {
    trigger,
  } =
    useHapticFeedback();

  return (
    <button
      type="button"
      onClick={
        () => {
          trigger(
            "vibrate"
          );

          onClick();
        }
      }
      className="flex min-h-[150px] flex-col items-start justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.98]"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{
          backgroundColor:
            `${color}20`,

          color,
        }}
      >
        <Icon
          size={
            18
          }
        />
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-2xl font-bold text-ink-primary">
          {
            value
          }
        </p>

        <p className="truncate text-xs font-medium text-ink-muted">
          {
            label
          }
        </p>

        <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-ink-faint">
          {
            sub
          }
        </p>
      </div>
    </button>
  );
}

// ============================================================
// TAB LIST
// ============================================================

interface TabListProps<T> {
  items:
    T[];

  icon:
    React.ElementType;

  color?:
    string;

  emptyMessage:
    string;

  onItemClick:
    (
      item:
        T
    ) => void;

  renderItem:
    (
      item:
        T
    ) =>
      React.ReactNode;
}

function TabList<
  T extends {
    id?:
      string;
  }
>({
  items,
  icon: Icon,
  color = "#38BDF8",
  emptyMessage,
  onItemClick,
  renderItem,
}: TabListProps<T>) {
  const {
    trigger,
  } =
    useHapticFeedback();

  if (
    items.length ===
    0
  ) {
    return (
      <motion.div
        initial={{
          opacity:
            0,

          y:
            12,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        transition={{
          duration:
            0.24,
        }}
        className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
          <Icon
            size={
              22
            }
            className="text-ink-muted"
          />
        </div>

        <h3 className="font-display text-base font-semibold text-ink-primary">
          {
            emptyMessage
          }
        </h3>

        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
          Nenhum registro encontrado neste contexto.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(
        (
          item,
          index
        ) => (
          <ListCard
            key={
              item.id ||
              index
            }
            id={
              item.id ||
              String(
                index
              )
            }
            color={
              color
            }
            onClick={
              () => {
                trigger(
                  "vibrate"
                );

                onItemClick(
                  item
                );
              }
            }
            delay={
              index *
              0.025
            }
            icon={
              <Icon
                size={
                  22
                }q
              />
            }
            showChevron={
              true
            }
          >
            {renderItem(
              item
            )}
          </ListCard>
        )
      )}
    </div>
  );
}