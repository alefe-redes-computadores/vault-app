// components/VersiculoDia.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import type { Versiculo } from "@/lib/types";

const STORAGE_KEY = "verse-hidden-date";

// Fallback (caso a tabela ainda não tenha sido sincronizada)
const FALLBACK_VERSICULOS: Versiculo[] = [
  { id: "fallback-1", user_id: "", texto: "Não se preocupem com o amanhã, pois o amanhã se preocupará consigo mesmo. Basta a cada dia o seu próprio mal.", referencia: "Mateus 6:34", created_at: "" },
  { id: "fallback-2", user_id: "", texto: "O Senhor é o meu pastor, nada me faltará.", referencia: "Salmos 23:1", created_at: "" },
  { id: "fallback-3", user_id: "", texto: "Tudo posso naquele que me fortalece.", referencia: "Filipenses 4:13", created_at: "" },
  { id: "fallback-4", user_id: "", texto: "O Senhor te guardará de todo mal; ele guardará a tua vida.", referencia: "Salmos 121:7", created_at: "" },
  { id: "fallback-5", user_id: "", texto: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.", referencia: "Isaías 41:10", created_at: "" },
  { id: "fallback-6", user_id: "", texto: "Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo.", referencia: "Salmos 23:4", created_at: "" },
  { id: "fallback-7", user_id: "", texto: "O amor é paciente, é bondoso. O amor não inveja, não se vangloria, não se orgulha.", referencia: "1 Coríntios 13:4", created_at: "" },
  { id: "fallback-8", user_id: "", texto: "Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.", referencia: "Romanos 12:12", created_at: "" },
  { id: "fallback-9", user_id: "", texto: "Porque Deus não nos deu um espírito de medo, mas de poder, de amor e de equilíbrio.", referencia: "2 Timóteo 1:7", created_at: "" },
  { id: "fallback-10", user_id: "", texto: "O Senhor é bom, um refúgio em tempos de angústia. Ele protege os que nele confiam.", referencia: "Naum 1:7", created_at: "" },
];

function getVersiculoDoDia(lista: Versiculo[]): Versiculo {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  // Gera um índice pseudo-aleatório baseado na data
  const hash = dia * 31 + mes * 97 + ano * 1009;
  const index = hash % lista.length;

  return lista[index];
}

// 🔧 FUNÇÃO DE SAUDAÇÃO POR HORÁRIO
function getSaudacao(): { icone: string; mensagem: string } {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return { icone: "🌤️", mensagem: "Tenha um ótimo dia!" };
  }
  if (hora >= 12 && hora < 18) {
    return { icone: "☀️", mensagem: "Tenha uma ótima tarde!" };
  }
  if (hora >= 18 && hora < 23) {
    return { icone: "🌙", mensagem: "Tenha uma ótima noite!" };
  }
  return { icone: "🌙", mensagem: "Tenha uma ótima noite!" };
}

export function VersiculoDia() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Busca os versículos do Dexie
  const versiculosDb = useLiveQuery<Versiculo[]>(
    () => (user ? db.versiculos.where('user_id').equals(user.id).toArray() : Promise.resolve([])),
    [user?.id]
  ) || [];

  // Verifica se o usuário já escondeu o versículo hoje
  useEffect(() => {
    const today = new Date().toDateString();
    const hiddenDate = localStorage.getItem(STORAGE_KEY);
    if (hiddenDate !== today) {
      setIsVisible(true);
    }
    setIsInitialized(true);
  }, []);

  // Seleciona o versículo do dia (do Dexie ou fallback)
  const versiculo = useMemo(() => {
    const lista = versiculosDb.length > 0 ? versiculosDb : FALLBACK_VERSICULOS;
    return getVersiculoDoDia(lista);
  }, [versiculosDb]);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, today);
    
    const saudacao = getSaudacao();
    // Monta a mensagem com quebra de linha manual para melhor legibilidade
    const msg = `${saudacao.icone} "${versiculo.texto.slice(0, 45)}..." Guarde esta palavra no coração. Amanhã você receberá uma nova. ${saudacao.mensagem}`;
    setFeedbackMessage(msg);
    setShowFeedback(true);
    
    // Fecha o feedback após 4 segundos
    setTimeout(() => {
      setShowFeedback(false);
      setIsVisible(false);
    }, 4000);
  };

  const handleCloseFeedback = () => {
    setShowFeedback(false);
    setIsVisible(false);
  };

  if (!isInitialized || !versiculo) return null;

  return (
    <AnimatePresence mode="wait">
      {isVisible ? (
        <motion.div
          key="versiculo"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-5 mb-4 overflow-hidden rounded-[22px] border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-surface/80 to-violet-500/5 p-4 shadow-sm"
        >
          {/* Ícone decorativo */}
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-violet-500/5 blur-xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles size={16} />
            </div>

            <div className="min-w-0 flex-1 pr-2">
              <p className="text-sm italic leading-relaxed text-ink-primary break-words">
                "{versiculo.texto}"
              </p>
              <p className="mt-1 text-xs font-medium text-amber-400/80">
                — {versiculo.referencia}
              </p>
            </div>

            {/* 🔧 BOTÃO X ESTILIZADO */}
            <button
              onClick={handleDismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted/60 transition-all hover:bg-coral/10 hover:text-coral active:scale-95 border border-surface-border/30"
              aria-label="Fechar versículo"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ) : showFeedback ? (
        <motion.div
          key="feedback"
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="mx-5 mb-4 rounded-[22px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-surface/80 to-teal-500/5 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Check size={16} />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-sm font-medium text-ink-primary leading-relaxed break-words">
                {feedbackMessage}
              </p>
            </div>
            <button
              onClick={handleCloseFeedback}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted/60 transition-all hover:bg-surface-raised/80 active:scale-95 border border-surface-border/30"
              aria-label="Fechar feedback"
            >
              <Check size={14} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}