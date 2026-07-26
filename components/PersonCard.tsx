"use client";

import { useState, memo } from "react";
import type { Person } from "@/lib/types";
import { User, Trash2 } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { ConfirmationModal } from "./ConfirmationModal";

interface PersonCardProps {
  person: Person;
  isActive: boolean;
  onClick: () => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function PersonCardComponent({
  person,
  isActive,
  onClick,
  onDelete,
  isDeleting = false,
}: PersonCardProps) {
  const { trigger } = useHapticFeedback();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!person.id) return;
    trigger("vibrate");
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!person.id) return;
    onDelete?.(person.id);
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className="relative flex items-center gap-1.5">
        <button
          onClick={onClick}
          className={`group relative flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-200 active:scale-95 ${
            isActive
              ? "border-transparent bg-ice/12 text-ice shadow-[0_0_0_1.5px_rgba(47,227,201,0.55),0_8px_20px_-8px_rgba(47,227,201,0.35)]"
              : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-surface-border hover:text-ink-primary"
          }`}
        >
          {person.avatar_url ? (
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                isActive ? "ring-gradient p-[1.5px]" : ""
              }`}
            >
              <img
                src={person.avatar_url}
                alt={person.name}
                loading="lazy"
                className="h-full w-full rounded-full border border-white/5 object-cover"
              />
            </span>
          ) : (
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                isActive ? "ring-gradient text-void" : "bg-surface"
              }`}
            >
              <User size={13} />
            </div>
          )}

          <span className="whitespace-nowrap text-sm font-medium">
            {person.name}
          </span>
        </button>

        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            title="Remover pessoa"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-all duration-150 active:scale-95 hover:bg-surface-border/50 hover:text-coral disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Remover pessoa"
        message={`Tem certeza que deseja remover "${person.name}"? Todos os documentos vinculados também serão removidos.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        type="danger"
      />
    </>
  );
}

export const PersonCard = memo(PersonCardComponent);
