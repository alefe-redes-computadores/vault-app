# VAULT M115 — Continuidade e acesso, macrocirurgia segura

**BASE BLOQUEADA:** `e16f31a555b4a7cac1f40bb81c3142705a4d5c3d` (M114C). Não reaplica M114A/B/C.

## Incluído

- Horário de silêncio voluntário apenas para lembretes personalizados de saúde; política local no aparelho. Doses e alertas clínicos existentes não mudam de política. Recorrências na janela são omitidas, não remarcadas.
- Canal nativo separado e oculto da tela bloqueada para check-ins emocionais voluntários; texto do título/corpo permanece neutro. Validação Android físico obrigatória porque canais preexistentes e ajustes do SO variam.
- Cobertura de humor já registrado (30 dias), conta+pessoa, no centro de lembretes, mediante opção local. Ausência de registro é desconhecimento, nunca estado emocional. Configurar cria lembrete só por gesto posterior do usuário.
- Anotações administrativas voluntárias por ciclo de fornecimento: horário informado, fonte e documentos. Não é regra oficial do SUS, não sincroniza entre aparelhos e não gera alerta automático nem estoque.
- Resumo clínico de consulta já existente passa a exigir seleção explícita das categorias; cópia prévia local. Diário e plano pessoal nunca entram nessa seleção.
- Backup cifrado manual para diário/plano previamente protegidos; exportação via área de transferência e importação local com validação criptográfica e formato, sem sobrescrever dados existentes. O mesmo segredo e escopo usuário+pessoa são indispensáveis; esquecimento da frase não tem recuperação.
- Roteiro opcional "O que me ajudou" no diário, sem salvamento implícito, análise de texto ou sugestão causal.

## Não prometer como concluído

- *Avisos únicos com base em datas-limite SUS* e *sincronização das janelas* exigem contrato persistente/autoridade. Aqui a anotação é estritamente local, sem SMS/WhatsApp automáticos.
- *Abertura exata da linha fonte do Brain para correção e recálculo auditado* exige mapear cada tipo de evidência; botão de contexto antigo continua disponível, não modificado.
- *Comparações quantitativas antes/depois de atividades* não são inferidas a partir de notas livres.
- *Testes em aparelho* (Capacitor, telas bloqueadas, cold start, PWA, permissões, arquivo backup, biometria) não são substituídos por contrato sintético.
- *Criptografia opt-in*: planilha/diário sem opção ativada seguem armazenamento local aberto; este pacote NÃO ativa criptografia sem consentimento.

## Segurança e aceite

- Nenhuma migração de Supabase, nenhum novo ledger Brain, nenhuma alteração em doses ou receitas, nenhum envio de contato.
- Gate: status inicial limpo, HEAD local/remoto fixados, SHA de blobs dos arquivos existentes, ZIP SHA256, backup seletivo, gate TS, testes M115, gate release, e publicação separada após validação.
- Persistência de backup cifrado: salvar cópia fora da área de transferência e testar recuperação em perfil sem dados; sem chave a cópia é inutilizável. Não usar dados clínicos reais no primeiro teste.
- Datas/horários de atendimento e check-ins não determinam adesão, gravidade ou risco individual; casos urgentes requerem assistência humana.

## R2 — Correção M51/M11
O resumo seletivo agora aceita dossiês parciais renderizados em regressões legadas, sem supor a presença de tratamento ou outras relações opcionais. O teste M115 executa a função com dados parciais, sem enfraquecer testes existentes. A base permanece M114C e a aplicação anterior, já revertida, não deve ser reutilizada.
