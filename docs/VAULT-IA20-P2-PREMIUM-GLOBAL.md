# VAULT 360 · IA 2.0 P2 — CTAs por área e semântica visual

## Entrega implementada

- As **19 listas com cadastro único e `ListPageHeader`** ganham o botão real no cabeçalho, por um único componente, usando a mesma autoridade `getComposeOptions` do M6. O FAB global é ocultado **somente nesses 19 contextos com cobertura comprovada**, sem apagar sua lógica nem suas operações.
- Na tela de Fornecimento com `?action=novo`/`editar`, o botão extra não aparece em cima do formulário; o fluxo pré-existente de gravação é preservado.
- Os demais destinos com `Compose` (Home, Hoje, Saúde, Explorar, Rede, Documentos e variações) mantêm o FAB da P1 e a sheet original. Uma ação inline de sintomas/pressão não ganha um segundo botão fictício. Leitura pura não recebe escrita.
- Identidade semântica aplicada ao FAB existente, botões dos cabeçalhos, opções da sheet, seis atalhos essenciais de Saúde e catálogo Explorar. **A identidade de medicamentos, retiradas e farmácias é esmeralda; médicos e consultas, azul; exames/pressão, ciano; tratamentos/procedimentos, violeta; documentos e receita, violeta.** Âmbar volta a ser atenção e não é cor de criação.
- Nomes, ícones Lucide e destino são provenientes do catálogo canônico; toque min 44dp, foco visível, redução de animação e estado `navigating`. Haptic **não significa gravação clínica**. Toast só deve confirmar gravação quando o fluxo de persistência real já a concluiu.
- Fênix, Brain, favoritos R5, foco contextual, 31 entradas de Explorar, CareFlow M2/M3, vínculos bidirecionais, isolamento por conta/pessoa e arquivos permanecem intocados.

## Cobertura real versus futuro vídeo

`test-vault-ia20-p2.cjs` produz auditoria por rota, para os 19 CTAs da lista, rotas multicadastro do Compose e visões de leitura/entrada inline. Também preserva P1, R5 e todas as regressões V63/V70. **Aprovação no Termux não prova automaticamente o desenho e o Android Back em PWA/APK**: vídeos no aparelho e validação de 320/360/393/430dp continuam obrigatórios antes da retirada global do fallback.

## Preservação

Não troca IDs, rotas, entidades, banco, políticas de estoque, receitas, eventos, Brain, Fênix, autenticação nem sync. Não cria alertas, doses, diagnósticos nem movimentos de estoque. Não adiciona botões onde a ação canônica não existe. A lista `/saude/fornecimento` continua usando seu próprio formulário interno; o CTA apenas abre a intenção existente `?action=novo`.

## Critérios de release

- Git `main` precisa incluir a P1 publicada e estar sem mudanças rastreadas; caso contrário bloqueia.
- Patch por âncoras verificadas, em worktree isolada; SHA256, allowlist, manifesto e selo.
- Teste dirigido IA20 P2 + P1, M6, R5, contratos herdados; TypeScript `--noEmit` e **todos os contratos V63 + ambos V70**.
- Diagnóstico consolidado: o gate continua após uma falha, não libera falso positivo, aponta todas as falhas de uma execução.
- `PUBLICAR.sh` separado, sem `git add -A`, sem força, sem rebase/reset destrutivo.

## Próxima revisão no dispositivo (QG2)

Verificar as 19 páginas e estados vazios; a hierarquia da Home, Saúde/Minha Saúde, Explorar, Profissionais e locais, Acompanhamento clínico; FAB sobre último card/teclado; Android Back; toast após **persistência real**; interação no modo compacto do APK; listas com filtros; movimento/haptics; navegação e troca de pessoa. Só então considerar outro release reversível que remova o `+` dos hubs.

### Home também unificada na P2

Os atalhos visuais da Home preservam todos os destinos, e agora consultam a mesma classificação de identidade: **Medicamentos** e **Retiradas/Fornecimento** em esmeralda; **Consultas/Rede** em azul; **Exames** em ciano; **Cirurgias** em violeta; **Documentos** em violeta. O ícone de cirurgias usa o Lucide `Syringe`, não uma representação genérica de recibo. A cor de avisos de gravidade continua separada dessa classificação e não é substituída. Contratos históricos M6, M65, M110, M139, M141 e V9 tiveram somente suas expectativas visuais atualizadas — não suas verificações clínicas, de dados ou de navegação.
