# VAULT 360 — P6 P4-C · Governança de fontes e versões do catálogo

## Situação de origem

Preparado a partir de análise do repositório `alefe-redes-computadores/vault-app`, em 18/11/2026.
A fase Macro 1 de bulas e evidências por produto **já estava publicada** em `b174d10bf6b0b7c258ba636b0138d049e736d093`.
A P4-B PharmaLens deve estar **publicada e rastreada no HEAD** antes de aplicar esta P4-C.

## Objetivo e entregas

- Trilhas legíveis de proveniência por referência de catálogo já vinculada ao medicamento.
- Identidade concreta de produto versus correspondência não exata: reutiliza `exactOfficialProductId` existente no Macro 1.
- Estado de cada fonte: versão informada, data válida, posterior ao dia selecionado, antiguidade que recomenda conferência (limite operacional informativo de 730 dias; NÃO é prazo de validade regulatória), URL oficial admissível.
- Regras documentadas com períodos declarados, condições e conflitos simultâneos. Não aplica automaticamente uma regra nem reclassifica a receita.
- Histórico de produtos comerciais, sem mesclar um produto antigo ao atual.
- Painel sob demanda em PharmaLens por pessoa e medicamento, herdando isolamento canônico do workspace, sem queries novas.
- Contrato novo com 22 garantias e fixtures de datas inválidas, identidade exata, referências não exatas, regras históricas, futuras, contraditórias, fontes e ausência de evidências.
- Inclusão no V63; execução integral de cada contrato via diagnóstico isolado e preservação do QG1.

## Limites de autoridade

**Não há verificação em tempo real de situação cadastral na Anvisa**; a fotografia do catálogo não comprova validade de registro, comercialização atual, bula vigente, indicação clínica ou intercambialidade. `verifiedAt` da referência pode representar ingestão do catálogo; a UI o rotula `Data cadastrada`.

Sem migrações, writes Supabase, mudança de RLS, alterações de doses, prescrições, estoque, lembretes, consultas, Brain, OCR ou tratamento. Nenhum dado é carregado de outra pessoa, e nenhum campo é gravado. Links são filtrados pela allowlist oficial do motor Macro 1.

Os nomes P4-C, V63 e QG1 ficam em arquivos, scripts e documentação, nunca em cabeçalhos públicos.

## Segurança e aplicação

- Verificar SHA256 da cirurgia; HEAD = origin/main; `main`; nenhum stage ou diff rastreado pré-existente.
- Exigir Macro 1 e P4-B **rastreados no HEAD** (não aceitar arquivos apenas locais).
- Aplicar patches ancorados em clone temporário, instalar 4 arquivos novos apenas se não existirem, executar todos os contratos V63 mais extras, tsc e diff --check.
- Só depois permitir aplicação real, com backup seletivo; pós-gates dirigidos; rollback apenas sobre hashes reconhecidos.
- `PUBLICAR.sh` separado: stage exato dos 2 modificados e 4 novos; HEAD congelado e remote verificado; push sem force.
- Tela Android deve ser conferida em largura estreita e em troca de pessoa/medicamento; o gate de código não equivale a homologação visual.

## Próximas fases

P4-D: procedimento de atualização/revisão de catálogo com auditoria de lotes e fontes em ambiente de homologação, sem promoção automática; P6 Macro 2: reconciliação de prescrição por consulta e avaliação de interações apenas se houver fonte farmacológica adequada; D4: tratamentos temporários e históricos; Fênix e Android 360.

Referências oficiais: https://www.gov.br/anvisa/pt-br/sistemas/sistema-de-consultas ; https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico
