// components/PersonSelector.tsx
"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Users, User } from "lucide-react";
import { db } from "@/lib/db";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";

interface PersonSelectorProps {
  className?: string;
}

export function PersonSelector({ className = "" }: PersonSelectorProps) {
  const { trigger } = useHapticFeedback();
  const { activePersonId, changePerson } = useActivePersonId();
  const [isOpen, setIsOpen] = useState(false);

  const persons = useLiveQuery(
    () => db.persons.toArray(),
    [],
    []
  );

  const activePerson = persons.find((p) => p.id === activePersonId);

  const handleSelect = async (personId: string) => {
    trigger("vibrate");
    await changePerson(personId);
    setIsOpen(false);
  };

  if (persons.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => {
          trigger("vibrate");
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 transition-all hover:border-ice/30 active:scale-95"
        style={{
          borderColor: activePerson?.color ? `${activePerson.color}60` : undefined,
        }}
      >
        {activePerson?.avatar_url ? (
          <img
            src={activePerson.avatar_url}
            alt={activePerson.name}
            className="h-7 w-7 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: activePerson?.color || "#38BDF8" }}
          >
            {activePerson?.name?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <span className="text-sm font-medium text-ink-primary max-w-[100px] truncate">
          {activePerson?.name || "Selecionar"}
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-[70] min-w-[220px] overflow-hidden rounded-2xl border border-surface-border/60 bg-surface shadow-2xl"
            >
              <div className="px-3 pb-2 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint flex items-center gap-1">
                  <Users size={12} className="inline" />
                  Pessoas
                </p>
              </div>
              <div className="px-1.5 pb-2 max-h-[300px] overflow-y-auto">
                {persons.map((person) => {
                  const isActive = activePersonId === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => handleSelect(person.id!)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                    >
                      {person.avatar_url ? (
                        <img
                          src={person.avatar_url}
                          alt={person.name}
                          className="h-9 w-9 rounded-full object-cover border border-surface-border/50"
                        />
                      ) : (
                        <div
                          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: person.color || "#38BDF8" }}
                        >
                          {person.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-primary">
                          {person.name}
                        </span>
                        {person.email && (
                          <span className="block truncate text-xs text-ink-muted">
                            {person.email}
                          </span>
                        )}
                      </div>
                      {isActive && <Check size={16} className="text-ice shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
