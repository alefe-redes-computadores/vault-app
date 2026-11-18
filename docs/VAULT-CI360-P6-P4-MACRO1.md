# VAULT CI360 — MACRO 1 · ANVISA KNOWLEDGE 360

## Contexto confirmado em 18/11/2026

Na instância Vault do Supabase já existem `medication_products` (~42.749),
`medication_presentations` (~51.465), `medication_substances` (~2.439),
`medication_catalog_versions` e regras regulatórias versionadas. **Não duplicar.**

O Bulário Eletrônico e o Sistema de Consultas da Anvisa são fontes oficiais,
mas não é comprovada uma API estruturada pública para extração automática de
instruções alimentares, sonolência, conservação e duração após abertura.

## Entrega

- Contrato puro `use-evidence-macro1`: produto exato, validade temporal,
  proveniência, conflito de fontes, estados sem evidência e sem inferência negativa.
- Leitura opcional por Supabase da tabela de fatos, RLS verificado somente.
- UI premium em Detalhes > Conhecimento do medicamento, separando fatos da bula
  da prescrição individual. Não modifica alertas, doses, estoque ou cadastro.
- Ingestão em quarentena OFFLINE por JSON + PDF original, SHA256 binário conferido, domínio autorizado e revisão;
  não publica nem converte documentos em fatos confiáveis automaticamente.
- SQL de ativação **STAGED**, não incluído na execução do instalador, com RLS e
  permissões: authenticated SELECT verificado; anon sem acesso; service_role write.
- Testes dirigidos, gate canônico V63, compilação TypeScript global, worktree,
  hashes, allowlist e publicação separada após aprovação.

## Autorização de migração

O arquivo `sql/ATIVACAO-REVISADA-MEDICATION-USE-EVIDENCE.sql` é uma proposta para
revisão em DBA e Supabase CLI. Deve ser promovido à pasta de migrations somente
via `supabase migration new` após confirmar CLI, backups e contrato real.
A migração não é executada pela cirurgia. Sem tabela ativada, o painel apresenta
`indisponível` — nunca instrui o paciente sem fonte.

## Roadmap integrado: 8 ideias Gemini + 6 melhorias

**MACRO 1**: fontes, via/apresentação, relação com alimentação/jejum,
sonolência, refrigeração/fotoproteção, pós-abertura, conservação,
períodos de validade e qualidade/procedência dos dados.

**MACRO 2**: reconciliar prescrição após consulta, comparar contínuo/temporário,
possíveis interações/dose duplicada (fonte farmacológica específica),
explicar gravidade, evidência, limites e alternativa segura de confirmação,
sem aconselhar troca, descontinuação ou ajuste automático.

**MACRO 3**: comparação temporal mudanças de posologia x sintomas (NÃO causal),
planos de resgate **previamente** confirmados por profissional, registros
objetivos de doses x evolução, sinal temporal possível de reação adversa sem
atribuição, previsão de fim de estoque com incerteza, CTA seguro para documentos
SUS/particular, governança do Brain com feedback, snooze, dedupe e único motor.

## Requisitos negativos

- Nunca inventar regras de jejum, interações, orientação de refrigeração,
  prazo de uso, plano de resgate, dose tomada, receita, estoque ou diagnóstico.
- Nunca inferir evidência de uma apresentação a partir de outra.
- Não fazer scraping/baixar documentos sem conferir licença e disponibilidade.
- Não considerar cadastro de produto como uma orientação clínica.
- Nunca inserir service_role em bundle Next.js/browser.
- Não emitir alertas interacionais sem base específica e auditável.

## Referências públicas consultadas

- https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico
- https://www.gov.br/anvisa/pt-br/sistemas/sistema-de-consultas
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/local-development/database-migrations
