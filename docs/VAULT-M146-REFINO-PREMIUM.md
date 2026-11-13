# VAULT M146 R1 — Acabamento premium após o Vídeo 2

**Base:** M145 `8e73ab5996e145f0baf98dbd95a6ee0cd29572b2` (ou commit descendente compatível).
**Objetivo:** resolver pendências concretas de hierarquia e legibilidade, preservando a navegação e a integração clínica já publicadas.

## Mudanças incluídas

1. **Mais:** Atualizações do Vault acessíveis mesmo com preferências recolhidas; não duplica o Update Center. Texto de sincronização em tamanho legível e singular/plural correto; descrição do acesso ao Brain melhorada. A ordem de prontidão e segurança da M145 permanece.
2. **Minha Saúde:** acordeão “Panorama, mapa e vínculos do cuidado” deslocado para **depois** do card principal da Fênix e do resumo Brain; preserva todos os mapas e links, não duplica informações.
3. **Medicamentos:** filtro “Atenção” e agrupamento “Precisa de atenção” passam a avaliar a **mesma condição executiva** (estágio, lane Brain, motivos concretos), sem transformar automaticamente a dose futura em atraso. O motivo no cartão ganha legibilidade.
4. **Navegação:** Detalhes da aquisição/renovação e Nova retirada usam `safeReturnTarget` existente para validar retorno contextual, rejeitar origem externa e preservar a Home quando o fluxo declara `return_to`.
5. **Home:** nota secundária de orientação fica acessível ao leitor de tela sem ocupar a primeira dobra; o avanço M145 que antecipou os compromissos reais permanece intacto.
6. **Plano do Brain:** singular/plural de etapas, registros, dias, desfechos e retiradas; etiquetas menos microscópicas. Projeções de amanhã continuam separadas no recolhível M145.
7. **Modais de explicação:** aumentar legibilidade de categorias, rótulos e métricas sem alterar ações, dados, fundo opaco e isolamento visual da M145.
8. **Formatter compartilhado:** um helper puro `formatPtBrQuantity()` para textos de interface, sem efeitos em estoque, doses, prescrições, banco ou rede.

## Deliberadamente não alterados

- **Semáforo/histórico:** o relatório do vídeo não identifica a superfície e o contrato exato o suficiente para corrigir sem risco de mexer em histórico errado. Requer homologação no aparelho.
- **Óculos/boné da Fênix:** geometria 3D não alterada sem nova captura de orientação e enquadramento após a M145; permanecem protegidos os dispositivos e seus metadados.
- Sem alterações de tratamento, dados médicos, sincronização, estoque, anexos ou critérios de validade de receita.
- Sem reescrever Brain V7, PharmaLens, Supply Shield, Visual Studio V8 ou M143 P1/P2/P3.

## Validação e segurança

- **21 suites direcionadas antes do release:** M146, V198 (origem do rollback M145), M145, M92/M94, V31/V84, V266/V271, M103/M106/M118/M119/M133, V269, M143 P1/P2/P3, Brain V7, SS7 e Visual Studio V8.
- **Gate global uma vez:** `npm run test:release` (V63, V70 e TypeScript). O instalador imprime progresso a cada 25 suítes e guarda logs.
- Instalação no **worktree isolado** sobre `origin/main` atualizado; o checkout original e modificações locais não são sobrescritos.
- Snapshot de arquivos remotos originais; package `SHA256SUMS` para integridade; commits somente dos caminhos explicitamente autorizados.
- Sem `git reset --hard`, `git clean`, `git add -A`, stash, push forçado ou alteração automática de dados pessoais.
- Se houver divergência de âncoras, falha de teste ou avanço do GitHub, **não publica**. O worktree e os logs ficam preservados.
- Confirmação de sucesso: `M146_PUBLICADA_GITHUB=<commit>`. Push GitHub não significa deploy Vercel READY nem APK atualizado.

## Homologação pós-deploy no Android/PWA

Comparar principalmente: atualização sempre acessível em Mais; posição da Fênix; acesso ao Panorama; Medicamentos → Atenção vs agrupamento; retornos entre Home, retirada e aquisição; textos/plurais do Brain; contraste de modais. O histórico do semáforo e os acessórios 3D devem continuar anotados para inspeção visual dirigida.
