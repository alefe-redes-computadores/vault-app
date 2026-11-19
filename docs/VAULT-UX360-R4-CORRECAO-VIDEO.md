# VAULT UX360 R4 — correção de regressões visuais (19/11/2026)

## Origem, escopo e proteção

Auditoria motivada por vídeo de 03m20s e quatro imagens conceituais enviadas pelo proprietário. Não modificar Home Viva, cuja autoria é do outro chat. Não alterar medicamentos, doses, receitas, DoseLogs, estoque, documentos, tabelas, Supabase, Firebase ou motor de decisões. Somente apresentação, navegação e extração **conservadora e somente-leitura** de embalagens de catálogo.

## Correções ancoradas

1. **Medicamentos — filtros**: remover a segunda grade fixa de sete chips; manter as sete opções apenas no bottom sheet já existente e o filtro ativo como pílula removível. Busca, Lista/Grupos e estado do filtro continuam canônicos.
2. **Medicamentos — Compacto vs Conforto**: Compacto usa regime e tratamento como rótulos leves, sem caixas; resumo operacional em duas linhas sem informação de estoque redundante; princípio ativo permanece somente para leitor de tela. Conforto retém detalhes expandidos. Ambos continuam no mesmo `renderCard` e na mesma Gaveta 360.
3. **Cards — ações**: remover `+1` decorativo minúsculo do botão de menu e ampliar o botão para 44x44 CSS pixels. Ações secundárias continuam no menu; nome mantém abertura da Ficha; microaviso mantém destino Estoque/Receita e alvo de 44px.
4. **Gaveta 360**: aba selecionada branca com texto escuro; ficha em grade 2×2 traz fabricante, via, dose registrada e origem. **Embalagens encontradas no catálogo** mostram somente conjuntos de mesma concentração e forma sólida comprovadas. Quando não verificável, não inferir; permitir ver descrição original.
5. **Home — atalhos**: os dois destinos principais usam piso de 76px (piso tátil dos elementos continua superior a 44px). Não substituir a Minha Saúde pela Home Viva nesta cirurgia.
6. **Home — duplicidade de atenção**: suprimir somente card redundante de continuidade para mesmo **ID exato de medicamento** quando o bloco Atenção já possui alerta de estoque correspondente e oportunidade não urgente. Alertas distintos e urgentes permanecem. A ação do aviso canônico continua acessível.
7. **Explorar — Em foco**: Lucide contextual, chevron à direita, remover prefixo visual repetido `Brain:` e limitar descrição a uma linha; acessos e preferências permanecem.

## Catálogo — casos reproduzidos por contrato

- BUP 150mg: 12, 30 e 60 unidades quando todos os registros do exemplo são 150mg comprimidos.
- Metadona 10mg: ignorar solução injetável `X 1 ML`; aceitar somente o registro do exemplo que explicitamente é `10 MG COM... X 20`.
- Donaren 50mg: ignorar apresentações de 100mg; no exemplo, aceitar somente `50 MG COM... X 60`.
- Se o texto-fonte não contém uma forma/concentração explícita confiável, não emitir chip de tamanho presumido.

**Não são embalagens adquiridas pelo usuário**. Nenhum evento físico é gerado.

## Qualidade e regressões

- 19 arquivos existentes com patch permitido (9 de produto + 10 contratos atualizados); 3 novos (parser, testes e documentação).
- `patch_r4.py` exige âncoras únicas verificáveis para cada alteração, permitindo HEADs descendentes sem confiar em SHA antigo. Âncora divergente, arquivo ausente, stage alterado ou V63 vermelho resultam em bloqueio antes de tocar o checkout real.
- Diagnóstico no clone local, TypeScript global + V63 completo uma vez por candidata comprovadamente idêntica.
- Certificação liga HEAD, dependências relevantes, hash do pacote e hashes dos arquivos novos. Mudanças invalidam o reuso e exigem repetir o V63.
- Instalador verifica integridade SHA, git diff --check, backup seletivo, rollback por hash, allowlist e publicação separada.
- O certificado **não** demonstra homologação visual no aparelho; conferir as duas densidades, aba, filtros, 44px e exemplos reais após publicação.

## Exclusões explícitas

Home Viva, QG3 global, arquitetura de consumo de notificações, agendamentos, doses, estoque, receitas, decisões clínicas, sincronização e migrações ficam fora. A validação do APK real continua obrigatória.

## Checklist Android

- Abrir Medicamentos após reinstalar/recarregar APK/PWA e limpar cache de UI se necessário; verificar que filtros aparecem apenas dentro do bottom sheet.
- Alternar Compacto/Conforto em dois tamanhos de tela; confirmar diferença de altura e nenhuma perda de botão essencial.
- Tocar no nome e no menu de 3 pontos dos cards com várias ações; ambos devem abrir a única Gaveta 360.
- Conferir tarja regulatória, regimes, tratamentos, horário e saldo; alerta micro permanece clicável.
- Abrir ficha de três medicamentos exemplares; conferir rótulo de referência de catálogo, não confundir com aquisição.
- Home: card Medicamentos e Minha Saúde alinhados sem espaço excessivo; nenhum alerta de estoque duplicado para o mesmo medicamento.
- Explorar: em foco com ícone Lucide e sem `Brain:` repetido.
- Confirmar que não houve alteração de doses, saldo, receitas ou notificações.

## FIX5: modernização de contratos, sem regressão visual

A R4 compacta os dois tiles de acesso rápido na Home de min-height 100px para 76px,
acima do mínimo confortável de 44px. O diagnóstico inicial evidenciou que M136
(e outros testes compartilhando a mesma hipótese) ainda exigiam 84/100px.
Foi preservada a implementação de 76px e alterados somente os testes afetados,
sem editar o helper QG1 geral nem seus negativos legados de 84px: 76px passa
apenas para os dois tiles aprovados, 60px falha, destinos e classes de interação
continuam testados. O teste P7 reconhece cor segura sanitizada em rótulos leves
no Compacto e com fundo/borda no Conforto.

Ainda exigidos: V63 completo no clone, TypeScript e diff --check.
Uma suíte verde não dispensa a inspeção do vídeo/Android.
