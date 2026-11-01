# VAULT M1 — Auditoria estrutural e mudança controlada

## Base auditada
`main` após P15 R9 R10 R3, com contratos V45, V49 e V229 em execução.

| Página | Antes (linhas) | Antes (caracteres) | Prioridade |
|---|---:|---:|---|
| Home `app/page.tsx` | 3.230 | 95.049 | Alta — JSX oculto + arrays não utilizados |
| Hoje `app/hoje/page.tsx` | 4.601 | 167.596 | Alta — lembretes e doses na mesma página |
| Detalhes `app/saude/medicamentos/detalhes/page.tsx` | 3.985 | 110.617 | Alta — depende de muitas autoridades clínicas |
| Avatar 3D | 717 | 74.218 | Moderada — orçamento de GPU, olhos e luz protegidos |

## Achados e intervenção
- Home montava cinco elementos `motion.section/button` cuja classe inicial era `hidden`, portanto invisíveis mesmo após hidratação. Seus dados de atalhos vinham de dois arrays não usados fora desses painéis. São aproximadamente **644 linhas** de código-fonte morto entre JSX e arrays. A navegação visível já passa pelo `HomeCommandCenter`; a cirurgia mantém esse ponto.
- Hoje misturava projeção da agenda e JSX de cada lembrete. Extrai-se `TodayRemindersPanel`, sem acesso a Dexie/Supabase, sem registro automático e sem mudar as regras de frequência.
- A Home reaproveita compromissos já selecionados. Novo resumo evidencia retiradas com data vencida sem somá-las duas vezes, sem supor que não foram realizadas.
- Detalhes ganham sinal de jornada baseado em **tipos de evento separados**, sem transformar compra futura, receita ou retirada agendada em estoque.
- Avatar/Brain ganham um limite visual explícito para projeção, associação e falta de dados. Não criam diagnóstico nem uma segunda autoridade.

## Portas de qualidade
1. SHA-1 de blob Git exato da base (todos os arquivos alterados) e `HEAD` remoto sincronizado.
2. `apply.py` valida todas as âncoras antes da primeira gravação, incluindo contagem das cinco áreas ocultas e existência do `HomeCommandCenter`.
3. Backup `.tar.gz` de todos os originais; rollback seletivo somente das alterações permitidas.
4. Pré-regressões V45/V49/V229/V196/P14, M1 e R10, `tsc --noEmit`, `git diff --check`, gate integral V63.
5. Stage de allowlist explícita, commit/push somente após todos os gates e conferência de que `origin/main` não avançou.

## Limitações desta preparação
A auditoria aqui usa o código publicado e os scripts existentes; o ambiente de preparação não possui a árvore de dependências completa do usuário. Os testes do repositório, o typecheck integral e a homologação visual Android/PWA serão realizados pelo instalador no Termux. A remoção de JSX permanentemente oculto não representa, isoladamente, ganho de tempo de inicialização medido: reduz código fonte montado e pode reduzir bundle, mas o impacto real deve ser medido depois.

## Próximo alvo estrutural
Separar fluxo de revisão retroativa e os blocos de interface maiores de Hoje com props tipadas e validação E2E; avançar a extração da Home sem deslocar autoridades de dosagem, retirada ou dados pessoais.
