import type { RegistroSaude } from "@/lib/types";
import type { HealthMetric } from "@/lib/health-profile/types";

/** Miniatura de valores observados, sem interpolar dias ausentes. */
export function HealthMetricTrend({ records, type }: { records: RegistroSaude[]; type: HealthMetric }) {
  const rows=records.filter(r=>r.tipo===type).filter(r=>{
    const v=type==="sono"?r.duracao_minutos:r.valor_numerico;
    return typeof v==="number" && Number.isFinite(v);
  }).slice(0,7).reverse();
  if(rows.length<2)return null;
  const values=rows.map(r=>(type==="sono"?r.duracao_minutos:r.valor_numerico)!);
  const min=Math.min(...values),max=Math.max(...values),range=max-min || 1;
  const points=values.map((v,i)=>({x:6+i*108/(values.length-1),y:26-(v-min)/range*20}));
  return <div className="mt-3 border-t border-surface-border/50 pt-2">
    <svg viewBox="0 0 120 32" className="h-8 w-full" role="img" aria-label={`${rows.length} registros recentes; mínimo ${min}, máximo ${max}. Pontos em ordem de registro, sem estimar dias ausentes.`}>
      <polyline points={points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".55"/>
      {points.map((p,i)=><circle key={rows[i].id || i} cx={p.x} cy={p.y} r="2.3" fill="currentColor"><title>{`${rows[i].data}: ${values[i]}`}</title></circle>)}
    </svg>
    <p className="text-[9px] text-ink-muted">Últimos {rows.length} registros</p>
  </div>;
}
