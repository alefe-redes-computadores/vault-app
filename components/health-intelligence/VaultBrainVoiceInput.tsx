"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, ShieldAlert, X } from "lucide-react";
import {
  browserSupportsVaultSpeech,
  createVaultSpeechRecognition,
  normalizeSpeechCommand,
  type VaultSpeechRecognition,
} from "@/lib/health-intelligence/voice-recognition";

/**
 * M46: voz exclusivamente opcional. Não inicia na montagem, não salva áudio,
 * não persiste transcrição, não navega e nunca escreve dados clínicos.
 * O usuário aceita o aviso sobre processamento de terceiros antes de cada uso.
 */
export function VaultBrainVoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<VaultSpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(browserSupportsVaultSpeech());
    return () => {
      const active = recognitionRef.current;
      recognitionRef.current = null;
      if (active) {
        active.onresult = null;
        active.onerror = null;
        active.onend = null;
        try { active.abort(); } catch { /* Navegador já encerrou. */ }
      }
    };
  }, []);

  function stop() {
    const active = recognitionRef.current;
    recognitionRef.current = null;
    if (active) {
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      try { active.abort(); } catch { /* Já encerrado. */ }
    }
    setListening(false);
  }

  function startWithConsent() {
    setConsentOpen(false);
    setMessage("");
    const recognition = createVaultSpeechRecognition();
    if (!recognition) {
      setMessage("Reconhecimento de voz indisponível neste navegador. Use a busca digitada.");
      return;
    }
    stop();
    recognitionRef.current = recognition;
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      const text = normalizeSpeechCommand(event.results?.[0]?.[0]?.transcript ?? "");
      stop();
      if (text) onTranscript(text);
      else setMessage("Não consegui entender a fala. Você pode digitar o comando.");
    };
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition) return;
      stop();
      setMessage(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microfone não autorizado. Você pode continuar digitando."
        : "A captura de voz não foi concluída. Tente digitar o comando.");
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
    };
    try {
      recognition.start();
      setListening(true);
    } catch {
      stop();
      setMessage("Não foi possível ativar o microfone. Use a busca digitada.");
    }
  }

  if (!supported) return null;
  return <>
    <button type="button" onClick={() => {
      setMessage("");
      if (listening) stop();
      else setConsentOpen(true);
    }}
      aria-label={listening ? "Parar escuta" : "Usar comando de voz"}
      aria-pressed={listening}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${listening ? "border-rose-300/50 bg-rose-400/10 text-rose-200" : "border-surface-border/70 bg-surface text-violet-200"}`}>
      {listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
    </button>
    {listening && <p role="status" className="w-full basis-full px-2 pb-1 text-xs text-violet-200">Microfone ativo. Fale o comando ou toque para parar.</p>}
    {message && <p role="status" className="w-full basis-full px-2 pb-1 text-xs text-ink-muted">{message}</p>}
    {consentOpen && <div className="w-full basis-full mb-1 rounded-2xl border border-amber-300/30 bg-amber-300/[.06] p-3" role="group" aria-label="Permissão de voz">
      <div className="flex items-start gap-2">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-primary">Antes de ativar o microfone</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">O reconhecimento de fala do navegador pode enviar áudio ao fornecedor para processamento. Evite ditar informações sensíveis se não concordar. O VAULT não grava nem armazena o áudio ou o texto ditado em seu histórico; a transcrição aparece apenas na busca para sua revisão.</p>
        </div>
        <button type="button" onClick={() => setConsentOpen(false)} aria-label="Cancelar comando de voz" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><X size={16}/></button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => setConsentOpen(false)} className="min-h-11 rounded-xl border border-surface-border/70 px-3 text-xs text-ink-secondary">Agora não</button>
        <button type="button" onClick={startWithConsent} className="min-h-11 rounded-xl bg-violet-300 px-3 text-xs font-semibold text-slate-950">Ativar microfone</button>
      </div>
    </div>}
  </>;
}
