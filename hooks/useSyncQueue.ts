// hooks/useSyncQueue.ts

"use client";

import { db } from "@/lib/db";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";

import type {
  AppSettings,
  BankCard,
  Cid,
  Cirurgia,
  Consulta,
  Credential,
  Document,
  DoseLog,
  Exame,
  Farmacia,
  Hospital,
  InstituicaoEnsino,
  LocalSaude,
  Medicamento,
  Medico,
  Person,
  RegistroSaude,
  Renovacao,
  SyncQueueItem,
  Tratamento,
  Vault,
  VaultMember,
} from "@/lib/types";

const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 60_000;

type SyncLogType =
  | "info"
  | "success"
  | "error";

interface SyncLog {
  time: string;
  message: string;
  type: SyncLogType;
}

interface AnexoClinico {
  id?: string;
  user_id?: string;
  person_id?: string;

  tratamento_id?: string;
  medicamento_id?: string;

  nome?: string;
  titulo?: string;

  tipo?: string;
  url?: string;

  thumbnail_url?: string;
  tags?: string[];

  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export function useSyncQueue() {
  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    isOnline,
    setIsOnline,
  ] = useState(() =>
    typeof navigator !== "undefined"
      ? navigator.onLine
      : false
  );

  const [
    syncLogs,
    setSyncLogs,
  ] = useState<SyncLog[]>([]);

  const processingRef =
    useRef(false);

  const timeoutRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  // ============================================================
  // LOGS
  // ============================================================

  const addLog = useCallback(
    (
      message: string,
      type: SyncLogType = "info"
    ) => {
      const time =
        new Date().toLocaleTimeString();

      setSyncLogs((prev) => {
        const next = [
          {
            time,
            message,
            type,
          },
          ...prev,
        ];

        return next.slice(
          0,
          50
        );
      });
    },
    []
  );

  const clearLogs =
    useCallback(() => {
      setSyncLogs([]);
    }, []);

  // ============================================================
  // ONLINE / OFFLINE
  // ============================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

