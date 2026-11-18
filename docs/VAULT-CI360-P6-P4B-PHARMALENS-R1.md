# VAULT CI360 — P6 P4-B | PharmaLens: cadeia de evidências e recibo privado

Data: 18/11/2026 | Repo: alefe-redes-computadores/vault-app
Base: D3 canônica `3608f9124284bcbf12a9d162f58b89612dfa1e94`, **somente depois de UX360 R3 QG1 publicada**.

## Problema auditado
O motor já distingue aquisição, início de uso, relatos e origem do OCR. Na comparação documental do CI360 P4, entretanto, o campo de nome comercial recebia uma referência de **princípio ativo**, e a concentração capturada recebia lista de apresentações como se fossem a mesma entidade. Mesmo com alertas conservadores, a linha de catálogo poderia confundir produto, substância e apresentação.

## Escopo entregue
1. `pharmalens-catalog-audit-ci360.ts`: nenhuma equivalência textual é atribuída à linha do produto por ter ingrediente ativo igual. Uma lista de apresentações não vira automaticamente confirmação daquela concentração. Fatos oficiais existentes continuam acessíveis, **em lista independente**, com autoridade, fonte, versão e data se houver.
2. `pharmalens-document-candidate-ci360.ts`: validade dd/mm/aaaa passa pela validação real de calendário, incluindo anos bissextos. mm/aaaa permanece como precisão de mês, sem dia presumido.
3. Motor read-only `pharmalens-evidence-p4b.ts`: comparação entre OCR/transcrição e **cadastro declarado**, estados de divergência textual e ausência de referência; fatos do catálogo apresentados separadamente; recibo manual seguro, sem IDs, texto bruto do OCR ou promoção a registro.
4. `PharmaLensEvidenceReviewP4B.tsx`: quadro único para os campos, sem a tabela antiga duplicada, fontes/versionamento, links fixos de consulta ao **Portal de Consulta a Registro de Medicamentos** e ao **Bulário Eletrônico** da Anvisa, cópia local voluntária, fallback selecionável, contraste e alvos ≥44px. O componente só aparece dentro da sessão privada do Estúdio documental existente.
5. Teste P4-B registrado exatamente uma vez no V63, depois do QG1. Sem migração, sem criação de tabela, sem API remota, sem duplicar Brain, sem alterar histórico de compras ou prescrições.

## Não foi implementado (proibido inferir)
- Validação online/autenticidade do registro, correspondência de lote, situação regulatória vigente, identificação da apresentação pela substância, correspondência de fabricante por nome comercial ou selo Anvisa.
- Scraping da Anvisa; bulk import; pipeline regulatório completo; cálculo de interações medicamentosas ou risco individual.
- Persistência do OCR, PDF, foto ou recibo, compartilhamento automático, mutação em receitas/estoque/doses, eventos clínicos, Dexie ou Supabase.
- Homologação visual Android/APK, funcionamento do TextDetector no WebView ou exportação do recibo por compartilhamento nativo.

## Superfícies existentes preservadas
PharmaLens Workspace V7 e Guided Review P6; PL7-P1/P2; Documento Studio P4; CareFlow P0; Modo Médico; Cartão de Retorno D3; UX360 R3 QG1.

## Fontes oficiais verificadas (consulta humana)
- https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos
- https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico
Informação pública disponível nos portais oficiais, mas **a presença de um link não prova a verificação de qualquer medicamento específico**.

## Aceite
1. R3 QG1 publicada, origin/main alinhado e checkout rastreado limpo.
2. `DIAGNOSTICAR-TUDO.sh`: todos os contratos V63 (incluindo o novo) e os extras, TypeScript e diff --check no clone isolado. Nenhum arquivo real é alterado.
3. `APLICAR-VALIDAR.sh`: repete o diagnóstico, gera diff e backup seletivo, aplica, reexecuta contratos críticos e só então marca aprovado.
4. `PUBLICAR.sh`: somente sessão e hashes aprovados, staging de allowlist, commit e push **separado**.
5. Teste Android: troca de pessoa e medicamento, OCR indisponível, data inválida, divergência de nome/laboratório, link oficial, cópia voluntária, descarte/retorno, teclado pequeno e zoom de fonte.

## Próxima etapa real
P6 P4-C: pipeline versionado e auditado de fontes regulatórias, caso exista acesso/licenciamento/condições de uso confirmadas, com revisão humana e rollback de catálogo. As interações permanecem um domínio farmacológico independente com evidência clínica revisada. D4: cursos temporários, término, doses e retornos, sem inferências.
