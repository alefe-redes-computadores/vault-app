'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Server, Settings, Cpu, Zap, AlertCircle } from 'lucide-react'

const frasesEngracadas = [
  "Acordando nossos engenheiros de software...",
  "Girando as manivelas dos servidores na nuvem...",
  "Alimentando os hamsters que giram a roda do banco de dados...",
  "Calculando a rota de fuga caso algo dê errado...",
  "Quase lá! Passando um café para o sistema..."
]

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mensagemIndex, setMensagemIndex] = useState(0)

  useEffect(() => {
    const intervalo = setInterval(() => {
      setMensagemIndex((atual) => (atual + 1) % frasesEngracadas.length)
    }, 1500)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    let isRedirecting = false
    const redirecionar = () => {
      if (isRedirecting) return
      isRedirecting = true
      setTimeout(() => router.replace('/'), 1200) // Vai para a raiz do Vault
    }

    const handleAuth = async () => {
      const { data: existing } = await supabase.auth.getSession()
      if (existing?.session) {
        redirecionar()
        return
      }

      const code = searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorMsg(error.message)
          return
        }
        if (data?.session) {
          redirecionar()
          return
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) redirecionar()
      })
      return () => subscription.unsubscribe()
    }

    handleAuth()
  }, [router, searchParams])

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-white">Falha ao conectar</h1>
        <p className="text-red-500 mt-2">{errorMsg}</p>
        <button onClick={() => router.replace('/login')} className="mt-6 px-6 py-2 bg-ice text-void font-bold rounded-full">Tentar novamente</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-ice/10 rounded-full animate-ping opacity-75" />
        <div className="absolute inset-2 bg-ice/20 rounded-full animate-pulse" />
        
        <div className="relative z-10 bg-surface-raised p-4 rounded-2xl shadow-xl border border-surface-border">
          <div className="relative">
            <Server size={40} className="text-ice" />
            <Settings size={20} className="text-ink-muted absolute -bottom-2 -right-2 animate-spin" />
          </div>
        </div>
        
        <Cpu size={16} className="text-ink-muted absolute top-0 left-0 animate-bounce" />
        <Zap size={16} className="text-ice absolute bottom-0 right-0 animate-bounce delay-150" />
      </div>

      <h1 className="text-2xl font-display font-semibold text-ink-primary mb-2">Conectando...</h1>
      <div className="h-12 flex items-center justify-center w-full max-w-xs">
        <p className="text-sm font-medium text-ink-muted animate-in fade-in slide-in-from-bottom-2 duration-500">
          {frasesEngracadas[mensagemIndex]}
        </p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-void flex flex-col items-center justify-center">
         <h1 className="text-xl font-bold text-ink-primary">Preparando sistema...</h1>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
