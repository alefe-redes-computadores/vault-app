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
  isDeleting = false 
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
      <div className="relative flex items-center gap-2">
        <button
          onClick={onClick}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-150 active:scale-90
            ${isActive
              ? "border-ice bg-ice/10 text-ice shadow-lg shadow-ice/10"
              : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary hover:border-surface-border"
            }
          `}
        >
          {person.avatar_url ? (
            <img
              src={person.avatar_url}
              alt={person.name}
              loading="lazy"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <User size={14} />
          )}
          <span className="text-sm font-medium">{person.name}</span>
        </button>
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="p-1 rounded-full hover:bg-surface-border/50 transition-colors duration-150 disabled:opacity-50 active:scale-90"
            title="Remover pessoa"
          >
            <Trash2 size={14} className="text-ink-muted hover:text-coral transition-colors duration-150" />
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