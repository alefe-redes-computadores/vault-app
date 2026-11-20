# VAULT R5 — Integração Clínica Premium 360

## Evidência e escopo

Preparada sobre a main após R4 (`c4972e5c537d4b682922a6c250fc2c48e74e1332`), cruzando o vídeo Android, relatórios V19/V20, UX360 e contratos CareFlow R1–R3. Esta cirurgia atua **sobre experiência e projeção**; não cria ou migra bancos nem altera dados clínicos reais.

### Mudanças implementadas

1. **Brain:** visualização de dose reaproveita forma e cores do medicamento canônico e da pessoa ativa, via `MedicationFormatIcon`. Sem apresentação disponível usa ícone genérico, sem inferência. Ícones semânticos diferenciados para pressão, caminhada, sono, saturação, sintomas.
2. **Pedidos CareFlow:** a lista é a tela principal; a ação **Novo pedido** abre o formulário, com retorno explícito, sem duas abas e sem sacrificar foto, OCR local ou conferência individual.
3. **Exames e Laudos:** pedidos agrupados exibidos sempre na área canônica, inclusive vazios, com ação contextual e IDs de origem para abrir itens. Registros de exame individuais continuam independentes. Não duplicar ou migrar automaticamente `careflow_events_m2` para `db.exames`.
4. **Sintomas:** formulário só abre por intenção; histórico e gráfico podem ser consultados sem rolar formulário inteiro. Escrita segue o registro canônico `createRegistro`; deep link antigo e vínculo à consulta seguem válidos.
5. **Pressão:** ações separadas sob demanda para novo plano e medição. Medições reais seguem `saveHealthMeasurement`; planos ficam em CareFlow e lembretes permanecem por contrato existente; histórico e PDF preservados.
6. **Linha de cuidado:** entrada principal compartilha links dos mesmos sintomas e aferições, com explicação factual de planos; CareFlow preserva rotas antigas e identifica o papel de cada área.

### Limites importantes

- Pedidos CareFlow e exames convencionais continuam com autoridades distintas, embora apareçam juntos na UI. Unificação transacional real exige desenho de modelo, migração e autorização própria; **não está certificada nesta cirurgia**.
- Pressão arterial é medição, não sintoma. Plano de pressão é acompanhamento, não valor medido; não transformar um no outro.
- V63 completo passa pela Action após publicação; gate local inclui R1/R2/R3/R4, IA20 e TypeScript global. O aceite físico em Samsung, teclado, gestos, OCR e PDFs reais permanece necessário.
- Nenhuma mudança em doseLogs, estoque, prescrições, RLS, sync, migrações, notificações ou decisões D4.

### Critérios Android

- Em Brain, Fenergan e outros medicamentos com formato/cores realmente cadastrados mostram apresentação própria; medicamentos sem dado conservam ícone neutro.
- Exames e Laudos mostra pedidos antigos sem contar itens como laudos concluídos; Novo pedido entra no formulário, depois retorna à lista; histórico e deep link por ID funcionam.
- Sintomas e Pressão exibem o histórico sem formulário gigante; novo registro salva na fonte existente e volta à mesma pessoa.
- Aferição sem plano continua válida; plano não cria medição; reparo de vínculo não repete gravação.
- Teclado, Safe Area, tela 320/360/393/430dp, Android Back e PWA devem ser inspecionados.
