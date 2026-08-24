// hooks/useSyncQueue.ts
"use client";

import { db } from "@/lib/db";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

import type {
  Document,
  Vault,
  VaultMember,
  Medico,
  Farmacia,
  Hospital,
  DoseLog,
  Credential,
  BankCard,
  LocalSaude,
  Tratamento,
  Consulta,
  Cirurgia,
  Exame,
  Cid,
  Medicamento,
  Renovacao,
  Person,
  InstituicaoEnsino,
  SyncQueueItem,
  AppSettings,
  RegistroSaude,
} from "@/lib/types";

const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 60000;

type SyncLogType = "info" | "success" | "error";

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
  tipo?: string;
  url?: string;
  thumbnail_url?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export function useSyncQueue() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : false
  );
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const processingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((message: string, type: SyncLogType = "info") => {
    const time = new Date().toLocaleTimeString();
    setSyncLogs((prev) => {
      const next = [{ time, message, type }, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setSyncLogs([]);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

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

  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Cliente Supabase indisponível");
    }
    return supabase;
  };

  // ============================================================
  // PERSONS
  // ============================================================

  const syncPerson = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const person = item.payload as unknown as Person;

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
            color: person.color || "#60A5FA",
            is_default: person.isDefault || false,
            created_at: person.created_at,
            updated_at: person.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Persons insert error: ${error.message}`);
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
            color: person.color || "#60A5FA",
            is_default: person.isDefault || false,
            updated_at: person.updated_at,
          })
          .eq("id", person.id);
        if (error) throw new Error(`Persons update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("persons").delete().eq("id", payload.id);
        if (error) throw new Error(`Persons delete error: ${error.message}`);
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

  const syncMedico = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const medico = item.payload as unknown as Medico;

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
            observacoes: medico.observacoes || null,
            created_at: medico.created_at,
            updated_at: medico.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Medicos insert error: ${error.message}`);
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
            observacoes: medico.observacoes || null,
            updated_at: medico.updated_at,
          })
          .eq("id", medico.id);
        if (error) throw new Error(`Medicos update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("medicos").delete().eq("id", payload.id);
        if (error) throw new Error(`Medicos delete error: ${error.message}`);
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
  // FARMÁCIAS
  // ============================================================

  const syncFarmacia = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const farmacia = item.payload as unknown as Farmacia;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("farmacias").upsert(
          {
            id: farmacia.id,
            user_id: farmacia.user_id,
            nome: farmacia.nome,
            endereco: farmacia.endereco || null,
            telefone: farmacia.telefone || null,
            observacoes: farmacia.observacoes || null,
            created_at: farmacia.created_at,
            updated_at: farmacia.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Farmacias insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("farmacias")
          .update({
            nome: farmacia.nome,
            endereco: farmacia.endereco || null,
            telefone: farmacia.telefone || null,
            observacoes: farmacia.observacoes || null,
            updated_at: farmacia.updated_at,
          })
          .eq("id", farmacia.id);
        if (error) throw new Error(`Farmacias update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("farmacias").delete().eq("id", payload.id);
        if (error) throw new Error(`Farmacias delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em farmacias: ${item.operation}`);
    }

    if (item.operation !== "delete" && farmacia.id) {
      await db.farmacias.update(farmacia.id, { synced: true });
    }
  };

  // ============================================================
  // HOSPITAIS
  // ============================================================

  const syncHospital = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const hospital = item.payload as unknown as Hospital;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("hospitais").upsert(
          {
            id: hospital.id,
            user_id: hospital.user_id,
            nome: hospital.nome,
            endereco: hospital.endereco || null,
            telefone: hospital.telefone || null,
            tipo: hospital.tipo || null,
            observacoes: hospital.observacoes || null,
            created_at: hospital.created_at,
            updated_at: hospital.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Hospitais insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("hospitais")
          .update({
            nome: hospital.nome,
            endereco: hospital.endereco || null,
            telefone: hospital.telefone || null,
            tipo: hospital.tipo || null,
            observacoes: hospital.observacoes || null,
            updated_at: hospital.updated_at,
          })
          .eq("id", hospital.id);
        if (error) throw new Error(`Hospitais update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("hospitais").delete().eq("id", payload.id);
        if (error) throw new Error(`Hospitais delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em hospitais: ${item.operation}`);
    }

    if (item.operation !== "delete" && hospital.id) {
      await db.hospitais.update(hospital.id, { synced: true });
    }
  };

  // ============================================================
  // LOCAIS DE SAÚDE
  // ============================================================

  const syncLocal = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const local = item.payload as unknown as LocalSaude;

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
            observacoes: local.observacoes || null,
            created_at: local.created_at,
            updated_at: local.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Locais insert error: ${error.message}`);
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
            observacoes: local.observacoes || null,
            updated_at: local.updated_at,
          })
          .eq("id", local.id);
        if (error) throw new Error(`Locais update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("locais").delete().eq("id", payload.id);
        if (error) throw new Error(`Locais delete error: ${error.message}`);
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
  // INSTITUIÇÕES DE ENSINO
  // ============================================================

  const syncInstituicao = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const instituicao = item.payload as unknown as InstituicaoEnsino;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("instituicoes").upsert(
          {
            id: instituicao.id,
            user_id: instituicao.user_id,
            nome: instituicao.nome,
            cnpj: instituicao.cnpj || null,
            created_at: instituicao.created_at,
            updated_at: instituicao.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Instituicoes insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("instituicoes")
          .update({
            nome: instituicao.nome,
            cnpj: instituicao.cnpj || null,
            updated_at: instituicao.updated_at,
          })
          .eq("id", instituicao.id);
        if (error) throw new Error(`Instituicoes update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("instituicoes").delete().eq("id", payload.id);
        if (error) throw new Error(`Instituicoes delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em instituicoes: ${item.operation}`);
    }

    if (item.operation !== "delete" && instituicao.id) {
      await db.instituicoes.update(instituicao.id, { synced: true });
    }
  };

  // ============================================================
  // CIDs
  // ============================================================

  const syncCid = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const cid = item.payload as unknown as Cid;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("cids").upsert(
          {
            id: cid.id,
            user_id: cid.user_id,
            codigo: cid.codigo,
            descricao: cid.descricao,
            person_id: cid.person_id || null,
            data_diagnostico: cid.data_diagnostico || null,
            medico_id: cid.medico_id || null,
            hospital_id: cid.hospital_id || null,
            local_id: cid.local_id || null,
            observacoes: cid.observacoes || null,
            anexo_url: cid.anexo_url || null,
            created_at: cid.created_at,
            updated_at: cid.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Cids insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("cids")
          .update({
            codigo: cid.codigo,
            descricao: cid.descricao,
            person_id: cid.person_id || null,
            data_diagnostico: cid.data_diagnostico || null,
            medico_id: cid.medico_id || null,
            hospital_id: cid.hospital_id || null,
            local_id: cid.local_id || null,
            observacoes: cid.observacoes || null,
            anexo_url: cid.anexo_url || null,
            updated_at: cid.updated_at,
          })
          .eq("id", cid.id);
        if (error) throw new Error(`Cids update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("cids").delete().eq("id", payload.id);
        if (error) throw new Error(`Cids delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em cids: ${item.operation}`);
    }

    if (item.operation !== "delete" && cid.id) {
      await db.cids.update(cid.id, { synced: true });
    }
  };

  // ============================================================
  // TRATAMENTOS
  // ============================================================

  const syncTratamento = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const tratamento = item.payload as unknown as Tratamento;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("tratamentos").upsert(
          {
            id: tratamento.id,
            user_id: tratamento.user_id,
            person_id: tratamento.person_id || null,
            nome: tratamento.nome,
            status: tratamento.status,
            cor: tratamento.cor || "#8B5CF6",
            observacoes: tratamento.observacoes || null,
            created_at: tratamento.created_at,
            updated_at: tratamento.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Tratamentos insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("tratamentos")
          .update({
            person_id: tratamento.person_id || null,
            nome: tratamento.nome,
            status: tratamento.status,
            cor: tratamento.cor || "#8B5CF6",
            observacoes: tratamento.observacoes || null,
            updated_at: tratamento.updated_at,
          })
          .eq("id", tratamento.id);
        if (error) throw new Error(`Tratamentos update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("tratamentos").delete().eq("id", payload.id);
        if (error) throw new Error(`Tratamentos delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em tratamentos: ${item.operation}`);
    }

    if (item.operation !== "delete" && tratamento.id) {
      await syncTratamentoCids(tratamento.id, tratamento.cid_ids || []);
      await db.tratamentos.update(tratamento.id, { synced: true });
    }
  };

  // ============================================================
  // MEDICAMENTOS (BLINDADO)
  // ============================================================

  const syncMedicamento = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const med = item.payload as unknown as Medicamento;

    switch (item.operation) {
      case "add":
      case "update": {
        const { error } = await client.from("medicamentos").upsert(
          {
            id: med.id,
            user_id: med.user_id,
            person_id: med.person_id || null,
            document_id: med.document_id || null,
            medico_id: med.medico_id || null,
            farmacia_id: med.farmacia_id || null,
            hospital_id: med.hospital_id || null,
            local_id: med.local_id || null,
            nome: med.nome,
            dosagem: med.dosagem,
            medico: med.medico || "",
            farmacia: med.farmacia || null,
            data_receita: med.data_receita,
            proxima_renovacao: med.proxima_renovacao,
            observacoes: med.observacoes || null,
            tipo_receita: med.tipo_receita || "comum",
            tipo_uso: med.tipo_uso || "continuo",
            forma_farmaceutica: med.forma_farmaceutica || null,
            cor_principal: med.cor_principal || null,
            cor_secundaria: med.cor_secundaria || null,
            status: med.status || "ativo",
            estoque_quantidade: med.estoque_quantidade || 0,
            estoque_data_referencia: med.estoque_data_referencia || null,
            estoque_horarios: med.estoque_horarios || [],
            estoque_unidade_por_dose: med.estoque_unidade_por_dose || null,
            estoque_unidade_medida: med.estoque_unidade_medida || null,
            estoque_ml_total: med.estoque_ml_total || null,
            estoque_gotas_por_ml: med.estoque_gotas_por_ml || null,
            formato: med.formato || null,
            cores: med.cores || [],
            preco: med.preco || null,
            motivo_descontinuacao: med.motivo_descontinuacao || null,
            medico_descontinuacao_id: med.medico_descontinuacao_id || null,
            medico_descontinuacao_nome: med.medico_descontinuacao_nome || null,
            substituido_por_id: med.substituido_por_id || null,
            data_descontinuacao: med.data_descontinuacao || null,
            historico_dosagens: med.historico_dosagens || [],
            created_at: med.created_at,
            updated_at: med.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Medicamentos upsert error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        await client.from("medicamento_tratamentos").delete().eq("medicamento_id", payload.id);
        await client.from("renovacoes").delete().eq("medicamento_id", payload.id);
        await client.from("dose_logs").delete().eq("medicamento_id", payload.id);
        const { error } = await client.from("medicamentos").delete().eq("id", payload.id);
        if (error) throw new Error(`Medicamentos delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em medicamentos: ${item.operation}`);
    }

    if (item.operation !== "delete" && med.id) {
      await syncMedicamentoTratamentos(med.id, med.tratamento_ids || []);
      await db.medicamentos.update(med.id, { synced: true });
    }
  };

  // ============================================================
  // DOCUMENTOS
  // ============================================================

  const syncDocument = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const doc = item.payload as unknown as Document;

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
            description: doc.description || null,
            metadata: doc.metadata || {},
            attachments: doc.attachments || [],
            is_favorite: doc.is_favorite,
            vault_id: doc.vault_id || null,
            hospital_id: doc.hospital_id || null,
            medico_id: doc.medico_id || null,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Documents insert error: ${error.message}`);
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
            description: doc.description || null,
            metadata: doc.metadata || {},
            attachments: doc.attachments || [],
            is_favorite: doc.is_favorite,
            vault_id: doc.vault_id || null,
            hospital_id: doc.hospital_id || null,
            medico_id: doc.medico_id || null,
            updated_at: doc.updated_at,
          })
          .eq("id", doc.id);
        if (error) throw new Error(`Documents update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("documents").delete().eq("id", payload.id);
        if (error) throw new Error(`Documents delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em documents: ${item.operation}`);
    }

    if (item.operation !== "delete" && doc.id) {
      await db.documents.update(doc.id, { synced: true });
    }
  };

  // ============================================================
  // EXAMES
  // ============================================================

  const syncExame = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const exame = item.payload as unknown as Exame;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("exames").upsert(
          {
            id: exame.id,
            user_id: exame.user_id || null,
            person_id: exame.person_id || null,
            document_id: exame.document_id || null,
            medico_id: exame.medico_id || null,
            local_id: exame.local_id || null,
            laboratorio: exame.laboratorio || null,
            medico: exame.medico || null,
            nome: exame.nome,
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
        if (error) throw new Error(`Exames insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("exames")
          .update({
            person_id: exame.person_id || null,
            document_id: exame.document_id || null,
            medico_id: exame.medico_id || null,
            local_id: exame.local_id || null,
            laboratorio: exame.laboratorio || null,
            medico: exame.medico || null,
            nome: exame.nome,
            data: exame.data,
            data_retorno: exame.data_retorno || null,
            motivo: exame.motivo || null,
            observacoes: exame.observacoes || null,
            anexo_url: exame.anexo_url || null,
            updated_at: exame.updated_at,
          })
          .eq("id", exame.id);
        if (error) throw new Error(`Exames update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("exames").delete().eq("id", payload.id);
        if (error) throw new Error(`Exames delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em exames: ${item.operation}`);
    }

    if (item.operation !== "delete" && exame.id) {
      await syncExameTratamentos(exame.id, exame.tratamento_ids || []);
      await db.exames.update(exame.id, { synced: true });
    }
  };

  // ============================================================
  // CONSULTAS
  // ============================================================

  const syncConsulta = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const consulta = item.payload as unknown as Consulta;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("consultas").upsert(
          {
            id: consulta.id,
            user_id: consulta.user_id,
            person_id: consulta.person_id || null,
            medico_id: consulta.medico_id || null,
            hospital_id: consulta.hospital_id || null,
            document_id: consulta.document_id || null,
            especialidade: consulta.especialidade,
            medico: consulta.medico || "",
            data: consulta.data,
            horario: consulta.horario || null,
            status: consulta.status,
            motivo: consulta.motivo || null,
            observacoes: consulta.observacoes || null,
            created_at: consulta.created_at,
            updated_at: consulta.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Consultas insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("consultas")
          .update({
            person_id: consulta.person_id || null,
            medico_id: consulta.medico_id || null,
            hospital_id: consulta.hospital_id || null,
            document_id: consulta.document_id || null,
            especialidade: consulta.especialidade,
            medico: consulta.medico || "",
            data: consulta.data,
            horario: consulta.horario || null,
            status: consulta.status,
            motivo: consulta.motivo || null,
            observacoes: consulta.observacoes || null,
            updated_at: consulta.updated_at,
          })
          .eq("id", consulta.id);
        if (error) throw new Error(`Consultas update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("consultas").delete().eq("id", payload.id);
        if (error) throw new Error(`Consultas delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em consultas: ${item.operation}`);
    }

    if (item.operation !== "delete" && consulta.id) {
      await db.consultas.update(consulta.id, { synced: true });
    }
  };

  // ============================================================
  // CIRURGIAS
  // ============================================================

  const syncCirurgia = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const cirurgia = item.payload as unknown as Cirurgia;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("cirurgias").upsert(
          {
            id: cirurgia.id,
            user_id: cirurgia.user_id,
            person_id: cirurgia.person_id || null,
            procedimento: cirurgia.procedimento,
            data: cirurgia.data,
            medico_id: cirurgia.medico_id || null,
            hospital_id: cirurgia.hospital_id || null,
            document_id: cirurgia.document_id || null,
            status: cirurgia.status,
            observacoes: cirurgia.observacoes || null,
            created_at: cirurgia.created_at,
            updated_at: cirurgia.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Cirurgias insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("cirurgias")
          .update({
            person_id: cirurgia.person_id || null,
            procedimento: cirurgia.procedimento,
            data: cirurgia.data,
            medico_id: cirurgia.medico_id || null,
            hospital_id: cirurgia.hospital_id || null,
            document_id: cirurgia.document_id || null,
            status: cirurgia.status,
            observacoes: cirurgia.observacoes || null,
            updated_at: cirurgia.updated_at,
          })
          .eq("id", cirurgia.id);
        if (error) throw new Error(`Cirurgias update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("cirurgias").delete().eq("id", payload.id);
        if (error) throw new Error(`Cirurgias delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em cirurgias: ${item.operation}`);
    }

    if (item.operation !== "delete" && cirurgia.id) {
      await db.cirurgias.update(cirurgia.id, { synced: true });
    }
  };

  // ============================================================
  // RENOVAÇÕES
  // ============================================================

  const syncRenovacao = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const renovacao = item.payload as unknown as Renovacao;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("renovacoes").upsert(
          {
            id: renovacao.id,
            user_id: renovacao.user_id,
            person_id: renovacao.person_id || null,
            medicamento_id: renovacao.medicamento_id,
            medico_id: renovacao.medico_id || null,
            farmacia_id: renovacao.farmacia_id || null,
            hospital_id: renovacao.hospital_id || null,
            local_id: renovacao.local_id || null,
            document_id: renovacao.document_id || null,
            quantidade: renovacao.quantidade || null,
            preco: renovacao.preco || null,
            lote: renovacao.lote || null,
            validade_produto: renovacao.validade_produto || null,
            data: renovacao.data,
            anexo_url: renovacao.anexo_url || null,
            observacoes: renovacao.observacoes || null,
            created_at: renovacao.created_at,
            updated_at: renovacao.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Renovacoes insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("renovacoes")
          .update({
            person_id: renovacao.person_id || null,
            medicamento_id: renovacao.medicamento_id,
            medico_id: renovacao.medico_id || null,
            farmacia_id: renovacao.farmacia_id || null,
            hospital_id: renovacao.hospital_id || null,
            local_id: renovacao.local_id || null,
            document_id: renovacao.document_id || null,
            quantidade: renovacao.quantidade || null,
            preco: renovacao.preco || null,
            lote: renovacao.lote || null,
            validade_produto: renovacao.validade_produto || null,
            data: renovacao.data,
            anexo_url: renovacao.anexo_url || null,
            observacoes: renovacao.observacoes || null,
            updated_at: renovacao.updated_at,
          })
          .eq("id", renovacao.id);
        if (error) throw new Error(`Renovacoes update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("renovacoes").delete().eq("id", payload.id);
        if (error) throw new Error(`Renovacoes delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em renovacoes: ${item.operation}`);
    }

    if (item.operation !== "delete" && renovacao.id) {
      await db.renovacoes.update(renovacao.id, { synced: true });
    }
  };

  // ============================================================
  // DOSE LOGS
  // ============================================================

  const syncDoseLog = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const log = item.payload as unknown as DoseLog;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("dose_logs").upsert(
          {
            id: log.id,
            user_id: log.user_id,
            person_id: log.person_id || null,
            medicamento_id: log.medicamento_id,
            data: log.data,
            horario: log.horario,
            tomado_em: log.tomado_em || null,
            ignorado_em: log.ignorado_em || null,
            quantidade: log.quantidade || null,
            created_at: log.created_at,
            updated_at: log.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Dose_logs insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("dose_logs")
          .update({
            person_id: log.person_id || null,
            tomado_em: log.tomado_em || null,
            ignorado_em: log.ignorado_em || null,
            quantidade: log.quantidade || null,
            updated_at: log.updated_at,
          })
          .eq("id", log.id);
        if (error) throw new Error(`Dose_logs update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("dose_logs").delete().eq("id", payload.id);
        if (error) throw new Error(`Dose_logs delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em doseLogs: ${item.operation}`);
    }

    if (item.operation !== "delete" && log.id) {
      await db.doseLogs.update(log.id, { synced: true });
    }
  };

  // ============================================================
  // ANEXOS CLÍNICOS
  // ============================================================

  const syncAnexoClinico = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const anexo = item.payload as unknown as AnexoClinico;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("anexos_clinicos").upsert(
          {
            id: anexo.id,
            user_id: anexo.user_id || null,
            person_id: anexo.person_id || null,
            tratamento_id: anexo.tratamento_id || null,
            medicamento_id: anexo.medicamento_id || null,
            tipo: anexo.tipo || null,
            url: anexo.url || null,
            thumbnail_url: anexo.thumbnail_url || null,
            tags: anexo.tags || [],
            created_at: anexo.created_at,
            updated_at: anexo.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Anexos_clinicos insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("anexos_clinicos")
          .update({
            person_id: anexo.person_id || null,
            tratamento_id: anexo.tratamento_id || null,
            medicamento_id: anexo.medicamento_id || null,
            tipo: anexo.tipo || null,
            url: anexo.url || null,
            thumbnail_url: anexo.thumbnail_url || null,
            tags: anexo.tags || [],
            updated_at: anexo.updated_at,
          })
          .eq("id", anexo.id);
        if (error) throw new Error(`Anexos_clinicos update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("anexos_clinicos").delete().eq("id", payload.id);
        if (error) throw new Error(`Anexos_clinicos delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em anexos_clinicos: ${item.operation}`);
    }

    if (item.operation !== "delete" && anexo.id) {
      await db.anexos_clinicos.update(anexo.id, { synced: true });
    }
  };

  // ============================================================
  // REGISTROS DE SAÚDE (SINTOMAS E MEDIÇÕES)
  // ============================================================

  const syncRegistroSaude = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const reg = item.payload as unknown as RegistroSaude;

    switch (item.operation) {
      case "add":
      case "update": {
        const { error } = await client.from("registros_saude").upsert(
          {
            id: reg.id,
            user_id: reg.user_id,
            person_id: reg.person_id || null,
            categoria: reg.categoria,
            tipo: reg.tipo || null,
            nome: reg.nome,
            intensidade: reg.intensidade !== undefined ? reg.intensidade : null,
            valor_medicao: reg.valor_medicao || null,
            data: reg.data,
            horario: reg.horario || null,
            observacoes: reg.observacoes || null,
            medicamento_id: reg.medicamento_id || null,
            tratamento_ids: reg.tratamento_ids || [],
            cid_ids: reg.cid_ids || [],
            created_at: reg.created_at,
            updated_at: reg.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Registros_saude upsert error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("registros_saude").delete().eq("id", payload.id);
        if (error) throw new Error(`Registros_saude delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em registros_saude: ${item.operation}`);
    }

    if (item.operation !== "delete" && reg.id) {
      await db.registros_saude.update(reg.id, { synced: true });
    }
  };

  // ============================================================
  // VAULTS
  // ============================================================

  const syncVault = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const vault = item.payload as unknown as Vault;

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
        if (error) throw new Error(`Vaults insert error: ${error.message}`);
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
        if (error) throw new Error(`Vaults update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("vaults").delete().eq("id", payload.id);
        if (error) throw new Error(`Vaults delete error: ${error.message}`);
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

  const syncVaultMember = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const member = item.payload as unknown as VaultMember;

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
        if (error) throw new Error(`Vault_members insert error: ${error.message}`);
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
        if (error) throw new Error(`Vault_members update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("vault_members").delete().eq("id", payload.id);
        if (error) throw new Error(`Vault_members delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em vaultMembers: ${item.operation}`);
    }

    if (item.operation !== "delete" && member.id) {
      await db.vaultMembers.update(member.id, { synced: true });
    }
  };

  // ============================================================
  // CREDENTIALS
  // ============================================================

  const syncCredential = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const credential = item.payload as unknown as Credential;

    switch (item.operation) {
      case "add": {
        const { error } = await client.from("credentials").upsert(
          {
            id: credential.id,
            user_id: credential.user_id,
            vault_id: credential.vault_id || null,
            title: credential.title,
            username: credential.username || null,
            password_encrypted: credential.password_encrypted,
            url: credential.url || null,
            notes: credential.notes || null,
            category: credential.category,
            password_history: credential.password_history || null,
            created_at: credential.created_at,
            updated_at: credential.updated_at,
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Credentials insert error: ${error.message}`);
        break;
      }
      case "update": {
        const { error } = await client
          .from("credentials")
          .update({
            vault_id: credential.vault_id || null,
            title: credential.title,
            username: credential.username || null,
            password_encrypted: credential.password_encrypted,
            url: credential.url || null,
            notes: credential.notes || null,
            category: credential.category,
            password_history: credential.password_history || null,
            updated_at: credential.updated_at,
          })
          .eq("id", credential.id);
        if (error) throw new Error(`Credentials update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("credentials").delete().eq("id", payload.id);
        if (error) throw new Error(`Credentials delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em credentials: ${item.operation}`);
    }

    if (item.operation !== "delete" && credential.id) {
      await db.credentials.update(credential.id, { synced: true });
    }
  };

  // ============================================================
  // SETTINGS
  // ============================================================

  const syncSettings = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const settings = item.payload as unknown as AppSettings;

    switch (item.operation) {
      case "add":
      case "update": {
        const { error } = await client.from("settings").upsert(
          {
            id: settings.id,
            user_id: settings.user_id,
            default_person_id: settings.default_person_id || null,
            updated_at: settings.updated_at || new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        if (error) throw new Error(`Settings sync error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("settings").delete().eq("id", payload.id);
        if (error) throw new Error(`Settings delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em settings: ${item.operation}`);
    }

    if (item.operation !== "delete" && settings.id) {
      await db.settings.update(settings.id, { synced: true });
    }
  };

  // ============================================================
  // CARTÕES (bankCards)
  // ============================================================

  const syncCard = async (item: SyncQueueItem) => {
    const client = requireSupabase();
    const card = item.payload as unknown as BankCard;

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
        if (error) throw new Error(`Cards insert error: ${error.message}`);
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
        if (error) throw new Error(`Cards update error: ${error.message}`);
        break;
      }
      case "delete": {
        const payload = item.payload as unknown as { id: string };
        const { error } = await client.from("cards").delete().eq("id", payload.id);
        if (error) throw new Error(`Cards delete error: ${error.message}`);
        break;
      }
      default:
        throw new Error(`Operação não suportada em cards: ${item.operation}`);
    }

    if (item.operation !== "delete" && card.id) {
      await db.bankCards.update(card.id, { synced: true });
    }
  };

  // ============================================================
  // SINCRONIZAÇÃO DAS JUNÇÕES N:N
  // ============================================================

  const syncMedicamentoTratamentos = async (medicamentoId: string, tratamentoIds: string[]) => {
    const client = requireSupabase();

    const { error: deleteError } = await client
      .from("medicamento_tratamentos")
      .delete()
      .eq("medicamento_id", medicamentoId);
    if (deleteError) throw new Error(`medicamento_tratamentos delete error: ${deleteError.message}`);

    if (tratamentoIds.length > 0) {
      const rows = tratamentoIds.map((tratamentoId) => ({
        medicamento_id: medicamentoId,
        tratamento_id: tratamentoId,
      }));
      const { error: insertError } = await client.from("medicamento_tratamentos").insert(rows);
      if (insertError) throw new Error(`medicamento_tratamentos insert error: ${insertError.message}`);
    }
  };

  const syncTratamentoCids = async (tratamentoId: string, cidIds: string[]) => {
    const client = requireSupabase();

    const { error: deleteError } = await client
      .from("tratamento_cids")
      .delete()
      .eq("tratamento_id", tratamentoId);
    if (deleteError) throw new Error(`tratamento_cids delete error: ${deleteError.message}`);

    if (cidIds.length > 0) {
      const rows = cidIds.map((cidId) => ({
        tratamento_id: tratamentoId,
        cid_id: cidId,
      }));
      const { error: insertError } = await client.from("tratamento_cids").insert(rows);
      if (insertError) throw new Error(`tratamento_cids insert error: ${insertError.message}`);
    }
  };

  const syncExameTratamentos = async (exameId: string, tratamentoIds: string[]) => {
    const client = requireSupabase();

    const { error: deleteError } = await client
      .from("exame_tratamentos")
      .delete()
      .eq("exame_id", exameId);
    if (deleteError) throw new Error(`exame_tratamentos delete error: ${deleteError.message}`);

    if (tratamentoIds.length > 0) {
      const rows = tratamentoIds.map((tratamentoId) => ({
        exame_id: exameId,
        tratamento_id: tratamentoId,
      }));
      const { error: insertError } = await client.from("exame_tratamentos").insert(rows);
      if (insertError) throw new Error(`exame_tratamentos insert error: ${insertError.message}`);
    }
  };

  // ============================================================
  // PROCESSAMENTO DA FILA
  // ============================================================

  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const queue = await db.syncQueue
        .toCollection()
        .filter((item) => item.failed !== true && (item.retry_count || 0) < MAX_RETRIES)
        .toArray();

      if (queue.length === 0) {
        return;
      }

      addLog(`🟢 Iniciando sync: ${queue.length} itens na fila`, "info");

      const priorityOrder: SyncQueueItem["table"][] = [
        "persons",
        "settings",
        "medicos",
        "farmacias",
        "hospitais",
        "locais",
        "instituicoes",
        "cids",
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
        "vaults",
        "vaultMembers",
        "credentials",
        "cards",
      ];

      queue.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.table);
        const bIndex = priorityOrder.indexOf(b.table);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

      let successCount = 0;
      let highestRetry = 0;

      for (const item of queue) {
        const retryCount = item.retry_count || 0;
        highestRetry = Math.max(highestRetry, retryCount);

        if (!navigator.onLine) {
          addLog("📴 Conexão perdida durante a sincronização. Fila preservada.", "info");
          break;
        }

        try {
          switch (item.table) {
            case "persons":
              await syncPerson(item);
              break;
            case "settings":
              await syncSettings(item);
              break;
            case "medicos":
              await syncMedico(item);
              break;
            case "farmacias":
              await syncFarmacia(item);
              break;
            case "hospitais":
              await syncHospital(item);
              break;
            case "locais":
              await syncLocal(item);
              break;
            case "instituicoes":
              await syncInstituicao(item);
              break;
            case "cids":
              await syncCid(item);
              break;
            case "documents":
              await syncDocument(item);
              break;
            case "tratamentos":
              await syncTratamento(item);
              break;
            case "medicamentos":
              await syncMedicamento(item);
              break;
            case "exames":
              await syncExame(item);
              break;
            case "consultas":
              await syncConsulta(item);
              break;
            case "cirurgias":
              await syncCirurgia(item);
              break;
            case "renovacoes":
              await syncRenovacao(item);
              break;
            case "doseLogs":
              await syncDoseLog(item);
              break;
            case "anexos_clinicos":
              await syncAnexoClinico(item);
              break;
            case "registros_saude":
              await syncRegistroSaude(item);
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
              throw new Error(`Tabela não suportada no sync: ${item.table}`);
          }

          await db.syncQueue.delete(item.id!);
          successCount++;
          addLog(`✅ ${item.table} sincronizado`, "success");
        } catch (error: unknown) {
          const nextRetryCount = retryCount + 1;
          const failed = nextRetryCount >= MAX_RETRIES;

          const errorMessage = error instanceof Error ? error.message : String(error);

          await db.syncQueue.update(item.id!, {
            retry_count: nextRetryCount,
            failed,
          });

          if (failed) {
            addLog(`✖️ Falha permanente em ${item.table}: ${errorMessage}`, "error");
          } else {
            addLog(`⚠️ Erro em ${item.table} (tentativa ${nextRetryCount}/${MAX_RETRIES}): ${errorMessage}`, "error");
          }
        }
      }

      if (successCount > 0) {
        addLog(`✅ ${successCount} itens sincronizados com sucesso!`, "success");
      }

      const remaining = await db.syncQueue
        .toCollection()
        .filter((item) => item.failed !== true && (item.retry_count || 0) < MAX_RETRIES)
        .count();

      if (remaining > 0 && navigator.onLine) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const delay = Math.min(5000 * Math.pow(2, highestRetry), MAX_BACKOFF_MS);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          if (!processingRef.current) {
            processQueue();
          }
        }, delay);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`❌ Erro ao processar fila: ${errorMessage}`, "error");
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [isOnline, addLog]);

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

    addLog(`✅ ${failedItems.length} itens redefinidos para reenvio`, "success");
    await processQueue();
  }, [processQueue, addLog]);

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
