# VAULT M153 P2 — RLS versionada + confirmação de lote verificável

**Base exata:** `64b2e2d611c0cadece493d36c45d8b4327e90957` — M153 P1.
**Natureza:** registro do banco já migrado e correção de UX/idempotência local para o canário desligado. Sem nova alteração de dados do Supabase pelo pacote.

## Banco de produção — evidência de 15/11/2026
- Projeto Supabase: `vault-app`; migração `20261115130748_vault_m153_p2_probe_responses_rls_owner_link` aplicada via MCP e registrada.
- Tabelas de sondagens: 0 perguntas e 0 respostas antes da correção; sem migração de linhas clínicas.
- Política de respostas: leitura e gravação exigem owner autenticado, pessoa de owner e vínculo com `brain_active_probes` da mesma pessoa.
- `q.person_id=q.person_id` removido da policy ativa; inspeção pg_policies satisfatória. Faltam testes reais autenticados positivos/negativos com contas/pessoas autorizadas.
- Arquivo de migração incluído aqui para **alinhar histórico do repositório** ao mesmo número já implantado. NÃO rodar SQL novamente no banco de produção.

## App / Brain
- O botão 'Comecei este lote' só aparece quando a flag da compilação e o consentimento para fabricantes daquela pessoa estiverem ativos.
- O ID de evento é estável pela aquisição, prevenindo nova sondagem apenas porque passou um dia.
- A confirmação visual aparece somente depois de consultar a persistência local. Sem registro, exibe mensagem de erro em vez de afirmar sucesso.
- Nenhuma movimentação de estoque, nova aquisição, dose ou receita. A sincronização remota continua sob as regras da M153 P1.
- **O Brain permanece OFF por padrão.** Não alterar `NEXT_PUBLIC_BRAIN_ACTIVE_PROBING` como parte deste release.

## Gates e próximos passos
- Nova suíte M153 P2 integrada ao V63; rodar V63+V70+tsc --noEmit completos no Termux.
- Fast Lane: branch candidata, GitHub/Vercel READY, promoção protegida; homologação APK separada.
- Canário somente após validação das políticas sob JWT de usuários distintos, fluxo offline/online e consentimento revogado; não fabricar eventos clínicos reais para testar.
- Segurança transversal: Supabase Security Advisor ainda aponta warnings preexistentes de funções SECURITY DEFINER, extensão pg_trgm e proteção contra senhas vazadas; auditar por escopo, não mudar cegamente sem analisar dependências.
