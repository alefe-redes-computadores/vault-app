"use client";

import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
// ✅ IMPORT ADICIONADO: safeUpdateMedicamento para o estoque
import { db, safeSetDoseLog, safeUpdateMedicamento } from "@/lib/db";
import { useAuth } from "./useAuth";
// ✅ IMPORT ADICIONADO: getLocalTodayISO para o fuso horário
import { getLocalTodayISO } from "@/lib/health-utils";

export function useDoseNotificationActions() {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;

    const listener = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      async (event: any) => {
        const extra = event.notification?.extra;
        if (!extra || extra.type !== "dose_reminder") return;

        const actionId = event.actionId;
        // ✅ CORREÇÃO 1: Fuso horário local protegido
        const hoje = getLocalTodayISO();

        if (actionId === "TOMEI") {
          // 1. Registra a dose como tomada no log
          await safeSetDoseLog({
            user_id: user.id,
            medicamento_id: extra.medicamentoId,
            data: hoje,
            horario: extra.horario,
            tomado_em: new Date().toISOString(),
          });

          // ✅ CORREÇÃO 2: Abate o estoque em tempo real igual ao app
          const med = await db.medicamentos.get(extra.medicamentoId);
          if (med && typeof med.estoque_quantidade === "number") {
            const unidadePorDose = med.estoque_unidade_por_dose || 1;
            const novoEstoque = Math.max(0, med.estoque_quantidade - unidadePorDose);
            
            await safeUpdateMedicamento(extra.medicamentoId, {
              estoque_quantidade: novoEstoque,
              estoque_data_referencia: hoje
            } as any);
          }
          
        } else if (actionId === "IGNORAR") {
          // Apenas registra que ignorou, não mexe no estoque
          await safeSetDoseLog({
            user_id: user.id,
            medicamento_id: extra.medicamentoId,
            data: hoje,
            horario: extra.horario,
            ignorado_em: new Date().toISOString(),
          });
        }
      }
    );

    return () => {
      listener.then((l) => l.remove());
    };
  }, [user?.id]);
}
