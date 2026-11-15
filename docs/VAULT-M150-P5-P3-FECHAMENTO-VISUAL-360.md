# VAULT — M150 P5 P3 | Fechamento visual 360 (candidata)

Base assinada: `35f85355db0f1d8bc79b950c28cd1c5176a0da44` (P5 P2 publicada). Nenhum dado clínico ou mecanismo de doses alterado.

## Escopo com contrato preservado
- **A28:** ocultar na Home mobile o índice interno `Seções` enquanto `Ver todas` continua como porta principal para o mapa. O índice de saltos permanece em desktop/tablet; o teste histórico M17 foi reconciliado semanticamente; as seções de informação e suas rotas continuam montadas.
- **A27:** realce multicolorido por seção no mapa, com cores dos 22 ícones já definidas na P3. Não mexe na autoridade regulatória dos medicamentos.
- **A18:** mapa chama o produto de VAULT Brain, sem V7 no nome público; rota técnica inalterada.
- **A23:** Minha Saúde ganha acesso direto ao mapa com `return_to` para a própria página, sem troca de pessoa.
- **A29:** um único seletor `Compactos/Conforto`, identificado por atributo para inspeção DOM. A versão publicada já continha uma única dupla: isso **não é prova** de que o bug visual do APK anterior foi resolvido. Preferência local inalterada.
- **A31.1:** função pura de margem de câmera Android, mantendo a câmera canônica, as geometrias, controles, zoom e orçamento GPU; face e tênis com mais margem na inspeção estreita. Não se declara câmera homologada sem inspeção no aparelho.
- **A31.3:** separar explicitamente relógio/anel cadastrado de medição com aparelho vinculado, e corrigir o rótulo de soma de dias-eixo, que não representava um número de registros únicos.
- **A31.4:** prévia PillStudio deixa de ser sticky e de ocupar 280px no celular, banners explicativos do Studio/PharmaLens viram disclosures acessíveis, e os atalhos do PharmaLens passam a ocupar uma fileira. Conteúdo de limitações clínicas continua acessível.

## Não encerrados automaticamente
A08/A09/A10, A15/A16, A24 e A31.2 (proporção geométrica dos acessórios) ainda exigem inspeção de APK. A32 React #310, o caminho real de A01, Cerumin futuro e Tramal/SOS exigem teste prático com dados controlados. A M152B segue OFF, com governança pendente. Não alterar gráficos para representar leitura inexistente.

## Gate e publicação
Rodar em worktree isolada, `git diff --check`, V63+V70+TypeScript, inspeção da allowlist, commit seletivo e push da candidata. Verificar workflow Fast Lane remoto por SHA antes de promover à main. Gerar APK só após CI remoto success. Confirmar visual 320/360/390/430px PWA e APK, incluindo orientation, safe area e reduced-motion.
