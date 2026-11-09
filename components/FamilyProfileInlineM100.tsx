"use client";
import { useEffect, useState } from "react";
import { UsersRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  EMPTY_FAMILY_PROFILE_M100, FAMILY_RELATIONS_M100, FAMILY_ROUTINES_M100,
  getFamilyProfileM100, setFamilyProfileM100, familyRelationLabelM100,
  VAULT_FAMILY_PROFILE_EVENT_M100, type LocalFamilyProfileM100,
} from "@/lib/family/local-profile-m100";

/** UX local por pessoa, sem alterar Person/DB, RLS, doses ou conceder acesso externo. */
export function FamilyProfileInlineM100({ personId }: { personId: string }) {
  const { user } = useAuth();
  const [value, setValue] = useState<LocalFamilyProfileM100>(EMPTY_FAMILY_PROFILE_M100);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const update = () => setValue(getFamilyProfileM100(user?.id ?? "", personId));
    update();
    window.addEventListener(VAULT_FAMILY_PROFILE_EVENT_M100, update);
    return () => window.removeEventListener(VAULT_FAMILY_PROFILE_EVENT_M100, update);
  }, [user?.id, personId]);
  const save = (update: Partial<LocalFamilyProfileM100>) => {
    if (!user?.id || !personId) return;
    const next = { ...value, ...update };
    const success = setFamilyProfileM100(user.id, personId, next);
    setNotice(success ? "Relação salva apenas neste dispositivo." : "Não foi possível salvar neste dispositivo.");
    if (success) setValue(next);
  };
  return (
    <details className="mt-3 rounded-xl border border-surface-border/60 bg-surface-raised/40" onClick={event => event.stopPropagation()}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-2"><UsersRound size={14} aria-hidden="true"/> Relação familiar · {familyRelationLabelM100(value.relation)}</span>
        <span className="text-[10px] text-ice">Editar</span>
      </summary>
      <div className="space-y-3 border-t border-surface-border/60 p-3">
        <fieldset disabled={!user?.id} className="min-w-0">
          <legend className="text-[11px] font-medium text-ink-muted">Relação com esta pessoa</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FAMILY_RELATIONS_M100.map(item => (
              <label key={item.value} className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] leading-snug ${value.relation === item.value ? "border-ice/40 bg-ice/10 text-ink-primary" : "border-surface-border bg-surface text-ink-muted"}`}>
                <input type="radio" name={`vault-m100-relation-${personId}`} value={item.value} checked={value.relation === item.value}
                  onChange={() => save({ relation: item.value })} className="h-4 w-4 shrink-0 accent-ice"/>
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={!user?.id} className="min-w-0">
          <legend className="text-[11px] font-medium text-ink-muted">Como organizo esta rotina</legend>
          <div className="mt-2 grid gap-2">
            {FAMILY_ROUTINES_M100.map(item => (
              <label key={item.value} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] leading-snug ${value.routine === item.value ? "border-ice/40 bg-ice/10 text-ink-primary" : "border-surface-border bg-surface text-ink-muted"}`}>
                <input type="radio" name={`vault-m100-routine-${personId}`} value={item.value} checked={value.routine === item.value}
                  onChange={() => save({ routine: item.value })} className="h-4 w-4 shrink-0 accent-ice"/>
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="flex items-start gap-2 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-ice"/> Classificação apenas neste aparelho. Não concede guarda legal, acesso remoto, permissão de compartilhar exames ou autorização para marcar doses por outra conta.</p>
        {notice && <p role="status" className="text-[10px] text-ice">{notice}</p>}
      </div>
    </details>
  );
}
