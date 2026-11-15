# VAULT M153 P1 — Governanca conservadora do Brain M152B

**Base exata:** `c624a0fc5cdbf1a00eb88057a70e9c363f4a550d` (M150 P5 P5 publicada).

## Entrega desta candidata

- Brain Active Probing exige flag de build **e** consentimento granular explicito por `user_id/person_id`.
- Opt-in local nao compartilha dados entre pessoas ou titulares; default OFF e reversivel.
- Seleciona no maximo 2 novos candidatos nos ultimos 7 dias, com idempotencia; categories SOS/fabricante/ciclo/eixos independentes.
- Repositorio controla upsert/answer/dismiss/sync: nao cria/mostra/sincroniza perguntas sem permissao vigente.
- Curso temporario so produz a pergunta de encerramento quando todos os registros do ciclo estao resolvidos.
- SQL RLS corrigido em **ARQUIVO APENAS PARA REVISAO**, nunca aplicado pelo instalador nem pelo deploy.

## LIMITES E PENDENCIAS

1. **`NEXT_PUBLIC_BRAIN_ACTIVE_PROBING` permanece desligada**: publicar o codigo nao habilita a sondagem. Ativar somente depois de aplicar/validar a policy SQL com autorizacao explicita e teste canario de duas pessoas na mesma conta.
2. Confirmar o comportamento real de migração, GRANTS, isolamento, reabertura e sincronizacao em Supabase. A consulta observacional detectou a condicao `q.person_id = q.person_id` na policy existente.
3. Preferencias sao locais por aparelho; nao equivalem a consentimento sincronizado multi-dispositivo. Revogacao nao apaga respostas existentes, so bloqueia novos prompts e envios.
4. Integracao `ManufacturerLotStartM152` com uma aquisicao real segue pendente. Compra nao prova inicio de lote.
5. Android P5 P5 ainda necessita homologacao visual e E2E A01–A41; o plano de aceite esta no pacote.

## Gate

Novo smoke puro e parser + V63/V70 e `tsc --noEmit`. Branch candidata primeiro, promocao manual separada. Sem novos registros de doses, estoque, receitas ou aquisicoes.
