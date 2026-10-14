import type { WatchModel } from '@/lib/health-profile/device-catalog';
import { avatarColor } from '@/lib/health-profile/avatar';
export function WatchModelPreview({model,color}:{model:WatchModel;color:string}) {
 const round=model.shape==='round'||model.shape==='ultra',band=model.shape==='band';
 return <div className="flex items-center gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
  <div aria-hidden="true" className="relative flex h-20 w-14 shrink-0 items-center justify-center"><div className="absolute h-20 w-6 rounded-xl" style={{backgroundColor:avatarColor(color)}}/><div className={`relative flex items-center justify-center border-4 border-slate-400 bg-slate-900 shadow-lg ${band?'h-12 w-8 rounded-xl':model.shape==='ultra'?'h-12 w-12 rounded-2xl':round?'h-12 w-12 rounded-full':'h-12 w-10 rounded-xl'}`}><div className={`relative flex h-8 w-8 items-center justify-center bg-slate-950 ${round?'rounded-full':'rounded-lg'}`}><span className="font-mono text-[9px] text-violet-200">09:41</span></div><span className="absolute -right-1 h-2 w-1 rounded bg-orange-400"/></div></div>
  <div className="min-w-0"><p className="text-[10px] text-violet-300">{model.brand}</p><p className="text-sm font-semibold text-ink-primary">{model.name}</p><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Referência visual estilizada · sem conexão automática</p></div>
 </div>;
}
