'use client'
import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export function useAuthDeepLink() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listener = App.addListener('appUrlOpen', async ({ url }) => {
      if (!url.includes('callback')) return

      setIsProcessing(true)
      await Browser.close().catch(() => {})

      try {
        const urlObj = new URL(url)

        // --- Fluxo PKCE (?code=...) ---
        const code = urlObj.searchParams.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('Erro no exchangeCodeForSession:', error.message)
            setIsProcessing(false)
            router.replace(`/login?error=${encodeURIComponent(error.message)}`)
            return
          }

          if (data?.session) {
            setIsProcessing(false)
            router.replace('/') 
            return
          }
        }

        // --- Fallback: fluxo implícito (#access_token=...) ---
        const rawHash = urlObj.hash?.startsWith('#') ? urlObj.hash.substring(1) : urlObj.hash
        if (rawHash) {
          const hashParams = new URLSearchParams(rawHash)
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            })

            if (error) {
              console.error('Erro no setSession:', error.message)
              setIsProcessing(false)
              router.replace(`/login?error=${encodeURIComponent(error.message)}`)
              return
            }

            if (data?.session) {
              setIsProcessing(false)
              router.replace('/')
              return
            }
          }
        }

        const errorParam = urlObj.searchParams.get('error_description') || urlObj.searchParams.get('error')
        setIsProcessing(false)
        router.replace(`/login${errorParam ? `?error=${encodeURIComponent(errorParam)}` : ''}`)
      } catch (err) {
        setIsProcessing(false)
        router.replace('/login?error=callback_parse_failed')
      }
    })

    return () => {
      listener.then(handle => handle.remove()).catch(() => {})
    }
  }, [router])

  return { isProcessing }
}
