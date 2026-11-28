# Encaminhamento para PharmaLens Catalog Intelligence — DATA-ONLY
Consulta pública do catálogo em leitura, sem registros pessoais, sem SQL de mutação. Evidências verificadas na execução anterior:
- Metadona: a substância "cloridrato de metadona" tem regra A1, notificacao_a, fonte ANVISA, sem exceções encontradas. O termo exato "metadona" não retornou vínculo de alias na consulta; não criar atalho por nome na H01.
- Pristiq: vínculo de substância succinato de desvenlafaxina monoidratado, receita_controle_especial, uma regra ativa.
- Venvanse: vínculo de substância dimesilato de lisdexanfetamina, notificacao_a, uma regra ativa.
- Cerumin: produto ativo, uma apresentação ativa, zero vínculos com substâncias e zero evidência descritiva na consulta.
- Otociriax: produto ativo, três apresentações ativas, zero vínculos com substâncias e zero evidência descritiva na consulta.
- O catálogo consultado não possui modelo específico estruturado de antimicrobianos. Não inferir classificação de produto a partir de nomes, nem declarar confirmação oficial sem regra/fonte/applicabilidade.
Encaminhamento: reconciliar vínculos de substância e produto, fontes oficiais, modelos regulatórios e exceções na frente DATA-ONLY, com evidência/versionamento e autorização próprios. H01 deve projetar a declaração cadastrada ou identidade conhecida sem falsificar confirmação. Lacunas são impeditivo de provar a cobertura dos registros pessoais nesta missão; não promover dado incompleto.
