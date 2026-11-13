# VAULT M145 — Bloco 7: Navegação, Home, Mais, Brain e Fênix

Base mínima: M144 `81ff60274dfcc31a0854105884ec4e939982021a`. A instalação trabalha em **worktree isolado** do `origin/main` atualizado, não sobre o checkout original.

## Integrações incluídas

1. **Navegação:** aquisição aberta a partir dos detalhes da retirada carrega o retorno para essa retirada, que por sua vez sabe retornar à Home quando originada de lá. Links já corrigidos na M144 são preservados.
2. **Home:** mover a **agenda real** antes dos painéis de Atenção/Brain, sem duplicá-la; suprimir o card de quantidade extra quando o próprio Brain já mostra **o mesmo fenômeno do mesmo medicamento**. Outras evidências permanecem disponíveis.
3. **Medicamentos:** corrigir singular/plural da linha de dose ignorada, sem alterar registros; manter o resolver M143 de horários futuros e decisões clínicas.
4. **Mais:** foto de conta única e edição acessível pelo botão existente, seletor de pessoa sem repetir foto, acessos em lista na tela estreita, controles/Update Center abertos por padrão, prontidão e recuperação na seção Dados & Nuvem.
5. **Brain:** backdrop mais escuro e superfícies opacas nos dois modais explicativos. Projeções futuras explicitamente identificadas como doses/horários saem do bloco de prioridade visual e permanecem acessíveis em gaveta separada. Receitas e retiradas não são filtradas.
6. **Minha Saúde:** Fênix antes dos painéis secundários de vínculos e continuidade; links em lista expansível dentro da auditoria de vínculos, sem apagamento.
7. **Avatar 3D:** mais espaço na câmera de tênis em visualizadores estreitos; geometria, dados e enquadramento padrão V162 intactos.

## Limites honestos

- O texto ilegível no vídeo e o histórico do “semáforo” exigem localizar a superfície efetiva no aplicativo após a publicação; não há patch especulativo aqui.
- Boné/óculos fora da posição e proporções da Fênix precisam de **validação visual no aparelho**; o ajuste deste pacote é somente o enquadramento dos tênis em largura compacta.
- Dados clínicos reais, documentos e doses não são modificados.
- Publicação GitHub `main` após gates não significa deploy READY ou APK atualizado.

## Gates

Contratos M145 (sintaxe + comportamento), M92/M94, V31/V84, M133, M119, V162, M143 P1/P2/P3, Brain V7, SS7, V8 e `npm run test:release`, que inclui TypeScript. A ordem legada do V63 é preservada.

O instalador não usa `git add -A`, `git reset --hard`, `git clean`, force-push ou stash. Não publica quando o HEAD remoto avança durante a validação.
