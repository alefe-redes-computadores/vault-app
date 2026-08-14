import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { VALIDADE_RECEITA_DIAS } from "@/lib/health-utils";
import type { TipoReceita } from "@/lib/types";

export function useRenovacaoInteligente(medicamentoId: string, farmaciaId: string, preco: string) {
  const [analisePreco, setAnalisePreco] = useState<{ diff: number; farmaciaAnteriorName?: string } | null>(null);

  useEffect(() => {
    async function verificarHistoricoPreco() {
      if (!medicamentoId || !preco || !farmaciaId) {
        setAnalisePreco(null);
        return;
      }
      try {
        const precoNum = parseFloat(preco.replace(/\./g, "").replace(",", "."));
        const ultimasRenovacoes: any[] = await db.renovacoes
          .where("medicamento_id")
          .equals(medicamentoId)
          .reverse()
          .sortBy("data");

        const anteriorComPreco = ultimasRenovacoes.find((r) => r.preco && r.preco > 0);
        if (anteriorComPreco && anteriorComPreco.preco) {
          const diff = precoNum - anteriorComPreco.preco;
          let farmAntName = "outra farmácia";
          if (anteriorComPreco.farmacia_id) {
            const fObj = await db.farmacias.get(anteriorComPreco.farmacia_id);
            if (fObj) farmAntName = fObj.nome;
          }
          setAnalisePreco({ diff, farmaciaAnteriorName: farmAntName });
        }
      } catch (e) {
        console.error("Erro no radar de economia:", e);
      }
    }
    verificarHistoricoPreco();
  }, [preco, farmaciaId, medicamentoId]);

  const calcularValidadePadrao = (tipoReceita: TipoReceita, dataPrescricaoISO: string) => {
    const dias = VALIDADE_RECEITA_DIAS[tipoReceita] || 30;
    const d = new Date(dataPrescricaoISO);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  return {
    analisePreco,
    calcularValidadePadrao,
  };
}
