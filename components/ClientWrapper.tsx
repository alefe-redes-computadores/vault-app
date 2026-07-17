'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '@/lib/supabase' // Certifique-se que seu supabase client está aqui

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // 🟢 OUVINTE DE DEEP LINK (O PULO DO GATO)
    const setupListener = async () => {
      await App.addListener('appUrlOpen', async (data: any) => {
        // Se a URL contém o protocolo 'vault://' ou 'callback'
        if (data.url.includes('callback')) {
          await Browser.close() // Fecha o Chrome sobreposto

          const hash = data.url.split('#')[1]
          if (hash) {
            const params = new URLSearchParams(hash)
            const access_token = params.get('access_token')
            const refresh_token = params.get('refresh_token')

            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token })
              router.replace('/home')
            }
          }
        }
      })
    }
    setupListener()
  }, [router])

  return <>{children}</>
}
