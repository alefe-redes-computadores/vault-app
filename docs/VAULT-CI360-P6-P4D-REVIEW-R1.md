# VAULT 360 · P6 P4-D — revisão offline de versões do catálogo

Data de preparação: 18/11/2026. **Entrega de engenharia, não importação automática de medicamentos.**

## Contexto real e motivo

O repositório já tem o importador inicial das três fontes da Anvisa (`scripts/medication-catalog/import-anvisa-initial.js`), provedor Supabase e painel de fontes no PharmaLens P4-C. Não duplicar catálogo nem criar nova autoridade.

O auditor inicial (`scripts/medication-catalog/audit-imported-catalog.js`) usa quantidades imutáveis de uma importação histórica e exige três versões ativas. São úteis como fotografia inicial, mas não verificam corretamente uma atualização futura. **Não foi alterado nesta P4-D**, para preservar o histórico; o novo procedimento mede o próprio conteúdo de cada lote e produz diferenças auditáveis sem conexão externa.

A fonte `TA_CONSULTA_MEDICAMENTOS.CSV` foi observada no portal oficial com tamanho superior a 110 MB em 18/11/2026. O leitor P4-D utiliza streaming (até 512 MB por arquivo) e pode ser executado em Windows/CI quando for pesado para o Termux. Nenhum CSV real foi distribuído neste ZIP.

## Entrega de código

- `lib/medication-catalog/catalog-release-review-p4d.cjs`: motor puro de integridade de fonte e comparação entre versões.
- `scripts/medication-catalog/review-catalog-update-p4d.cjs`: CLI OFFLINE em três etapas: validar manifesto; ler arquivos fornecidos com SHA256; criar dossiê sem alterações de banco.
- `scripts/test-vault-ci360-p6-p4d-catalogo.cjs`: testes negativos de fontes, SHA, datas, chaves, arquivo inválido, mudanças, CSV e saída sem aprovação.
- Inclusão exata no V63, após contrato P4-C, preservando os demais contratos.
- Relatório mestre V10 de continuidade.

## Modo de uso após instalar a cirurgia

1. Baixe **manualmente** a versão de base e a nova versão de uma das fontes Anvisa. A base deverá representar a versão que se pretende comparar, e a conciliação com o banco ativo continua sendo requisito humano separado.
2. Registre URL oficial de origem, identidade dos arquivos, hash SHA256 de cada download, data REAL em que o arquivo foi coletado, `key_columns` observadas e versão declarada por você. Não confunda `retrieved_at` com data de publicação nem validade de registro.
3. Crie um diretório externo ao checkout (`~/storage/downloads/catalogo-lote/`) com `base.csv`, `novo.csv` e `manifest.json`, conforme exemplo abaixo. Não edite o projeto para executar o CLI.
4. Rode:

```bash
cd ~/projects/vault-app
node scripts/medication-catalog/review-catalog-update-p4d.cjs \
  --manifest "$HOME/storage/downloads/catalogo-lote/manifest.json" \
  --out "$HOME/storage/downloads/catalogo-revisao-p4d-001"
```

A saída conterá `REVIEW.json`, `RELATORIO.md` e `REVIEW-NOT-APPROVAL.json` (sempre com `signed_off=false` e `approved_for_production=false`). O programa nunca publica uma versão.

### Exemplo de manifesto — NÃO usar hashes ilustrativos para executar

```json
{
  "schema_version": 1,
  "sources": [{
    "source_key": "anvisa_consulta_medicamentos",
    "source_url": "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV",
    "delimiter": ";",
    "encoding": "windows-1252",
    "key_columns": ["COLUNA_IDENTIFICADORA_REAL_1", "COLUNA_IDENTIFICADORA_REAL_2"],
    "baseline": {
      "file": "base.csv", "sha256": "COLOQUE_O_SHA256_REAL_DE_64_HEX",
      "version": "versao-base-real", "retrieved_at": "2026-11-17"
    },
    "candidate": {
      "file": "novo.csv", "sha256": "COLOQUE_O_SHA256_REAL_DE_64_HEX",
      "version": "versao-candidata-real", "retrieved_at": "2026-11-18"
    }
  }]
}
```

