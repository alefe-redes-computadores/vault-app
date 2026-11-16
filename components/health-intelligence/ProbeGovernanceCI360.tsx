"use client";
import { Clock3, ShieldCheck } from "lucide-react";
import type { ActiveProbe, ActiveProbePreferences } from "@/lib/health-intelligence/active-probing/types";
import { buildProbeGovernanceCI360 } from "@/lib/health-intelligence/active-probing/governance-ci360";

/** Só apresenta metadados do ledger existente; NÃO cria perguntas ou respostas. */
export function ProbeGovernanceCI360({userId,personId,preferences,rows}:{
 userId:string;personId:string;preferences:ActiveProbePreferences;rows:readonly ActiveProbe[];
}) {
 const data=buildProbeGovernanceCI360(userId,personId,preferences,rows,new Date().toISOString());
 if(data.state!=="ready")return null;
 const date=data.nextWeeklySlotISO?new Date(data.nextWeeklySlotISO).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):null;
 return <aside aria-label="Limites e histórico das perguntas voluntárias" className="mt-2 rounded-xl border border-violet-300/20 bg-violet-300/[.035] px-3 py-2.5">
   <div className="flex items-center gap-2 text-[11px] font-semibold text-violet-200"><ShieldCheck size={14} aria-hidden="true"/>Perguntas voluntárias · controle ativo</div>
   <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{data.sevenDayCreated}/2 nova(s) em sete dias · {data.answered} respondida(s) · {data.snoozed} adiada(s). Cada pessoa tem seu próprio histórico.</p>
   {data.quietHours&&<p className="mt-1 flex items-center gap-1 text-[10px] text-ink-muted"><Clock3 size={12}/>Horário de silêncio 22h–8h: nenhuma pergunta nova exibida; as já mostradas permanecem acessíveis.</p>}
   {date&&<p className="mt-1 text-[10px] text-ink-muted">Próxima janela possível para nova pergunta: {date}. Isso não agenda pergunta automaticamente.</p>}
   {data.pendingSync>0&&<p className="mt-1 text-[10px] text-amber-200">{data.pendingSync} evento(s) do ledger aguardando confirmação de sincronização.</p>}
   <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">O limite é aplicado pelo ledger original. Resposta voluntária não é diagnóstico nem muda receita ou estoque.</p>
 </aside>;
}
