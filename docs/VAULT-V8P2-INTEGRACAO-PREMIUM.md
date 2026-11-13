# VAULT V8 P2 — Integração real: Novo/Editar, Fênix e quatro eixos

Base: V8 Visual Studio publicado; dependência do SS7 e Brain V7 preservadas.

## Funcionalidade
1. **Novo e Editar medicamento:** a mesma prévia visual já usada pelos dois formulários passa a oferecer renderização SVG de aparência (cápsulas, comprimidos, sulcados, gotas, adesivos, injeções) em um painel colapsável, sem alterar formato, fabricante, dose, estoque ou sincronização. O avatar de identidade original permanece.
2. **Quatro eixos:** o gráfico de cada período mostra 7, 14 ou 30 dias *inclusive os que não têm registro*; ausências permanecem `null`, zero é relato válido. Um dia pode ser selecionado para revelar valor, horário e origem; mediana só usa dias registrados. Escalas com sentidos diferentes são explicitadas.
3. **Fênix:** aparelhos ativos cadastrados são mostrados separadamente das últimas observações de HRV, frequência cardíaca e sono. Sem associação documentada de `device_id`, uma leitura não ganha nome fictício de relógio/anel. O avatar 3D original não é alterado.
4. **Consulta:** preserva o Dossiê V8 já publicado e os check-ins oficiais; não duplica a persistência clínica nem interfere nas limitações de segurança.

## Bloqueios e verificação
- Não modifica `DoseLog`, `Renovacao`, agendamentos, banco Supabase ou esquema Dexie.
- Não importa dados pessoais no código; pessoa e conta são filtradas pela projeção V8 canônica.
- A instalação exige V8 já publicada, HEAD limpo, teste V8 no gate; faz backup e rollback isolado.
- Instalação valida: teste V8P2 direcionado, `tsc --noEmit`, `npm run test:release`, diff check e SHAs.
- A publicação nunca usa `git add -A` nem `push --force` e requer `origin/main` igual ao HEAD testado.

## Homologação Android
Abrir **Novo medicamento** e **Editar** > identidade visual > "Visualizar apresentação ilustrativa 3D-SVG". Confirmar prévia e que não grava sozinho. Abrir **PharmaLens → Visual Studio V8**: alternar 7/14/30 dias, inspecionar dia sem registro e dia com valor zero; conferir wearable ativo sem associação de dados e aparelhos associados quando existirem. Check-in de eixos e PDF permanecem.

A inexistência de dados não comprova estabilidade, normalidade de sinais vitais nem segurança de tratamento.


## FIX1 (TS18004)
Prévia do formulário compartilha `colors` do componente `MedicationIdentityPreview` como propriedade `cores` do `PillStudioV8`. Não cria novo estado e preserva o 3D-SVG original.


## FIX2 — Contrato legado M59
A prévia `PillStudioV8` é novo filho visual read-only de `MedicationIdentityPreview`; o teste M59 transpilava esse arquivo em ambiente de mocks estritos. O mock adiciona a nova dependência sem modificar testes ou asserts existentes. O gate canônico M59 continua ativo.
