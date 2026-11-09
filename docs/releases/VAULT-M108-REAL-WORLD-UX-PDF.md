# VAULT M108 — Correcoes da experiencia real no Android

Base: M107, SHA `9bb53009c0b4865a3b6964e3eed09e8c3ecd762f`.

## Escopo

- Restauracao visual do indicador de progresso para o ritmo M105, sem alterar as contagens.
- Altura-base dos cards compactos e estado explicito quando o principio ativo nao esta confirmado pela referencia armazenada. Isso **nao** inventa principio ativo nem garante que o catalogo remoto reconheca todos os cadastros.
- Home: resumo de acompanhamento ja conferido recolhido; aviso ainda nao conferido continua legivel. Outras prioridades fora da borda do card principal, mantendo acesso.
- Central de notificacoes: resumo leve, so para preferencias e lembretes. Atualizacoes continuam na aba Mais, nao aqui.
- Mais: guia introdutorio reduzido e com outra identidade cromatica.
- PDF do Cofre Pessoal: resumo dos registros realmente carregados pela listagem, sem depender de captura HTML; **nao incorpora anexos nem substitui documentos originais**. Share Android passa URI como arquivo, nao URL textual. Exportacao de cards em outras areas preservada.

## Homologacao manual obrigatoria

1. Cofre pessoal: exportar lista com 1 documento e modo grade; abrir chooser Android; conferir um PDF gerado que nao contenha anexos. Repetir offline e em PWA. Se chooser falhar, registrar o erro sem imprimir documentos pessoais.
2. Medicamentos: abrir 2, 10 e mais cards, comparar altura de cards com e sem alerta, tratamento, SOS, estoque e doses. Verificar ingredientes com referencia confirmada; para um medicamento sem referencia, revisar catalogo sem atribuir farmaco por aproximacao.
3. Home: com aviso clinico nao conferido, aviso conferido, duas retiradas atrasadas e nenhuma prioridade; verificar que atalho e ressalvas continuam. Rolagem e status bar edge-to-edge em Android.
4. Central: validar categorias automaticas, preferencias, lembrete pessoal, permissao Android, proxima dose e pausa. Atualizacoes permanecem em Mais.
5. APK/PWA: conferir biometria, sync offline, outra pessoa, retorno, alerta SOS e abertura via notificação. Build aprovado nao substitui testes.

Nao altera Supabase, dados, migracoes, calculos de doses, estoque, tratamentos, notificacoes agendadas ou politica clinica.