      if (
        timeoutRef.current
      ) {
        clearTimeout(
          timeoutRef.current
        );

        timeoutRef.current =
          null;
      }
    };
  }, []);

  // ============================================================
  // SUPABASE
  // ============================================================

  const requireSupabase = () => {
    if (!supabase) {
      throw new Error(
        "Cliente Supabase indisponível"
      );
    }

    return supabase;
  };

  // ============================================================
  // PERSONS
  // ============================================================

  const syncPerson = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const person =
      item.payload as unknown as Person;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("persons")
            .upsert(
              {
                id: person.id,
                user_id:
                  person.user_id,
                name:
                  person.name,
                email:
                  person.email ||
                  null,
                phone:
                  person.phone ||
                  null,
                avatar_url:
                  person.avatar_url ||
                  null,
                color:
                  person.color ||
                  "#60A5FA",

                is_default:
                  person.isDefault ||
                  false,

                created_at:
                  person.created_at,

                updated_at:
                  person.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Persons upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("persons")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Persons delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em persons: ${item.operation}`
        );
    }
  };

  // ============================================================
  // MÉDICOS
  // ============================================================

  const syncMedico = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const medico =
      item.payload as unknown as Medico;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("medicos")
            .upsert(
              {
                id: medico.id,
                user_id:
                  medico.user_id,
                nome:
                  medico.nome,

                especialidade:
                  medico.especialidade ||
                  null,

                crm:
                  medico.crm ||
                  null,

                telefone:
                  medico.telefone ||
                  null,

                email:
                  medico.email ||
                  null,

                observacoes:
                  medico.observacoes ||
                  null,

                created_at:
                  medico.created_at,

                updated_at:
                  medico.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Medicos upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("medicos")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Medicos delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em medicos: ${item.operation}`
        );
    }
  };

  // ============================================================
  // FARMÁCIAS
  // ============================================================

  const syncFarmacia = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const farmacia =
      item.payload as unknown as Farmacia;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("farmacias")
            .upsert(
              {
                id:
                  farmacia.id,

                user_id:
                  farmacia.user_id,

                nome:
                  farmacia.nome,

                endereco:
                  farmacia.endereco ||
                  null,

                telefone:
                  farmacia.telefone ||
                  null,

                observacoes:
                  farmacia.observacoes ||
                  null,

                created_at:
                  farmacia.created_at,

                updated_at:
                  farmacia.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Farmacias upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("farmacias")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Farmacias delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em farmacias: ${item.operation}`
        );
    }
  };

  // ============================================================
  // HOSPITAIS
  // ============================================================

  const syncHospital = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const hospital =
      item.payload as unknown as Hospital;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("hospitais")
            .upsert(
              {
                id:
                  hospital.id,

                user_id:
                  hospital.user_id,

                nome:
                  hospital.nome,

                endereco:
                  hospital.endereco ||
                  null,

                telefone:
                  hospital.telefone ||
                  null,

                tipo:
                  hospital.tipo ||
                  null,

                observacoes:
                  hospital.observacoes ||
                  null,

                created_at:
                  hospital.created_at,

                updated_at:
                  hospital.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Hospitais upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("hospitais")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Hospitais delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em hospitais: ${item.operation}`
        );
    }
  };

  // ============================================================
  // LOCAIS
  // ============================================================

  const syncLocal = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const local =
      item.payload as unknown as LocalSaude;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("locais")
            .upsert(
              {
                id:
                  local.id,

                user_id:
                  local.user_id,

                nome:
                  local.nome,

                endereco:
                  local.endereco ||
                  null,

                telefone:
                  local.telefone ||
                  null,

                tipo:
                  local.tipo ||
                  null,

                observacoes:
                  local.observacoes ||
                  null,

                created_at:
                  local.created_at,

                updated_at:
                  local.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Locais upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("locais")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Locais delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em locais: ${item.operation}`
        );
    }
  };

  // ============================================================
  // INSTITUIÇÕES
  // ============================================================

  const syncInstituicao = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const instituicao =
      item.payload as unknown as InstituicaoEnsino;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("instituicoes")
            .upsert(
              {
                id:
                  instituicao.id,

                user_id:
                  instituicao.user_id,

                nome:
                  instituicao.nome,

                cnpj:
                  instituicao.cnpj ||
                  null,

                created_at:
                  instituicao.created_at,

                updated_at:
                  instituicao.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Instituicoes upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("instituicoes")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Instituicoes delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em instituicoes: ${item.operation}`
        );
    }
  };

  // ============================================================
  // CIDS
  // ============================================================

  const syncCid = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const cid =
      item.payload as unknown as Cid;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("cids")
            .upsert(
              {
                id:
                  cid.id,

                user_id:
                  cid.user_id,

                person_id:
                  cid.person_id ||
                  null,

                codigo:
                  cid.codigo,

                descricao:
                  cid.descricao,

                data_diagnostico:
                  cid.data_diagnostico ||
                  null,

                medico_id:
                  cid.medico_id ||
                  null,

                hospital_id:
                  cid.hospital_id ||
                  null,

                local_id:
                  cid.local_id ||
                  null,

                observacoes:
                  cid.observacoes ||
                  null,

                anexo_url:
                  cid.anexo_url ||
                  null,

                created_at:
                  cid.created_at,

                updated_at:
                  cid.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Cids upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("cids")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Cids delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em cids: ${item.operation}`
        );
    }
  };

  // ============================================================
  // TRATAMENTOS
  // ============================================================

  const syncTratamento = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const tratamento =
      item.payload as unknown as Tratamento;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("tratamentos")
            .upsert(
              {
                id:
                  tratamento.id,

                user_id:
                  tratamento.user_id,

                person_id:
                  tratamento.person_id ||
                  null,

                nome:
                  tratamento.nome,

                status:
                  tratamento.status,

                cor:
                  tratamento.cor ||
                  "#8B5CF6",

                observacoes:
                  tratamento.observacoes ||
                  null,

                medico_ids:
                  tratamento.medico_ids ||
                  [],

                hospital_ids:
                  tratamento.hospital_ids ||
                  [],

                local_ids:
                  tratamento.local_ids ||
                  [],

                cid_ids:
                  tratamento.cid_ids ||
                  [],

                created_at:
                  tratamento.created_at,

                updated_at:
                  tratamento.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Tratamentos upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("tratamentos")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Tratamentos delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em tratamentos: ${item.operation}`
        );
    }

    if (
      item.operation !==
        "delete" &&
      tratamento.id
    ) {
      await syncTratamentoCids(
        tratamento.id,
        tratamento.cid_ids ||
          []
      );
    }
  };

  // ============================================================
  // MEDICAMENTOS
  // ============================================================

  const syncMedicamento = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const med =
      item.payload as unknown as Medicamento;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("medicamentos")
            .upsert(
              {
                id:
                  med.id,

                user_id:
                  med.user_id,

                person_id:
                  med.person_id ||
                  null,

                document_id:
                  med.document_id ||
                  null,

                medico_id:
                  med.medico_id ||
                  null,

                farmacia_id:
                  med.farmacia_id ||
                  null,

                hospital_id:
                  med.hospital_id ||
                  null,

                local_id:
                  med.local_id ||
                  null,

                nome:
                  med.nome,

                dosagem:
                  med.dosagem,

                medico:
                  med.medico ||
                  "",

                farmacia:
                  med.farmacia ||
                  null,

                data_receita:
                  med.data_receita ||
                  null,

                proxima_renovacao:
                  med.proxima_renovacao ||
                  null,

                observacoes:
                  med.observacoes ||
                  null,

                tipo_receita:
                  med.tipo_receita ||
                  "comum",

                tipo_uso:
                  med.tipo_uso ||
                  "continuo",

                forma_farmaceutica:
                  med.forma_farmaceutica ||
                  null,

                cor_principal:
                  med.cor_principal ||
                  null,

                cor_secundaria:
                  med.cor_secundaria ||
                  null,

                status:
                  med.status ||
                  "ativo",

                estoque_quantidade:
                  med.estoque_quantidade !==
                  undefined
                    ? med.estoque_quantidade
                    : 0,

                estoque_data_referencia:
                  med.estoque_data_referencia ||
                  null,

                estoque_horarios:
                  med.estoque_horarios ||
                  [],

                estoque_unidade_por_dose:
                  med.estoque_unidade_por_dose ||
                  null,

                estoque_unidade_medida:
                  med.estoque_unidade_medida ||
                  null,

                estoque_ml_total:
                  med.estoque_ml_total ||
                  null,

                estoque_gotas_por_ml:
                  med.estoque_gotas_por_ml ||
                  null,

                formato:
                  med.formato ||
                  null,

                cores:
                  med.cores ||
                  [],

                preco:
                  med.preco !==
                  undefined
                    ? med.preco
                    : null,

                tipo_aquisicao:
                  med.tipo_aquisicao ||
                  null,

                data_retorno_sus:
                  med.data_retorno_sus ||
                  null,

                motivo_descontinuacao:
                  med.motivo_descontinuacao ||
                  null,

                medico_descontinuacao_id:
                  med.medico_descontinuacao_id ||
                  null,

                medico_descontinuacao_nome:
                  med.medico_descontinuacao_nome ||
                  null,

                substituido_por_id:
                  med.substituido_por_id ||
                  null,

                data_descontinuacao:
                  med.data_descontinuacao ||
                  null,

                historico_dosagens:
                  med.historico_dosagens ||
                  [],

                cid_ids:
                  med.cid_ids ||
                  [],

                created_at:
                  med.created_at,

                updated_at:
                  med.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Medicamentos upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const {
          error:
            tratamentosError,
        } =
          await client
            .from(
              "medicamento_tratamentos"
            )
            .delete()
            .eq(
              "medicamento_id",
              payload.id
            );

        if (
          tratamentosError
        ) {
          throw new Error(
            `medicamento_tratamentos delete error: ${tratamentosError.message}`
          );
        }

        const {
          error:
            renovacoesError,
        } =
          await client
            .from(
              "renovacoes"
            )
            .delete()
            .eq(
              "medicamento_id",
              payload.id
            );

        if (
          renovacoesError
        ) {
          throw new Error(
            `Renovacoes cascade delete error: ${renovacoesError.message}`
          );
        }

        const {
          error:
            doseLogsError,
        } =
          await client
            .from(
              "dose_logs"
            )
            .delete()
            .eq(
              "medicamento_id",
              payload.id
            );

        if (
          doseLogsError
        ) {
          throw new Error(
            `Dose_logs cascade delete error: ${doseLogsError.message}`
          );
        }

        const { error } =
          await client
            .from(
              "medicamentos"
            )
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Medicamentos delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em medicamentos: ${item.operation}`
        );
    }

    if (
      item.operation !==
        "delete" &&
      med.id
    ) {
      await syncMedicamentoTratamentos(
        med.id,
        med.tratamento_ids ||
          []
      );
    }
  };

  // ============================================================
  // DOCUMENTOS
  //
  // ADD:
  // Pode usar UPSERT.
  //
  // UPDATE:
  // Usa UPDATE real porque um membro edit/admin pode editar
  // documento compartilhado cujo user_id continua sendo o
  // criador original.
  // ============================================================

  const syncDocument = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const doc =
      item.payload as unknown as Document;

    const documentPayload = {
      user_id:
        doc.user_id,

      person_id:
        doc.person_id,

      category_id:
        doc.category_id,

      type:
        doc.type,

      title:
        doc.title,

      description:
        doc.description ||
        null,

      metadata:
        doc.metadata ||
        {},

      attachments:
        doc.attachments ||
        [],

      is_favorite:
        doc.is_favorite,

      vault_id:
        doc.vault_id ||
        null,

      hospital_id:
        doc.hospital_id ||
        null,

      medico_id:
        doc.medico_id ||
        null,

      entidade_tipo:
        doc.entidade_tipo ||
        null,

      entidade_id:
        doc.entidade_id ||
        null,

      created_at:
        doc.created_at,

      updated_at:
        doc.updated_at,
    };

    switch (
      item.operation
    ) {
      case "add": {
        if (!doc.id) {
          throw new Error(
            "Documento sem id"
          );
        }

        const { error } =
          await client
            .from("documents")
            .upsert(
              {
                id:
                  doc.id,

                ...documentPayload,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Documents add error: ${error.message}`
          );
        }

        break;
      }

      case "update": {
        if (!doc.id) {
          throw new Error(
            "Documento sem id"
          );
        }

        const {
          data:
            updatedRows,
          error,
        } =
          await client
            .from("documents")
            .update(
              documentPayload
            )
            .eq(
              "id",
              doc.id
            )
            .select("id");

        if (error) {
          throw new Error(
            `Documents update error: ${error.message}`
          );
        }

        if (
          !updatedRows ||
          updatedRows.length ===
            0
        ) {
          throw new Error(
            `Documents update não alterou nenhuma linha: ${doc.id}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        if (!payload.id) {
          throw new Error(
            "Documento sem id para exclusão"
          );
        }

        const { error } =
          await client
            .from("documents")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Documents delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em documents: ${item.operation}`
        );
    }
  };

  // ============================================================
  // EXAMES
  // ============================================================

  const syncExame = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const exame =
      item.payload as unknown as Exame;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("exames")
            .upsert(
              {
                id:
                  exame.id,

                user_id:
                  exame.user_id,

                person_id:
                  exame.person_id ||
                  null,

                document_id:
                  exame.document_id ||
                  null,

                medico_id:
                  exame.medico_id ||
                  null,

                local_id:
                  exame.local_id ||
                  null,

                laboratorio:
                  exame.laboratorio ||
                  null,

                medico:
                  exame.medico ||
                  null,

                nome:
                  exame.nome,

                data:
                  exame.data,

                horario:
                  exame.horario ||
                  null,

                data_retorno:
                  exame.data_retorno ||
                  null,

                motivo:
                  exame.motivo ||
                  null,

                observacoes:
                  exame.observacoes ||
                  null,

                anexo_url:
                  exame.anexo_url ||
                  null,

                created_at:
                  exame.created_at,

                updated_at:
                  exame.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Exames upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("exames")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Exames delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em exames: ${item.operation}`
        );
    }

    if (
      item.operation !==
        "delete" &&
      exame.id
    ) {
      await syncExameTratamentos(
        exame.id,
        exame.tratamento_ids ||
          []
      );
    }
  };

  // ============================================================
  // CONSULTAS
  // ============================================================

  const syncConsulta = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const consulta =
      item.payload as unknown as Consulta;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("consultas")
            .upsert(
              {
                id:
                  consulta.id,

                user_id:
                  consulta.user_id,

                person_id:
                  consulta.person_id ||
                  null,

                medico_id:
                  consulta.medico_id ||
                  null,

                hospital_id:
                  consulta.hospital_id ||
                  null,

                local_id:
                  consulta.local_id ||
                  null,

                document_id:
                  consulta.document_id ||
                  null,

                especialidade:
                  consulta.especialidade,

                medico:
                  consulta.medico ||
                  "",

                data:
                  consulta.data,

                horario:
                  consulta.horario ||
                  null,

                status:
                  consulta.status,

                motivo:
                  consulta.motivo ||
                  null,

                observacoes:
                  consulta.observacoes ||
                  null,

                created_at:
                  consulta.created_at,

                updated_at:
                  consulta.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Consultas upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("consultas")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Consultas delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em consultas: ${item.operation}`
        );
    }
  };

  // ============================================================
  // CIRURGIAS
  // ============================================================

  const syncCirurgia = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const cirurgia =
      item.payload as unknown as Cirurgia;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("cirurgias")
            .upsert(
              {
                id:
                  cirurgia.id,

                user_id:
                  cirurgia.user_id,

                person_id:
                  cirurgia.person_id ||
                  null,

                procedimento:
                  cirurgia.procedimento,

                data:
                  cirurgia.data,

                horario:
                  cirurgia.horario ||
                  null,

                local_id:
                  cirurgia.local_id ||
                  null,

                medico_id:
                  cirurgia.medico_id ||
                  null,

                hospital_id:
                  cirurgia.hospital_id ||
                  null,

                document_id:
                  cirurgia.document_id ||
                  null,

                status:
                  cirurgia.status,

                observacoes:
                  cirurgia.observacoes ||
                  null,

                created_at:
                  cirurgia.created_at,

                updated_at:
                  cirurgia.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Cirurgias upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("cirurgias")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Cirurgias delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em cirurgias: ${item.operation}`
        );
    }
  };

  // ============================================================
  // RENOVAÇÕES
  // ============================================================

  const syncRenovacao = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const renovacao =
      item.payload as unknown as Renovacao;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("renovacoes")
            .upsert(
              {
                id:
                  renovacao.id,

                user_id:
                  renovacao.user_id,

                person_id:
                  renovacao.person_id ||
                  null,

                medicamento_id:
                  renovacao.medicamento_id,

                medico_id:
                  renovacao.medico_id ||
                  null,

                farmacia_id:
                  renovacao.farmacia_id ||
                  null,

                hospital_id:
                  renovacao.hospital_id ||
                  null,

                local_id:
                  renovacao.local_id ||
                  null,

                document_id:
                  renovacao.document_id ||
                  null,

                tipo_aquisicao:
                  renovacao.tipo_aquisicao ||
                  null,

                data_proxima_retirada:
                  renovacao.data_proxima_retirada ||
                  null,

                data_retorno_sus:
                  renovacao.data_retorno_sus ||
                  null,

                exige_nova_receita:
                  renovacao.exige_nova_receita ||
                  false,

                quantidade:
                  renovacao.quantidade ||
                  null,

                preco:
                  renovacao.preco ||
                  null,

                lote:
                  renovacao.lote ||
                  null,

                validade_produto:
                  renovacao.validade_produto ||
                  null,

                data:
                  renovacao.data,

                anexo_url:
                  renovacao.anexo_url ||
                  null,

                observacoes:
                  renovacao.observacoes ||
                  null,

                created_at:
                  renovacao.created_at,

                updated_at:
                  renovacao.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Renovacoes upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("renovacoes")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Renovacoes delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em renovacoes: ${item.operation}`
        );
    }
  };

  // ============================================================
  // DOSE LOGS
  // ============================================================

  const syncDoseLog = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const log =
      item.payload as unknown as DoseLog;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("dose_logs")
            .upsert(
              {
                id:
                  log.id,

                user_id:
                  log.user_id,

                person_id:
                  log.person_id ||
                  null,

                medicamento_id:
                  log.medicamento_id,

                data:
                  log.data,

                horario:
                  log.horario,

                tomado_em:
                  log.tomado_em ||
                  null,

                ignorado_em:
                  log.ignorado_em ||
                  null,

                quantidade:
                  log.quantidade ||
                  null,

                created_at:
                  log.created_at,

                updated_at:
                  log.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Dose_logs upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("dose_logs")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Dose_logs delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em doseLogs: ${item.operation}`
        );
    }
  };

  // ============================================================
  // ANEXOS CLÍNICOS
  // ============================================================

  const syncAnexoClinico = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const anexo =
      item.payload as unknown as AnexoClinico;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const titulo =
          anexo.titulo?.trim() ||
          anexo.nome?.trim();

        if (!titulo) {
          throw new Error(
            "Anexo clínico sem título/nome"
          );
        }

        if (
          !anexo.tipo
        ) {
          throw new Error(
            "Anexo clínico sem tipo"
          );
        }

        if (
          !anexo.url
        ) {
          throw new Error(
            "Anexo clínico sem URL"
          );
        }

        const { error } =
          await client
            .from(
              "anexos_clinicos"
            )
            .upsert(
              {
                id:
                  anexo.id,

                user_id:
                  anexo.user_id,

                person_id:
                  anexo.person_id ||
                  null,

                tratamento_id:
                  anexo.tratamento_id ||
                  null,

                medicamento_id:
                  anexo.medicamento_id ||
                  null,

                titulo,

                tipo:
                  anexo.tipo,

                url:
                  anexo.url,

                thumbnail:
                  anexo.thumbnail_url ||
                  null,

                tags:
                  anexo.tags ||
                  [],

                created_at:
                  anexo.created_at,

                updated_at:
                  anexo.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Anexos_clinicos upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from(
              "anexos_clinicos"
            )
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Anexos_clinicos delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em anexos_clinicos: ${item.operation}`
        );
    }
  };

  // ============================================================
  // REGISTROS DE SAÚDE
  // ============================================================

  const syncRegistroSaude = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const reg =
      item.payload as unknown as RegistroSaude;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from(
              "registros_saude"
            )
            .upsert(
              {
                id:
                  reg.id,

                user_id:
                  reg.user_id,

                person_id:
                  reg.person_id ||
                  null,

                categoria:
                  reg.categoria,

                tipo:
                  reg.tipo ||
                  null,

                nome:
                  reg.nome,

                intensidade:
                  reg.intensidade !==
                  undefined
                    ? reg.intensidade
                    : null,

                valor_medicao:
                  reg.valor_medicao ||
                  null,

                data:
                  reg.data,

                horario:
                  reg.horario ||
                  null,

                observacoes:
                  reg.observacoes ||
                  null,

                medicamento_id:
                  reg.medicamento_id ||
                  null,

                tratamento_ids:
                  reg.tratamento_ids ||
                  [],

                cid_ids:
                  reg.cid_ids ||
                  [],

                created_at:
                  reg.created_at,

                updated_at:
                  reg.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Registros_saude upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from(
              "registros_saude"
            )
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Registros_saude delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em registros_saude: ${item.operation}`
        );
    }
  };

  // ============================================================
  // VAULTS
  // ============================================================

  const syncVault = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const vault =
      item.payload as unknown as Vault;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        if (
          !vault.person_id
        ) {
          throw new Error(
            `Vault ${vault.id} sem person_id`
          );
        }

        const { error } =
          await client
            .from("vaults")
            .upsert(
              {
                id:
                  vault.id,

                user_id:
                  vault.user_id,

                person_id:
                  vault.person_id,

                name:
                  vault.name,

                description:
                  vault.description ||
                  null,

                icon:
                  vault.icon,

                color:
                  vault.color,

                created_at:
                  vault.created_at,

                updated_at:
                  vault.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Vaults upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("vaults")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Vaults delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em vaults: ${item.operation}`
        );
    }
  };

  // ============================================================
  // VAULT MEMBERS
  //
  // Pending:
  // user_id   = null
  // person_id = null
  //
  // Accepted:
  // user_id   = destinatário
  // person_id = Person escolhida pelo destinatário
  //
  // Declined:
  // person_id permanece null
  //
  // UPDATE permanece UPDATE propositalmente.
  // ============================================================

  const syncVaultMember = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const member =
      item.payload as unknown as VaultMember;

    const rawStatus =
      String(
        member.status
      );

    const normalizedStatus =
      rawStatus ===
      "rejected"
        ? "declined"
        : rawStatus;

    if (
      normalizedStatus !==
        "pending" &&
      normalizedStatus !==
        "accepted" &&
      normalizedStatus !==
        "declined"
    ) {
      throw new Error(
        `Status inválido em VaultMember ${member.id}: ${normalizedStatus}`
      );
    }

    if (
      normalizedStatus ===
      "accepted"
    ) {
      if (
        !member.user_id
      ) {
        throw new Error(
          `VaultMember ${member.id} aceito sem user_id`
        );
      }

      if (
        !member.person_id
      ) {
        throw new Error(
          `VaultMember ${member.id} aceito sem person_id`
        );
      }
    }

    switch (
      item.operation
    ) {
      case "add": {
        if (
          !member.id
        ) {
          throw new Error(
            "VaultMember sem id"
          );
        }

        const {
          data:
            insertedRows,
          error,
        } =
          await client
            .from(
              "vault_members"
            )
            .upsert(
              {
                id:
                  member.id,

                vault_id:
                  member.vault_id,

                user_id:
                  member.user_id ||
                  null,

                person_id:
                  member.person_id ||
                  null,

                email:
                  member.email,

                name:
                  member.name ||
                  null,

                permission:
                  member.permission,

                invited_by:
                  member.invited_by,

                status:
                  normalizedStatus,

                invited_at:
                  member.invited_at,

                updated_at:
                  member.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            )
            .select("id");

        if (error) {
          throw new Error(
            `Vault_members insert error: ${error.message}`
          );
        }

        if (
          !insertedRows ||
          insertedRows.length ===
            0
        ) {
          throw new Error(
            `Vault_members add não retornou registro: ${member.id}`
          );
        }

        break;
      }

      case "update": {
        if (
          !member.id
        ) {
          throw new Error(
            "VaultMember sem id"
          );
        }

        const {
          data:
            updatedRows,
          error,
        } =
          await client
            .from(
              "vault_members"
            )
            .update({
              user_id:
                member.user_id ||
                null,

              person_id:
                member.person_id ||
                null,

              email:
                member.email,

              name:
                member.name ||
                null,

              permission:
                member.permission,

              status:
                normalizedStatus,

              updated_at:
                member.updated_at,
            })
            .eq(
              "id",
              member.id
            )
            .select("id");

        if (error) {
          throw new Error(
            `Vault_members update error: ${error.message}`
          );
        }

        if (
          !updatedRows ||
          updatedRows.length ===
            0
        ) {
          throw new Error(
            `Vault_members update não alterou nenhuma linha: ${member.id}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        if (
          !payload.id
        ) {
          throw new Error(
            "VaultMember sem id para exclusão"
          );
        }

        const { error } =
          await client
            .from(
              "vault_members"
            )
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Vault_members delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em vaultMembers: ${item.operation}`
        );
    }
  };

  // ============================================================
  // CREDENTIALS
  // ============================================================

  const syncCredential = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const credential =
      item.payload as unknown as Credential;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        if (
          !credential.person_id
        ) {
          throw new Error(
            `Credential ${credential.id} sem person_id`
          );
        }

        const { error } =
          await client
            .from("credentials")
            .upsert(
              {
                id:
                  credential.id,

                user_id:
                  credential.user_id,

                person_id:
                  credential.person_id,

                vault_id:
                  credential.vault_id ||
                  null,

                title:
                  credential.title,

                username:
                  credential.username ||
                  null,

                password_encrypted:
                  credential.password_encrypted,

                url:
                  credential.url ||
                  null,

                notes:
                  credential.notes ||
                  null,

                category:
                  credential.category,

                history:
                  credential.password_history ||
                  [],

                created_at:
                  credential.created_at,

                updated_at:
                  credential.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Credentials upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from(
              "credentials"
            )
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Credentials delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em credentials: ${item.operation}`
        );
    }
  };

  // ============================================================
  // SETTINGS
  // ============================================================

  const syncSettings = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const settings =
      item.payload as unknown as AppSettings;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        const { error } =
          await client
            .from("settings")
            .upsert(
              {
                id:
                  settings.id,

                user_id:
                  settings.user_id,

                default_person_id:
                  settings.default_person_id ||
                  null,

                updated_at:
                  settings.updated_at ||
                  new Date().toISOString(),
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Settings sync error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("settings")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Settings delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em settings: ${item.operation}`
        );
    }
  };

  // ============================================================
  // CARTÕES
  // ============================================================

  const syncCard = async (
    item: SyncQueueItem
  ) => {
    const client =
      requireSupabase();

    const card =
      item.payload as unknown as BankCard;

    switch (
      item.operation
    ) {
      case "add":
      case "update": {
        if (
          !card.person_id
        ) {
          throw new Error(
            `Card ${card.id} sem person_id`
          );
        }

        const { error } =
          await client
            .from("cards")
            .upsert(
              {
                id:
                  card.id,

                user_id:
                  card.user_id,

                person_id:
                  card.person_id,

                title:
                  card.title,

                bank_name:
                  card.bank_name,

                type:
                  card.type,

                card_number_encrypted:
                  card.card_number_encrypted ||
                  null,

                card_holder:
                  card.card_holder ||
                  null,

                brand:
                  card.brand ||
                  null,

                expiry_date:
                  card.expiry_date ||
                  null,

                cvv_encrypted:
                  card.cvv_encrypted ||
                  null,

                agency:
                  card.agency ||
                  null,

                account:
                  card.account ||
                  null,

                notes:
                  card.notes ||
                  null,

                created_at:
                  card.created_at,

                updated_at:
                  card.updated_at,
              },
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw new Error(
            `Cards upsert error: ${error.message}`
          );
        }

        break;
      }

      case "delete": {
        const payload =
          item.payload as unknown as {
            id: string;
          };

        const { error } =
          await client
            .from("cards")
            .delete()
            .eq(
              "id",
              payload.id
            );

        if (error) {
          throw new Error(
            `Cards delete error: ${error.message}`
          );
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em cards: ${item.operation}`
        );
    }
  };

  // ============================================================
  // JUNÇÕES N:N
  // ============================================================

  const syncMedicamentoTratamentos =
    async (
      medicamentoId: string,
      tratamentoIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "medicamento_tratamentos"
          )
          .delete()
          .eq(
            "medicamento_id",
            medicamentoId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `medicamento_tratamentos delete error: ${deleteError.message}`
        );
      }

      if (
        tratamentoIds.length ===
        0
      ) {
        return;
      }

      const rows =
        tratamentoIds.map(
          (
            tratamentoId
          ) => ({
            medicamento_id:
              medicamentoId,

            tratamento_id:
              tratamentoId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "medicamento_tratamentos"
          )
          .insert(rows);

      if (
        insertError
      ) {
        throw new Error(
          `medicamento_tratamentos insert error: ${insertError.message}`
        );
      }
    };

  const syncTratamentoCids =
    async (
      tratamentoId: string,
      cidIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "tratamento_cids"
          )
          .delete()
          .eq(
            "tratamento_id",
            tratamentoId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `tratamento_cids delete error: ${deleteError.message}`
        );
      }

      if (
        cidIds.length ===
        0
      ) {
        return;
      }

      const rows =
        cidIds.map(
          (cidId) => ({
            tratamento_id:
              tratamentoId,

            cid_id:
              cidId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "tratamento_cids"
          )
          .insert(rows);

      if (
        insertError
      ) {
        throw new Error(
          `tratamento_cids insert error: ${insertError.message}`
        );
      }
    };

  const syncExameTratamentos =
    async (
      exameId: string,
      tratamentoIds: string[]
    ) => {
      const client =
        requireSupabase();

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "exame_tratamentos"
          )
          .delete()
          .eq(
            "exame_id",
            exameId
          );

      if (
        deleteError
      ) {
        throw new Error(
          `exame_tratamentos delete error: ${deleteError.message}`
        );
      }

      if (
        tratamentoIds.length ===
        0
      ) {
        return;
      }

      const rows =
        tratamentoIds.map(
          (
            tratamentoId
          ) => ({
            exame_id:
              exameId,

            tratamento_id:
              tratamentoId,
          })
        );

      const {
        error:
          insertError,
      } =
        await client
          .from(
            "exame_tratamentos"
          )
          .insert(rows);

      if (
        insertError
      ) {
        throw new Error(
          `exame_tratamentos insert error: ${insertError.message}`
        );
      }
    };

  // ============================================================
  // MARCAR LOCAL COMO SINCRONIZADO
  // ============================================================

  const markLocalAsSynced =
    async (
      item: SyncQueueItem
    ) => {
      if (
        item.operation ===
        "delete"
      ) {
        return;
      }

      const payload =
        item.payload as unknown as {
          id?: string;
        };

      if (!payload.id) {
        return;
      }

      switch (
        item.table
      ) {
        case "persons":
          await db.persons.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "medicos":
          await db.medicos.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "farmacias":
          await db.farmacias.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "hospitais":
          await db.hospitais.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "locais":
          await db.locais.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "instituicoes":
          await db.instituicoes.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "cids":
          await db.cids.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "documents":
          await db.documents.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "tratamentos":
          await db.tratamentos.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "medicamentos":
          await db.medicamentos.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "exames":
          await db.exames.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "consultas":
          await db.consultas.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "cirurgias":
          await db.cirurgias.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "renovacoes":
          await db.renovacoes.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "doseLogs":
          await db.doseLogs.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "anexos_clinicos":
          await db.anexos_clinicos.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "registros_saude":
          await db.registros_saude.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "vaults":
          await db.vaults.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "vaultMembers":
          await db.vaultMembers.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "credentials":
          await db.credentials.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "cards":
          await db.bankCards.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        case "settings":
          await db.settings.update(
            payload.id,
            {
              synced:
                true,
            }
          );
          break;

        default:
          break;
      }
    };

  // ============================================================
  // FINALIZAÇÃO SEGURA
  // ============================================================

  const finalizeQueueItem =
    async (
      item: SyncQueueItem
    ): Promise<boolean> => {
      if (!item.id) {
        return false;
      }

      const atual =
        await db.syncQueue.get(
          item.id
        );

      if (!atual) {
        return false;
      }

      if (
        atual.updated_at !==
        item.updated_at
      ) {
        return false;
      }

      if (
        atual.operation !==
        item.operation
      ) {
        return false;
      }

      await db.syncQueue.delete(
        item.id
      );

      const novaOperacao =
        await db.syncQueue
          .where("chave")
          .equals(
            item.chave
          )
          .first();

      if (
        novaOperacao
      ) {
        return false;
      }

      await markLocalAsSynced(
        item
      );

      return true;
    };

  // ============================================================
  // PROCESSAMENTO DE UM ITEM
  // ============================================================

  const syncItem = async (
    item: SyncQueueItem
  ) => {
    switch (
      item.table
    ) {
      case "persons":
        await syncPerson(
          item
        );
        return;

      case "settings":
        await syncSettings(
          item
        );
        return;

      case "medicos":
        await syncMedico(
          item
        );
        return;

      case "farmacias":
        await syncFarmacia(
          item
        );
        return;

      case "hospitais":
        await syncHospital(
          item
        );
        return;

      case "locais":
        await syncLocal(
          item
        );
        return;

      case "instituicoes":
        await syncInstituicao(
          item
        );
        return;

      case "cids":
        await syncCid(
          item
        );
        return;

      case "vaults":
        await syncVault(
          item
        );
        return;

      case "vaultMembers":
        await syncVaultMember(
          item
        );
        return;

      case "documents":
        await syncDocument(
          item
        );
        return;

      case "tratamentos":
        await syncTratamento(
          item
        );
        return;

      case "medicamentos":
        await syncMedicamento(
          item
        );
        return;

      case "exames":
        await syncExame(
          item
        );
        return;

      case "consultas":
        await syncConsulta(
          item
        );
        return;

      case "cirurgias":
        await syncCirurgia(
          item
        );
        return;

      case "renovacoes":
        await syncRenovacao(
          item
        );
        return;

      case "doseLogs":
        await syncDoseLog(
          item
        );
        return;

      case "anexos_clinicos":
        await syncAnexoClinico(
          item
        );
        return;

      case "registros_saude":
        await syncRegistroSaude(
          item
        );
        return;

      case "credentials":
        await syncCredential(
          item
        );
        return;

      case "cards":
        await syncCard(
          item
        );
        return;

      default:
        throw new Error(
          `Tabela não suportada no sync: ${item.table}`
        );
    }
  };

  // ============================================================
  // PROCESSAMENTO DA FILA
  // ============================================================

  const processQueue =
    useCallback(
      async () => {
        if (
          processingRef.current ||
          !isOnline
        ) {
          return;
        }

        processingRef.current =
          true;

        setIsProcessing(
          true
        );

        try {
          // ----------------------------------------------------
          // VALIDA SESSÃO ANTES DO SYNC
          // ----------------------------------------------------

          const client =
            requireSupabase();

          const {
            data: {
              user:
                authenticatedUser,
            },
            error:
              authError,
          } =
            await client.auth.getUser();

          if (
            authError
          ) {
            throw new Error(
              `Falha ao validar sessão antes do sync: ${authError.message}`
            );
          }

          if (
            !authenticatedUser
          ) {
            addLog(
              "🔒 Sync aguardando autenticação.",
              "info"
            );

            return;
          }

          const queue =
            await db.syncQueue
              .toCollection()
              .filter(
                (
                  item
                ) =>
                  item.failed !==
                    true &&
                  (
                    item.retry_count ||
                    0
                  ) <
                    MAX_RETRIES
              )
              .toArray();

          if (
            queue.length ===
            0
          ) {
            return;
          }

          addLog(
            `🟢 Iniciando sync: ${queue.length} itens na fila`,
            "info"
          );

          const priorityOrder: SyncQueueItem["table"][] =
            [
              "persons",
              "settings",

              "medicos",
              "farmacias",
              "hospitais",
              "locais",
              "instituicoes",

              "cids",

              "vaults",
              "vaultMembers",

              "documents",

              "tratamentos",
              "medicamentos",

              "exames",
              "consultas",
              "cirurgias",

              "renovacoes",
              "doseLogs",

              "anexos_clinicos",
              "registros_saude",

              "credentials",
              "cards",
            ];

          queue.sort(
            (a, b) => {
              const aIndex =
                priorityOrder.indexOf(
                  a.table
                );

              const bIndex =
                priorityOrder.indexOf(
                  b.table
                );

              return (
                (
                  aIndex ===
                  -1
                    ? 999
                    : aIndex
                ) -
                (
                  bIndex ===
                  -1
                    ? 999
                    : bIndex
                )
              );
            }
          );

          let successCount =
            0;

          let highestRetry =
            0;

          for (
            const item of queue
          ) {
            const retryCount =
              item.retry_count ||
              0;

            highestRetry =
              Math.max(
                highestRetry,
                retryCount
              );

            if (
              !navigator.onLine
            ) {
              addLog(
                "📴 Conexão perdida durante a sincronização. Fila preservada.",
                "info"
              );

              break;
            }

            try {
              await syncItem(
                item
              );

              const finalized =
                await finalizeQueueItem(
                  item
                );

              if (
                finalized
              ) {
                successCount++;

                addLog(
                  `✅ ${item.table} sincronizado`,
                  "success"
                );
              } else {
                addLog(
                  `🔄 ${item.table} alterado novamente durante o sync; nova versão preservada na fila`,
                  "info"
                );
              }
            } catch (
              error: unknown
            ) {
              const atual =
                item.id
                  ? await db.syncQueue.get(
                      item.id
                    )
                  : undefined;

              if (
                atual &&
                atual.updated_at !==
                  item.updated_at
              ) {
                addLog(
                  `🔄 ${item.table} mudou durante uma tentativa com erro; retry da versão antiga ignorado`,
                  "info"
                );

                continue;
              }

              const nextRetryCount =
                retryCount +
                1;

              const failed =
                nextRetryCount >=
                MAX_RETRIES;

              const errorMessage =
                error instanceof
                Error
                  ? error.message
                  : String(
                      error
                    );

              if (
                item.id
              ) {
                await db.syncQueue.update(
                  item.id,
                  {
                    retry_count:
                      nextRetryCount,

                    failed,

                    error:
                      errorMessage,
                  }
                );
              }

              if (
                failed
              ) {
                addLog(
                  `✖️ Falha permanente em ${item.table}: ${errorMessage}`,
                  "error"
                );
              } else {
                addLog(
                  `⚠️ Erro em ${item.table} (tentativa ${nextRetryCount}/${MAX_RETRIES}): ${errorMessage}`,
                  "error"
                );
              }
            }
          }

          if (
            successCount >
            0
          ) {
            addLog(
              `✅ ${successCount} itens sincronizados com sucesso!`,
              "success"
            );
          }

          const remaining =
            await db.syncQueue
              .toCollection()
              .filter(
                (
                  item
                ) =>
                  item.failed !==
                    true &&
                  (
                    item.retry_count ||
                    0
                  ) <
                    MAX_RETRIES
              )
              .count();

          if (
            remaining >
              0 &&
            navigator.onLine
          ) {
            if (
              timeoutRef.current
            ) {
              clearTimeout(
                timeoutRef.current
              );
            }

            const delay =
              Math.min(
                5000 *
                  Math.pow(
                    2,
                    highestRetry
                  ),
                MAX_BACKOFF_MS
              );

            timeoutRef.current =
              setTimeout(
                () => {
                  timeoutRef.current =
                    null;

                  if (
                    !processingRef.current
                  ) {
                    void processQueue();
                  }
                },
                delay
              );
          }
        } catch (
          error: unknown
        ) {
          const errorMessage =
            error instanceof
            Error
              ? error.message
              : String(
                  error
                );

          addLog(
            `❌ Erro ao processar fila: ${errorMessage}`,
            "error"
          );
        } finally {
          processingRef.current =
            false;

          setIsProcessing(
            false
          );
        }
      },
      [
        isOnline,
        addLog,
      ]
    );

  // ============================================================
  // RESET DE FALHAS
  // ============================================================

  const resetFailedItems =
    useCallback(
      async () => {
        const failedItems =
          await db.syncQueue
            .toCollection()
            .filter(
              (
                item
              ) =>
                item.failed ===
                true
            )
            .toArray();

        if (
          failedItems.length ===
          0
        ) {
          return;
        }

        for (
          const item of failedItems
        ) {
          if (
            !item.id
          ) {
            continue;
          }

          await db.syncQueue.update(
            item.id,
            {
              failed:
                false,

              retry_count:
                0,

              error:
                undefined,
            }
          );
        }

        addLog(
          `✅ ${failedItems.length} itens redefinidos para reenvio`,
          "success"
        );

        await processQueue();
      },
      [
        processQueue,
        addLog,
      ]
    );

  // ============================================================
  // EVENTO GLOBAL
  // ============================================================

  useEffect(() => {
    const handleProcess =
      () => {
        if (
          isOnline &&
          !processingRef.current
        ) {
          void processQueue();
        }
      };

    window.addEventListener(
      "sync:process",
      handleProcess
    );

    return () => {
      window.removeEventListener(
        "sync:process",
        handleProcess
      );
    };
  }, [
    isOnline,
    processQueue,
  ]);

  // ============================================================
  // PROCESSA AO VOLTAR ONLINE / MONTAR
  // ============================================================

  useEffect(() => {
    if (
      isOnline
    ) {
      void processQueue();
    }
  }, [
    isOnline,
    processQueue,
  ]);

  // ============================================================
  // API
  // ============================================================

  return {
    processQueue,
    isProcessing,
    isOnline,
    resetFailedItems,
    syncLogs,
    clearLogs,
  };
}