"use client";
import { BadgeCheck, UsersRound, createLucideIcon } from "lucide-react";
import { HealthRelationPicker } from "@/components/saude/HealthRelationPicker";

/**
 * Ícone oficial Lucide `id-card` (introduzido no Lucide 0.418.0),
 * incluído com createLucideIcon para manter o lockfile 0.417.x do VAULT.
 * A fonte vetorial e o comportamento de tamanho/cor/stroke são do Lucide;
 * não é um SVG inventado, ícone bancário nem biblioteca paralela.
 * https://lucide.dev/icons/id-card (licença ISC)
 */
const IdCard = createLucideIcon("id-card", [
  ["path", { d: "M16 10h2", key: "id-card-line-1" }],
  ["path", { d: "M16 14h2", key: "id-card-line-2" }],
  ["path", { d: "M6.17 15a3 3 0 0 1 5.66 0", key: "id-card-person" }],
  ["circle", { cx: "9", cy: "11", r: "2", key: "id-card-avatar" }],
  ["rect", { x: "2", y: "5", width: "20", height: "14", rx: "2", key: "id-card-frame" }],
]);

export const A1_PROFESSIONAL_CATEGORIES = [
  ["medicina","Medicina"],["fisioterapia","Fisioterapia"],["terapia_ocupacional","Terapia ocupacional"],
  ["psicologia","Psicologia"],["nutricao","Nutrição"],["enfermagem","Enfermagem"],
  ["fonoaudiologia","Fonoaudiologia"],["odontologia","Odontologia"],["educacao_fisica","Educação física"],["outras","Outra atuação"]
] as const;
export type A1ProfessionalCategory = typeof A1_PROFESSIONAL_CATEGORIES[number][0];
export const A1_BOARDS = ["CRM","CREFITO","CRP","CRN","COREN","CRFa","CRO","CREF","Outro"] as const;
export function professionalCategoryLabel(category?:string|null):string {
  return A1_PROFESSIONAL_CATEGORIES.find(x=>x[0]===category)?.[1]||"Atuação não classificada";
}
const inputClass="min-h-11 w-full rounded-xl border border-surface-border/60 bg-surface-raised px-3 py-2.5 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-sky-400/65";
export function ProfessionalClassificationA1({category,onCategory,board,onBoard,number,onNumber,uf,onUf}:{
  category:A1ProfessionalCategory|"";onCategory:(v:A1ProfessionalCategory|"")=>void;board:string;onBoard:(v:string)=>void;
  number:string;onNumber:(v:string)=>void;uf:string;onUf:(v:string)=>void;
}){
  return <section aria-label="Identificação profissional" className="space-y-3 rounded-2xl border border-sky-400/20 bg-sky-400/[.035] p-3">
    <div className="flex items-start gap-2"><UsersRound size={18} className="mt-0.5 shrink-0 text-sky-300"/><div><p className="text-sm font-semibold text-ink-primary">Atuação profissional</p><p className="mt-0.5 text-xs leading-relaxed text-ink-muted">A mesma pessoa pode atuar em consultas, hospitais e reabilitação. Conselho não é obrigatório.</p></div></div>
    <div className="min-w-0 text-xs font-medium text-ink-muted">
      <span>Categoria</span>
      <HealthRelationPicker title="Categoria profissional" value={category} onValueChange={x=>onCategory(x as A1ProfessionalCategory|"")} kind="status" className={inputClass+" mt-1"}>
        <option value="">Não informado (cadastro legado)</option>
        {A1_PROFESSIONAL_CATEGORIES.map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </HealthRelationPicker>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="min-w-0 text-xs font-medium text-ink-muted"><span className="inline-flex items-center gap-1"><BadgeCheck size={13}/> Conselho</span>
        <HealthRelationPicker title="Conselho profissional" value={board} onValueChange={onBoard} kind="status" className={inputClass+" mt-1"}><option value="">Não informado</option>{A1_BOARDS.map(s=><option key={s} value={s}>{s}</option>)}</HealthRelationPicker>
      </div>
      <label className="block text-xs font-medium text-ink-muted"><span className="inline-flex items-center gap-1"><IdCard size={13} aria-hidden="true"/> Registro</span>
        <input value={number} maxLength={40} onChange={e=>onNumber(e.target.value)} className={inputClass+" mt-1"} placeholder="Se conhecido"/>
      </label>
      <label className="block text-xs font-medium text-ink-muted">UF do registro
        <input value={uf} maxLength={2} onChange={e=>onUf(e.target.value.replace(/[^A-Za-z]/g,"").toUpperCase())} className={inputClass+" mt-1"} placeholder="MG"/>
      </label>
    </div>
    <p className="text-[11px] leading-relaxed text-ink-muted">Esses campos identificam a informação declarada. O VAULT não valida habilitação profissional automaticamente.</p>
  </section>;
}
