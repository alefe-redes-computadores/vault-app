"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Settings, Cpu, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const frasesEngracadas = [
  "Acordando nossos engenheiros de software...",
  "Girando as manivelas dos servidores na nuvem...",
  "Alimentando os hamsters que giram a roda do banco de dados...",
  "Calculando a rota de fuga caso algo dê errado...",
  "Quase lá! Passando um café para o sistema..."
];

export default function AuthCallbackPage() {
  const router = useRouter();
  const [mensagemIndex, setMensagemIndex] = useState(0);

  // Efeito para trocar a frase a cada 1.5 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setMensagemIndex((atual) => (atual + 1) % frasesEngracadas.length);
    }, 1500);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const handleAuth = async () => {
      const { data } = await supabase.auth.getSession();
      
      const redirecionar = () => {
        // Um pequeno delay extra só para garantir que o usuário leia a piada final
        setTimeout(() => {
          router.replace("/");
        }, 1200); 
      };

      if (data?.session) {
        redirecionar();
      } else {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' || session) {
            redirecionar();
          }
        });
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      
      {/* Container da Animação Principal */}
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        {/* Círculos pulsantes de fundo */}
        <div className="absolute inset-0 bg-ice/10 rounded-full animate-ping opacity-75" />
        <div className="absolute inset-2 bg-ice/20 rounded-full animate-pulse" />
        
        {/* Ícone do Servidor com Engrenagem girando */}
        <div className="relative z-10 bg-surface-raised p-4 rounded-2xl shadow-xl border border-surface-border">
          <div className="relative">
            <Server size={40} className="text-ice" />
            <Settings 
              size={20} 
              className="text-ink-muted absolute -bottom-2 -right-2 animate-spin" 
            />
          </div>
        </div>
        
        {/* Partículas flutuantes (Ícones) */}
        <Cpu size={16} className="text-ink-muted absolute top-0 left-0 animate-bounce" />
        <Zap size={16} className="text-ice absolute bottom-0 right-0 animate-bounce delay-150" />
      </div>

      {/* Textos */}
      <h1 className="text-2xl font-display font-semibold text-ink-primary mb-2">
        Conectando...
      </h1>
      
      <div className="h-12 flex items-center justify-center w-full max-w-xs">
        <p 
          key={mensagemIndex} 
          className="text-sm font-medium text-ink-muted animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {frasesEngracadas[mensagemIndex]}
        </p>
      </div>
      
    </div>
  );
}