O mesmo manifesto pode conter as três fontes, cada uma com um par de arquivos e colunas-chave próprias. A identidade da linha nunca é inferida do texto do produto ou do princípio ativo. Se não houver colunas suficientes para evitar duplicatas, o processamento bloqueia e exige revisão do esquema.

### Resultado e limiares

- Inclusões, exclusões, alterações e inalteradas são comparadas pela chave composta das colunas expressamente selecionadas, independentemente da ordem de linhas e colunas.
- Mínimos de segurança: schema idêntico em cabeçalhos, SHA256 real, versão distinta, datas possíveis, chaves não vazias e não repetidas, CSV válido, origem permitida.
- Risco: mais de 2% de exclusões, mais de 25% de linhas modificadas ou queda de volume superior a 3% -> `blocked_for_review` com código de saída 3, **mantendo o dossiê para auditoria**. Limiares são triagem operacional, NÃO critérios legais.
- Risco baixo -> `requires_human_review`, NUNCA `approved`.
- Mesmo sem limiares excedidos, a atualização depende de comprovar que base CSV corresponde ao estado vivo do Supabase, revisão de dados e chaves relacionais, integridade de RLS, homologação e autorização de publicação separada.

## Escopo negativo, segurança e privacidade

- Não inclui downloads, `curl`, APIs, credenciais, SQL/migrations ou acesso Supabase. Não faz scrape da Anvisa.
- Não instala nem altera nenhuma tabela, não troca versão ativa, não faz merge de identidades comerciais, não exclui registros históricos, não muda medicamento, estoque, receita, dose, alerta, horário, fornecimento ou Brain.
- Não considera dados de registro ou preços sinônimo de indicação clínica, apresentação equivalente ou autorização de uso.
- URLs de fonte são literalmente as três já configuradas no importador inicial; fornecer uma URL de aparência semelhante não permite contornar a allowlist.
- Chaves das linhas aparecem no dossiê apenas como hashes SHA256. Nenhum dado de paciente é importado para o comparador.
- Nenhuma variável de segredo do Supabase é lida.
- `--out` deve apontar para um diretório novo fora do repositório. Não substitui saídas anteriores.

## Acompanhamento até uma atualização real

1. Auditar e confirmar dicionário oficial de campos, identidade dos produtos e chave da apresentação; a chave não é criada por adivinhação.
2. Conferir direitos/licença de reuso e estrutura de cada fonte antes de trazer o CSV para homologação.
3. Comparar as três fontes e cruzar os identificadores relacionais (pós-revisão das colunas reais).
4. Em homologação separada, executar versão candidata em cópia segura, com backup/restore e auditoria de RLS e permissões.
5. Aprovação humana específica, nova cirurgia de promoção por lote com idempotência, trilha de rollback e gate de CI. **Esta cirurgia não inclui tal publicador de banco.**
6. Verificar uma amostra de registros sensíveis no Sistema de Consultas da Anvisa, independentemente do CSV. Uma versão baixada não confirma vigência regulatória.

## Garantias de release do aplicativo

O script `DIAGNOSTICAR-TUDO.sh` checa o pacote, exige que a P4-C e as frentes QG1/P4-B/Macro 1 estejam PUBLICADAS no HEAD, clona a base em ambiente temporário, injeta o novo contrato e executa todos os V63, extras, TypeScript e diff --check, coletando todas as falhas. `APLICAR-VALIDAR.sh` repete a análise antes de instalar, faz backup seletivo e rollback. `PUBLICAR.sh` faz stage SOMENTE dos caminhos permitidos e push normal, depois da aprovação local.

## Referências

- Catálogo original: `scripts/medication-catalog/import-anvisa-initial.js` e `audit-imported-catalog.js` do VAULT.
- Portal Anvisa: https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/
- Consulta oficial para confirmação humana: https://www.gov.br/anvisa/pt-br/sistemas/sistema-de-consultas
- Supabase migrations e RLS (para futuras etapas, NÃO aplicadas aqui): https://supabase.com/docs/guides/local-development/database-migrations e https://supabase.com/docs/guides/database/postgres/row-level-security
