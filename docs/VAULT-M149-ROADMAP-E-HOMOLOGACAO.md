# VAULT — Roadmap após M148 P3 e M149

Base verificada GitHub `main` M148 P3 FIX4: `f58e10d13c0fa6d4d87b125050e74e5d4ca48aaf`.

## O que já entrou na M148 P1/P2/P3

- M148 P1: identidade premium inicial, tarja regulatória vertical e referência farmacêutica.
- M148 P2: detalhe relacional de tratamentos, aquisição, laboratório e documentos; a P2 não afirma propriedade da embalagem atual.
- M148 P3: busca pela lupa, filtros condensados, lista com ordenação fixa inicial, acesso M144 em Minha Saúde, seção M144 progressiva, barra inferior autorizada em M144 e origem das etiquetas visível. Gates V63/V70/TS aprovados segundo publicação confirmada no GitHub.

## M149 — este pacote, sujeito aos gates reais do Termux

- Navegação Home: o fallback WebView só tenta reload após 5s, com verificação de rota ainda travada e cancelamento quando o roteador avançar. Não garante resolução de todos os travamentos de WebView.
- Central M144: `error.tsx` para oferecer recuperação explícita sem enviar à Home silenciosamente. Não altera eventos clínicos.
- Dia ativo: lista atualiza na virada do dia e ao voltar do segundo plano via hook canônico.
- Por período: ordenação pelo registro `dose_kind='planned'` do dia, sem criar horário fictício.
- Estoque: exibir contagem factual sempre quando informada; desconhecido continua desconhecido, negativo continua negativo; unidade somente a gravada.
- Catálogo regulatório: diálogo distingue identidade confirmada, compatível, divergente e não validada do tipo de receita, que tem autoridade separada.
- Identidade dos cards: formato compacto único, marcas legíveis sem prefixos redundantes; ícone/tag/tooltip distinguem etiqueta declarada da última aquisição real, mantendo as duas fontes.
- Home: remover o atalho M144 solto e integrá-lo à grade `Outras áreas de saúde` (canônica), mantendo acesso primário em Minha Saúde.

## Ainda aberto: próximos blocos, NÃO DECLARAR CONCLUÍDOS

1. **Homologação real Android + PWA**: rota Home→Minha Saúde→Central M144→Voltar; rota Hoje→M144; fundo/aplicativo reaberto; barra inferior, travamento, splash, toque e tempo de abertura, inclusive uso sem rede. Fazer registro de evidências antes de declarar GO.
2. **Vercel produção e APK**: confirmar deploy READY e SHA publicado, service worker/cache PWA, revisão real do APK Capacitor; a publicação GitHub não equivale a APK atualizado.
3. **Medicamentos e regulação**: auditar consultas ao catálogo (Clonazepam, casos sem princípio ativo, receita não encontrada), autorizações de fonte, regras ANVISA vigentes/configuráveis, nomenclatura, prazo, comprovação e classificação. Nenhuma afirmação regulatória sem evidência.
4. **Documentos/receitas**: vincular corretamente documentos existentes à pessoa/medicamento/renovação/retirada e preservar históricos; não inventar receita, validade, compra, aquisição ou estoque.
5. **Estoque e SUS**: conversões explícitas de caixas/cartelas/frascos/unidades, gotas/ml só com fator registrado, saldo desconhecido, offline, idempotência, fluxo particular/SUS e processos sem duplicidade.
6. **Fênix Studio/Avatar**: anatomia, câmera, boné, óculos, tênis, visual do cérebro, sincronização verdadeira com sensores/wearables, desempenho WebGL e fallback nativo.
7. **Polimento geral**: contraste, densidade em 320–420px, safe area, haptics, ícones Lucide, navegação coerente e formulários sem select nativo.
8. **Conciliação Git local obrigatória**: checkout principal Termux foi mantido atrasado e com alterações locais não publicadas; não resetar/stash/rebase/force. Conciliar em etapa isolada após inventário de conflitos, sem misturar essas alterações nas cirurgias.

## Matriz rápida de homologação no aparelho

- Abrir Home sem mostrar botão avulso M144 na primeira dobra.
- Abrir `Outras áreas de saúde` e tocar cartão `Ocorrências e ciclos`; verificar ícone, destino, retorno e barra inferior.
- Abrir Central pela Home, Hoje e Minha Saúde. Se erro real, opção `Tentar novamente` aparece sem redirecionamento automático.
- Listagem: Venvanse, Clonazepam, medicamentos de laboratório declarado e de aquisição real; mostrar marca compacta sem “Etiqueta ·” no texto; toque longo/tooltip e leitor de tela descrevem origem.
- Horários: temporário 08:00, contínuo 09:00, SOS sem horário; não criar dose planejada a partir de avulsa.
- Estoque: 13 comprimidos, 0, desconhecido e -3; não ocultar números nem alterar base de dados.
- Classificação regulatória: confirmado vs divergente vs não validado, sem confundir substância no catálogo com receita verificada.
- Voltar ao Hoje e Home, trocar pessoa, mudar data, suspender e retomar APK; conferir sem perda de registro ou duplicidade.

Nenhum teste estruturado está autorizado a alterar dados clínicos reais. A cirurgia não gera nova APK e não certifica publicações de terceiros.
