"use client";

import { db } from "@/lib/db";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Document,
  Vault,
  VaultMember,
  Medico,
  Hospital,
  DoseLog,
  Credential,
  BankCard,
  LocalSaude,
  Tratamento,
  Consulta,
  Cirurgia,
  Laboratorio,
  Exame,
  InstituicaoEnsino,
} from "@/lib/types";

const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 60000;

export function useSyncQueue() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : false
  );

  const [syncLogs, setSyncLogs] = useState<
    {
      time: string;
      message: string;
      type: "info" | "success" | "error";
    }[]
  >([]);

  const processingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback(
    (
      message: string,
      type: "info" | "success" | "error" = "info"
    ) => {
      const time = new Date().toLocaleTimeString();

      setSyncLogs((prev) => {
        const newLogs = [{ time, message, type }, ...prev];
        return newLogs.slice(0, 50);
      });
    },
    []
  );

  const clearLogs = useCallback(() => {
    setSyncLogs([]);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Garante que o cliente Supabase está disponível.
   *
   * É importante não simplesmente retornar quando o Supabase
   * não estiver disponível, pois o processQueue poderia interpretar
   * a função como concluída e remover o item da fila.
   */
  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Cliente Supabase indisponível");
    }

    return supabase;
  };

  // ============================================================
  // PERSONS
  // ============================================================

  const syncPerson = async (item: any) => {
    const client = requireSupabase();
    const person = item.payload as any;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("persons").upsert(
          {
            id: person.id,
            user_id: person.user_id,
            name: person.name,
            email: person.email || null,
            phone: person.phone || null,
            avatar_url: person.avatar_url || null,
            created_at: person.created_at,
            updated_at: person.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Persons insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("persons")
          .update({
            name: person.name,
            email: person.email || null,
            phone: person.phone || null,
            avatar_url: person.avatar_url || null,
            updated_at: person.updated_at,
          })
          .eq("id", person.id);

        if (error) {
          throw new Error(`Persons update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("persons")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Persons delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(`Operação não suportada em persons: ${item.operation}`);
    }

    if (item.operation !== "delete" && person.id) {
      await db.persons.update(person.id, { synced: true });
    }
  };

  // ============================================================
  // MÉDICOS
  // ============================================================

  const syncMedico = async (item: any) => {
    const client = requireSupabase();
    const medico = item.payload as Medico;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("medicos").upsert(
          {
            id: medico.id,
            user_id: medico.user_id,
            nome: medico.nome,
            especialidade: medico.especialidade || null,
            crm: medico.crm || null,
            telefone: medico.telefone || null,
            email: medico.email || null,
            created_at: medico.created_at,
            updated_at: medico.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Medicos insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("medicos")
          .update({
            nome: medico.nome,
            especialidade: medico.especialidade || null,
            crm: medico.crm || null,
            telefone: medico.telefone || null,
            email: medico.email || null,
            updated_at: medico.updated_at,
          })
          .eq("id", medico.id);

        if (error) {
          throw new Error(`Medicos update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("medicos")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Medicos delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(`Operação não suportada em medicos: ${item.operation}`);
    }

    if (item.operation !== "delete" && medico.id) {
      await db.medicos.update(medico.id, { synced: true });
    }
  };

  // ============================================================
  // HOSPITAIS
  // ============================================================

  const syncHospital = async (item: any) => {
    const client = requireSupabase();
    const hospital = item.payload as Hospital;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("hospitais").upsert(
          {
            id: hospital.id,
            user_id: hospital.user_id,
            nome: hospital.nome,
            endereco: hospital.endereco || null,
            telefone: hospital.telefone || null,
            created_at: hospital.created_at,
            updated_at: hospital.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Hospitais insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("hospitais")
          .update({
            nome: hospital.nome,
            endereco: hospital.endereco || null,
            telefone: hospital.telefone || null,
            updated_at: hospital.updated_at,
          })
          .eq("id", hospital.id);

        if (error) {
          throw new Error(`Hospitais update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("hospitais")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Hospitais delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em hospitais: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && hospital.id) {
      await db.hospitais.update(hospital.id, { synced: true });
    }
  };

  // ============================================================
  // LOCAIS
  // ============================================================

  const syncLocal = async (item: any) => {
    const client = requireSupabase();
    const local = item.payload as LocalSaude;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("locais").upsert(
          {
            id: local.id,
            user_id: local.user_id,
            nome: local.nome,
            endereco: local.endereco || null,
            telefone: local.telefone || null,
            tipo: local.tipo || null,
            created_at: local.created_at,
            updated_at: local.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Locais insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("locais")
          .update({
            nome: local.nome,
            endereco: local.endereco || null,
            telefone: local.telefone || null,
            tipo: local.tipo || null,
            updated_at: local.updated_at,
          })
          .eq("id", local.id);

        if (error) {
          throw new Error(`Locais update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("locais")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Locais delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(`Operação não suportada em locais: ${item.operation}`);
    }

    if (item.operation !== "delete" && local.id) {
      await db.locais.update(local.id, { synced: true });
    }
  };

  // ============================================================
  // LABORATÓRIOS
  // ============================================================

  const syncLaboratorio = async (item: any) => {
    const client = requireSupabase();
    const lab = item.payload as Laboratorio;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("laboratorios").upsert(
          {
            id: lab.id,
            user_id: lab.user_id,
            nome: lab.nome,
            endereco: lab.endereco || null,
            telefone: lab.telefone || null,
            created_at: lab.created_at,
            updated_at: lab.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Laboratorios insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("laboratorios")
          .update({
            nome: lab.nome,
            endereco: lab.endereco || null,
            telefone: lab.telefone || null,
            updated_at: lab.updated_at,
          })
          .eq("id", lab.id);

        if (error) {
          throw new Error(`Laboratorios update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("laboratorios")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Laboratorios delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em laboratorios: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && lab.id) {
      await db.laboratorios.update(lab.id, { synced: true });
    }
  };

  // ============================================================
  // INSTITUIÇÕES
  // ============================================================

  const syncInstituicao = async (item: any) => {
    const client = requireSupabase();
    const inst = item.payload as InstituicaoEnsino;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("instituicoes").upsert(
          {
            id: inst.id,
            user_id: inst.user_id,
            nome: inst.nome,
            cnpj: inst.cnpj || null,
            created_at: inst.created_at,
            updated_at: inst.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Instituicoes insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("instituicoes")
          .update({
            nome: inst.nome,
            cnpj: inst.cnpj || null,
            updated_at: inst.updated_at,
          })
          .eq("id", inst.id);

        if (error) {
          throw new Error(`Instituicoes update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("instituicoes")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Instituicoes delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em instituicoes: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && inst.id) {
      await db.instituicoes.update(inst.id, { synced: true });
    }
  };

  // ============================================================
  // TRATAMENTOS
  // ============================================================

  const syncTratamento = async (item: any) => {
    const client = requireSupabase();
    const trat = item.payload as Tratamento;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("tratamentos").upsert(
          {
            id: trat.id,
            user_id: trat.user_id,
            person_id: trat.person_id || null,
            nome: trat.nome,
            cid_id: trat.cid_id || null,
            condicao: trat.condicao || null,
            status: trat.status,
            created_at: trat.created_at,
            updated_at: trat.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Tratamentos insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("tratamentos")
          .update({
            nome: trat.nome,
            cid_id: trat.cid_id || null,
            condicao: trat.condicao || null,
            status: trat.status,
            updated_at: trat.updated_at,
          })
          .eq("id", trat.id);

        if (error) {
          throw new Error(`Tratamentos update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("tratamentos")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Tratamentos delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em tratamentos: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && trat.id) {
      await db.tratamentos.update(trat.id, { synced: true });
    }
  };

  // ============================================================
  // CONSULTAS
  // ============================================================

  const syncConsulta = async (item: any) => {
    const client = requireSupabase();
    const con = item.payload as Consulta;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("consultas").upsert(
          {
            id: con.id,
            user_id: con.user_id,
            person_id: con.person_id || null,
            medico_id: con.medico_id || null,
            hospital_id: con.hospital_id || null,
            data: con.data,
            status: con.status,
            motivo: con.motivo || null,
            observacoes: con.observacoes || null,
            created_at: con.created_at,
            updated_at: con.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Consultas insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("consultas")
          .update({
            medico_id: con.medico_id || null,
            hospital_id: con.hospital_id || null,
            data: con.data,
            status: con.status,
            motivo: con.motivo || null,
            observacoes: con.observacoes || null,
            updated_at: con.updated_at,
          })
          .eq("id", con.id);

        if (error) {
          throw new Error(`Consultas update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("consultas")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Consultas delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em consultas: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && con.id) {
      await db.consultas.update(con.id, { synced: true });
    }
  };

  // ============================================================
  // CIRURGIAS
  // ============================================================

  const syncCirurgia = async (item: any) => {
    const client = requireSupabase();
    const cir = item.payload as Cirurgia;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("cirurgias").upsert(
          {
            id: cir.id,
            user_id: cir.user_id,
            person_id: cir.person_id || null,
            medico_id: cir.medico_id || null,
            hospital_id: cir.hospital_id || null,
            data: cir.data,
            status: cir.status,
            procedimento: cir.procedimento,
            observacoes: cir.observacoes || null,
            created_at: cir.created_at,
            updated_at: cir.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Cirurgias insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("cirurgias")
          .update({
            medico_id: cir.medico_id || null,
            hospital_id: cir.hospital_id || null,
            data: cir.data,
            status: cir.status,
            procedimento: cir.procedimento,
            observacoes: cir.observacoes || null,
            updated_at: cir.updated_at,
          })
          .eq("id", cir.id);

        if (error) {
          throw new Error(`Cirurgias update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("cirurgias")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Cirurgias delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em cirurgias: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && cir.id) {
      await db.cirurgias.update(cir.id, { synced: true });
    }
  };

  // ============================================================
  // EXAMES
  // ============================================================

  const syncExame = async (item: any) => {
    const client = requireSupabase();
    const exame = item.payload as Exame;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("exames").upsert(
          {
            id: exame.id,
            user_id: exame.user_id,
            person_id: exame.person_id || null,
            nome: exame.nome,
            laboratorio_id: exame.laboratorio_id || null,
            medico_id: exame.medico_id || null,
            data: exame.data,
            data_retorno: exame.data_retorno || null,
            motivo: exame.motivo || null,
            observacoes: exame.observacoes || null,
            anexo_url: exame.anexo_url || null,
            created_at: exame.created_at,
            updated_at: exame.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Exames insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("exames")
          .update({
            nome: exame.nome,
            laboratorio_id: exame.laboratorio_id || null,
            medico_id: exame.medico_id || null,
            data: exame.data,
            data_retorno: exame.data_retorno || null,
            motivo: exame.motivo || null,
            observacoes: exame.observacoes || null,
            anexo_url: exame.anexo_url || null,
            updated_at: exame.updated_at,
          })
          .eq("id", exame.id);

        if (error) {
          throw new Error(`Exames update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("exames")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Exames delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em exames: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && exame.id) {
      await db.exames.update(exame.id, { synced: true });
    }
  };

  // ============================================================
  // ANEXOS CLÍNICOS
  // ============================================================

  const syncAnexoClinico = async (item: any) => {
    const client = requireSupabase();
    const anexo = item.payload as any;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("anexos_clinicos").upsert(
          {
            id: anexo.id,
            user_id: anexo.user_id,
            person_id: anexo.person_id || null,
            tratamento_id: anexo.tratamento_id || null,
            medicamento_id: anexo.medicamento_id || null,
            tipo: anexo.tipo,
            url: anexo.url,
            thumbnail_url: anexo.thumbnail_url || null,
            tags: anexo.tags || [],
            created_at: anexo.created_at,
            updated_at: anexo.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Anexos clinicos insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("anexos_clinicos")
          .update({
            person_id: anexo.person_id || null,
            tratamento_id: anexo.tratamento_id || null,
            medicamento_id: anexo.medicamento_id || null,
            tipo: anexo.tipo,
            url: anexo.url,
            thumbnail_url: anexo.thumbnail_url || null,
            tags: anexo.tags || [],
            updated_at: anexo.updated_at,
          })
          .eq("id", anexo.id);

        if (error) {
          throw new Error(`Anexos clinicos update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("anexos_clinicos")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Anexos clinicos delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em anexos_clinicos: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && anexo.id) {
      await db.anexos_clinicos.update(anexo.id, { synced: true });
    }
  };

  // ============================================================
  // MEDICAMENTOS
  // ============================================================

  const syncMedicamento = async (item: any) => {
    const client = requireSupabase();
    const med = item.payload as any;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("medicamentos").upsert(
          {
            id: med.id,
            document_id: med.document_id || null,
            user_id: med.user_id,
            nome: med.nome,
            dosagem: med.dosagem,
            medico: med.medico,
            farmacia: med.farmacia || null,
            data_receita: med.data_receita,
            proxima_renovacao: med.proxima_renovacao,
            observacoes: med.observacoes || null,
            tipo_receita: med.tipo_receita || "comum",
            created_at: med.created_at,
            updated_at: med.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Medicamentos insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("medicamentos")
          .update({
            document_id: med.document_id || null,
            nome: med.nome,
            dosagem: med.dosagem,
            medico: med.medico,
            farmacia: med.farmacia || null,
            data_receita: med.data_receita,
            proxima_renovacao: med.proxima_renovacao,
            observacoes: med.observacoes || null,
            tipo_receita: med.tipo_receita || "comum",
            updated_at: med.updated_at,
          })
          .eq("id", med.id);

        if (error) {
          throw new Error(`Medicamentos update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("medicamentos")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Medicamentos delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em medicamentos: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && med.id) {
      await db.medicamentos.update(med.id, { synced: true });
    }
  };

  // ============================================================
  // RENOVAÇÕES
  // ============================================================

  const syncRenovacao = async (item: any) => {
    const client = requireSupabase();
    const ren = item.payload as any;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("renovacoes").upsert(
          {
            id: ren.id,
            medicamento_id: ren.medicamento_id,
            user_id: ren.user_id,
            data: ren.data,
            anexo_url: ren.anexo_url || null,
            observacoes: ren.observacoes || null,
            created_at: ren.created_at,
            updated_at: ren.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Renovacoes insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("renovacoes")
          .update({
            medicamento_id: ren.medicamento_id,
            data: ren.data,
            anexo_url: ren.anexo_url || null,
            observacoes: ren.observacoes || null,
            updated_at: ren.updated_at,
          })
          .eq("id", ren.id);

        if (error) {
          throw new Error(`Renovacoes update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("renovacoes")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Renovacoes delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em renovacoes: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && ren.id) {
      await db.renovacoes.update(ren.id, { synced: true });
    }
  };

  // ============================================================
  // DOSE LOGS
  //
  // CORREÇÃO PRINCIPAL:
  // ignorado_em é enviado tanto no INSERT quanto no UPDATE.
  // ============================================================

  const syncDoseLog = async (item: any) => {
    const client = requireSupabase();
    const log = item.payload as DoseLog;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("dose_logs").upsert(
          {
            id: log.id,
            user_id: log.user_id,
            medicamento_id: log.medicamento_id,
            data: log.data,
            horario: log.horario,
            tomado_em: log.tomado_em || null,
            ignorado_em: log.ignorado_em || null,
            created_at: log.created_at,
            updated_at: log.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Dose_logs insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("dose_logs")
          .update({
            tomado_em: log.tomado_em || null,
            ignorado_em: log.ignorado_em || null,
            updated_at: log.updated_at,
          })
          .eq("id", log.id);

        if (error) {
          throw new Error(`Dose_logs update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("dose_logs")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Dose_logs delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em doseLogs: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && log.id) {
      await db.doseLogs.update(log.id, { synced: true });
    }
  };

  // ============================================================
  // DOCUMENTOS
  // ============================================================

  const syncDocument = async (item: any) => {
    const client = requireSupabase();
    const doc = item.payload as Document;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("documents").upsert(
          {
            id: doc.id,
            user_id: doc.user_id,
            person_id: doc.person_id,
            category_id: doc.category_id,
            type: doc.type,
            title: doc.title,
            description: doc.description,
            metadata: doc.metadata,
            attachments: doc.attachments,
            is_favorite: doc.is_favorite,
            vault_id: doc.vault_id || null,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Documents insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("documents")
          .update({
            person_id: doc.person_id,
            category_id: doc.category_id,
            type: doc.type,
            title: doc.title,
            description: doc.description,
            metadata: doc.metadata,
            attachments: doc.attachments,
            is_favorite: doc.is_favorite,
            vault_id: doc.vault_id || null,
            updated_at: doc.updated_at,
          })
          .eq("id", doc.id);

        if (error) {
          throw new Error(`Documents update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("documents")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Documents delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em documents: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && doc.id) {
      await db.documents.update(doc.id, { synced: true });
    }
  };

  // ============================================================
  // VAULTS
  // ============================================================

  const syncVault = async (item: any) => {
    const client = requireSupabase();
    const vault = item.payload as Vault;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("vaults").upsert(
          {
            id: vault.id,
            user_id: vault.user_id,
            name: vault.name,
            description: vault.description || null,
            icon: vault.icon,
            color: vault.color,
            created_at: vault.created_at,
            updated_at: vault.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Vaults insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("vaults")
          .update({
            name: vault.name,
            description: vault.description || null,
            icon: vault.icon,
            color: vault.color,
            updated_at: vault.updated_at,
          })
          .eq("id", vault.id);

        if (error) {
          throw new Error(`Vaults update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("vaults")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Vaults delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(`Operação não suportada em vaults: ${item.operation}`);
    }

    if (item.operation !== "delete" && vault.id) {
      await db.vaults.update(vault.id, { synced: true });
    }
  };

  // ============================================================
  // VAULT MEMBERS
  // ============================================================

  const syncVaultMember = async (item: any) => {
    const client = requireSupabase();
    const member = item.payload as VaultMember;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("vault_members").upsert(
          {
            id: member.id,
            vault_id: member.vault_id,
            user_id: member.user_id,
            email: member.email,
            name: member.name || null,
            permission: member.permission,
            invited_by: member.invited_by,
            status: member.status,
            invited_at: member.invited_at,
            updated_at: member.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Vault_members insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("vault_members")
          .update({
            email: member.email,
            name: member.name || null,
            permission: member.permission,
            status: member.status,
            updated_at: member.updated_at,
          })
          .eq("id", member.id);

        if (error) {
          throw new Error(`Vault_members update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("vault_members")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Vault_members delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em vaultMembers: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && member.id) {
      await db.vaultMembers.update(member.id, { synced: true });
    }
  };

  // ============================================================
  // CREDENTIALS
  // ============================================================

  const syncCredential = async (item: any) => {
    const client = requireSupabase();
    const cred = item.payload as Credential;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("credentials").upsert(
          {
            id: cred.id,
            user_id: cred.user_id,
            vault_id: cred.vault_id || null,
            title: cred.title,
            username: cred.username || null,
            password_encrypted: cred.password_encrypted,
            url: cred.url || null,
            notes: cred.notes || null,
            category: cred.category,
            password_history: cred.password_history || null,
            created_at: cred.created_at,
            updated_at: cred.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Credentials insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("credentials")
          .update({
            vault_id: cred.vault_id || null,
            title: cred.title,
            username: cred.username || null,
            password_encrypted: cred.password_encrypted,
            url: cred.url || null,
            notes: cred.notes || null,
            category: cred.category,
            password_history: cred.password_history || null,
            updated_at: cred.updated_at,
          })
          .eq("id", cred.id);

        if (error) {
          throw new Error(`Credentials update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("credentials")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Credentials delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em credentials: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && cred.id) {
      await db.credentials.update(cred.id, { synced: true });
    }
  };

  // ============================================================
  // CARTÕES
  // ============================================================

  const syncCard = async (item: any) => {
    const client = requireSupabase();
    const card = item.payload as BankCard;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("cards").upsert(
          {
            id: card.id,
            user_id: card.user_id,
            title: card.title,
            bank_name: card.bank_name,
            type: card.type,
            card_number_encrypted: card.card_number_encrypted || null,
            card_holder: card.card_holder || null,
            brand: card.brand || null,
            expiry_date: card.expiry_date || null,
            cvv_encrypted: card.cvv_encrypted || null,
            agency: card.agency || null,
            account: card.account || null,
            notes: card.notes || null,
            created_at: card.created_at,
            updated_at: card.updated_at,
          },
          { onConflict: "id" }
        );

        if (error) {
          throw new Error(`Cards insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("cards")
          .update({
            title: card.title,
            bank_name: card.bank_name,
            type: card.type,
            card_number_encrypted: card.card_number_encrypted || null,
            card_holder: card.card_holder || null,
            brand: card.brand || null,
            expiry_date: card.expiry_date || null,
            cvv_encrypted: card.cvv_encrypted || null,
            agency: card.agency || null,
            account: card.account || null,
            notes: card.notes || null,
            updated_at: card.updated_at,
          })
          .eq("id", card.id);

        if (error) {
          throw new Error(`Cards update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("cards")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Cards delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(`Operação não suportada em cards: ${item.operation}`);
    }

    if (item.operation !== "delete" && card.id) {
      await db.cards.update(card.id, { synced: true });
    }
  };

  // ============================================================
  // MEDICAMENTO ↔ TRATAMENTO
  // ============================================================

  const syncMedicamentoTratamento = async (item: any) => {
    const client = requireSupabase();
    const link = item.payload as any;

    switch (item.operation) {
      case "add": {
        const { error } = await client
          .from("medicamento_tratamentos")
          .upsert(
            {
              id: link.id,
              medicamento_id: link.medicamento_id,
              tratamento_id: link.tratamento_id,
            },
            { onConflict: "id" }
          );

        if (error) {
          throw new Error(`Link insert error: ${error.message}`);
        }

        break;
      }

      case "update": {
        const { error } = await client
          .from("medicamento_tratamentos")
          .update({
            medicamento_id: link.medicamento_id,
            tratamento_id: link.tratamento_id,
          })
          .eq("id", link.id);

        if (error) {
          throw new Error(`Link update error: ${error.message}`);
        }

        break;
      }

      case "delete": {
        const { error } = await client
          .from("medicamento_tratamentos")
          .delete()
          .eq("id", item.payload.id);

        if (error) {
          throw new Error(`Link delete error: ${error.message}`);
        }

        break;
      }

      default:
        throw new Error(
          `Operação não suportada em medicamento_tratamentos: ${item.operation}`
        );
    }

    if (item.operation !== "delete" && link.id) {
      await db.medicamento_tratamentos.update(link.id, { synced: true });
    }
  };

  // ============================================================
  // PROCESSAMENTO DA FILA
  // ============================================================

  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline) {
      return;
    }

    const count = await db.syncQueue.count();

    if (count === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    addLog(`🟢 Iniciando sync: ${count} itens na fila`, "info");

    try {
      const queue = await db.syncQueue
        .toCollection()
        .filter(
          (item) =>
            item.failed !== true &&
            (item.retry_count || 0) < MAX_RETRIES
        )
        .toArray();

      if (queue.length === 0) {
        return;
      }

      /**
       * Ordem importante para respeitar dependências de chave estrangeira.
       */
      const priorityOrder = [
        "persons",
        "medicos",
        "hospitais",
        "locais",
        "laboratorios",
        "instituicoes",
        "tratamentos",
        "medicamentos",
        "medicamento_tratamentos",
        "documents",
        "exames",
        "renovacoes",
        "doseLogs",
        "consultas",
        "cirurgias",
        "anexos_clinicos",
        "vaults",
        "vaultMembers",
        "credentials",
        "cards",
      ];

      queue.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.table);
        const bIndex = priorityOrder.indexOf(b.table);

        return (
          (aIndex === -1 ? 999 : aIndex) -
          (bIndex === -1 ? 999 : bIndex)
        );
      });

      let successCount = 0;
      let maxRetryInQueue = 0;

      for (const item of queue) {
        if ((item.retry_count || 0) > maxRetryInQueue) {
          maxRetryInQueue = item.retry_count || 0;
        }

        /**
         * Se o usuário ficou offline durante o processamento,
         * interrompe o restante da fila sem apagar os itens.
         */
        if (!navigator.onLine) {
          addLog(
            "📴 Conexão perdida durante a sincronização. Fila preservada.",
            "info"
          );
          break;
        }

        try {
          switch (item.table) {
            case "persons":
              await syncPerson(item);
              break;

            case "medicos":
              await syncMedico(item);
              break;

            case "hospitais":
              await syncHospital(item);
              break;

            case "locais":
              await syncLocal(item);
              break;

            case "laboratorios":
              await syncLaboratorio(item);
              break;

            case "instituicoes":
              await syncInstituicao(item);
              break;

            case "tratamentos":
              await syncTratamento(item);
              break;

            case "medicamentos":
              await syncMedicamento(item);
              break;

            case "medicamento_tratamentos":
              await syncMedicamentoTratamento(item);
              break;

            case "documents":
              await syncDocument(item);
              break;

            case "exames":
              await syncExame(item);
              break;

            case "renovacoes":
              await syncRenovacao(item);
              break;

            case "doseLogs":
              await syncDoseLog(item);
              break;

            case "consultas":
              await syncConsulta(item);
              break;

            case "cirurgias":
              await syncCirurgia(item);
              break;

            case "anexos_clinicos":
              await syncAnexoClinico(item);
              break;

            case "vaults":
              await syncVault(item);
              break;

            case "vaultMembers":
              await syncVaultMember(item);
              break;

            case "credentials":
              await syncCredential(item);
              break;

            case "cards":
              await syncCard(item);
              break;

            default:
              throw new Error(
                `Tabela não suportada no sync: ${item.table}`
              );
          }

          /**
           * Só remove da fila depois que a função de sincronização
           * realmente terminou sem lançar erro.
           */
          await db.syncQueue.delete(item.id!);

          successCount++;

          addLog(
            `✅ ${item.table} sincronizado`,
            "success"
          );
        } catch (error: any) {
          const retryCount = (item.retry_count || 0) + 1;
          const failed = retryCount >= MAX_RETRIES;

          const errorMessage =
            error?.message ||
            error?.toString() ||
            "Erro desconhecido";

          await db.syncQueue.update(item.id!, {
            retry_count: retryCount,
            failed,
          });

          if (failed) {
            addLog(
              `✖️ Falha permanente em ${item.table}: ${errorMessage}`,
              "error"
            );
          } else {
            addLog(
              `⚠️ Erro em ${item.table} (tentativa ${retryCount}/${MAX_RETRIES}): ${errorMessage}`,
              "error"
            );
          }
        }
      }

      if (successCount > 0) {
        addLog(
          `✅ ${successCount} itens sincronizados com sucesso!`,
          "success"
        );
      }

      const remaining = await db.syncQueue
        .toCollection()
        .filter(
          (item) =>
            item.failed !== true &&
            (item.retry_count || 0) < MAX_RETRIES
        )
        .count();

      if (remaining > 0 && navigator.onLine) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const delay = Math.min(
          5000 * Math.pow(2, maxRetryInQueue),
          MAX_BACKOFF_MS
        );

        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          processQueue();
        }, delay);
      }
    } catch (error: any) {
      addLog(
        `❌ Erro ao processar fila: ${
          error?.message || error
        }`,
        "error"
      );
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [isOnline, addLog]);

  // ============================================================
  // RESETAR ITENS COM FALHA PERMANENTE
  // ============================================================

  const resetFailedItems = useCallback(async () => {
    const failedItems = await db.syncQueue
      .toCollection()
      .filter((item) => item.failed === true)
      .toArray();

    if (failedItems.length === 0) {
      return;
    }

    for (const item of failedItems) {
      await db.syncQueue.update(item.id!, {
        failed: false,
        retry_count: 0,
      });
    }

    addLog(
      `✅ ${failedItems.length} itens redefinidos para reenvio`,
      "success"
    );

    await processQueue();
  }, [processQueue, addLog]);

  // ============================================================
  // EVENTO MANUAL DE PROCESSAMENTO
  // ============================================================

  useEffect(() => {
    const handleProcess = () => {
      if (isOnline && !processingRef.current) {
        processQueue();
      }
    };

    window.addEventListener("sync:process", handleProcess);

    return () => {
      window.removeEventListener("sync:process", handleProcess);
    };
  }, [isOnline, processQueue]);

  // ============================================================
  // PROCESSAMENTO AUTOMÁTICO QUANDO VOLTAR ONLINE
  // ============================================================

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return {
    processQueue,
    isProcessing,
    isOnline,
    resetFailedItems,
    syncLogs,
    clearLogs,
  };
}