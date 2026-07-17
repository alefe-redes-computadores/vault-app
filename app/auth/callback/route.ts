// app/auth/callback/route.ts
export async function GET(request: Request) {
  // Extrai os parâmetros da URL (access_token, etc.)
  const url = new URL(request.url);
  const params = url.searchParams;

  // Monta uma página HTML que:
  // 1. Fecha a janela atual (popup)
  // 2. Envia mensagem 'auth-success' para a página principal (opener)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Autenticando...</title>
        <script>
          // Fecha a janela após 0.5s
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage('auth-success', '*');
            }
            window.close();
          }, 500);
        </script>
      </head>
      <body>
        <p>Autenticação concluída! Feche esta janela.</p>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}