import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Esta linha força a rota a ser dinâmica, evitando erros no build estático
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // Troca o código pela sessão do usuário
    await supabase.auth.exchangeCodeForSession(code)
  }

  // O HTML abaixo fecha o pop-up e avisa o app principal (Providers.tsx)
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="background: #0A0C0F; color: #E8EBEF; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
        <p>Autenticado! Voltando...</p>
        <script>
          // Avisa ao seu Providers.tsx que o login foi um sucesso
          window.opener.postMessage('auth-success', '*');
          // Fecha a janela de pop-up
          window.close();
        </script>
      </body>
    </html>
  `

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}
