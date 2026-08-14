"use client";

import { useState } from "react";
import { Loader2, Plus, X, Activity, Brain, ShieldAlert, HeartPulse, Flame } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddTratamento } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  personId: string;
}

export function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

export function SeletorTratamentoModal({ isOpen, onClose, selectedIds, onChange, personId }: Props) {
  const { user } = useAuth();
  const { trigger } = useHapticFeedback();
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    trigger("vibrate");
    try {
      const id = await safeAddTratamento({
        user_id: user?.id || "",
        person_id: personId,
        nome: newName.trim(),
        status: "ativo",
      });
      onChange([...selectedIds, id]);
      trigger("success");
      setIsCreating(false);
      setNewName("");
    } catch (error) {
      trigger("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Tratamentos vinculados">
      <div className="space-y-4 p-4">
        {isCreating ? (
          <div className="space-y-3">
            <Input
              label="Nome do tratamento / CID"
              placeholder="Ex: TDAH"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setIsCreating(false); setNewName(""); }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-sm font-semibold text-ink-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Criar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tratamentos.length > 0 ? (
                tratamentos.map((tratamento: any) => {
                  const selected = selectedIds.includes(tratamento.id);
                  const IconComp = getTratamentoIcon(tratamento.nome);
                  return (
                    <button
                      type="button"
                      key={tratamento.id}
                      onClick={() => {
                        trigger("vibrate");
                        onChange(selected ? selectedIds.filter((id) => id !== tratamento.id) : [...selectedIds, tratamento.id]);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${selected ? "border-violet-400/30 bg-violet-400/10" : "border-surface-border/40 bg-surface-raised"}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-violet-400/15 text-violet-300" : "bg-surface text-ink-muted"}`}>
                        <IconComp size={16} />
                      </div>
                      <span className={`flex-1 text-sm font-medium ${selected ? "text-violet-200" : "text-ink-primary"}`}>{tratamento.nome}</span>
                      {selected && <span className="text-xs font-semibold text-violet-300">Selecionado</span>}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-4 text-center">
                  <p className="text-sm text-ink-muted">Nenhum tratamento cadastrado.</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setIsCreating(true); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-sm font-semibold text-violet-300"
            >
              <Plus size={16} /> Criar novo tratamento
            </button>
            <button
              type="button"
              onClick={() => { trigger("vibrate"); onClose(); }}
              className="w-full rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void"
            >
              Concluir
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
