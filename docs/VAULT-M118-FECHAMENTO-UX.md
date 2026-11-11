# VAULT M118 — Fechamento global de UX e evidências

Base **M117**, commit `568ea6483601d8f8168c1cf8acaee81157a5b5f6`.

## Escopo implementado — sem segunda autoridade de dados

1. **FAB contextual:** em Linha de cuidado, Tratamentos, Retiradas e Receitas/Aquisições, remover o CTA genérico redundante do cabeçalho. `BottomNav` já fornece a ação contextual exata nas quatro rotas. Preservar atalhos de registro específico (`+ Humor`, `+ Sintoma`), botões de formulários, estados vazios e criação de documentos vinculados. Em Fornecimento, retirar apenas a repetição em lista de processos ativos.
2. **Minha Saúde:** mostrar os cinco destinos na mesma linha (`ClinicalSectionNav` já suporta cinco compactos); colocar a navegação primeiro, manter o Avatar em destaque e agrupar Panorama, Mapa do Cuidado 360 e áreas relacionadas em uma entrada identificável, sem excluir os três módulos.
3. **Modo Essencial:** tornar a preferência existente visível na primeira parte da Home e preservar chave, comportamento e filtragem do `HomeCommandCenter`. Só um controle de alternância; sem outra Home.
4. **Linha de cuidado:** não elevar o “D” de “de” em mês do português; mudar o rótulo da âncora para “Atalhos” porque ela navega à seção, não cadastra um registro.
5. **Plano pessoal:** contar contatos estruturados como parte 7 de 7 no progresso, sem alterar seu conteúdo, cifras, consentimento ou persistência.
6. **Brain:** quando o alerta já possui link para histórico de doses, o CTA informa isso claramente. Alertas longitudinais com aumento registrado abrem uma revisão **somente leitura** das tomadas confirmadas nos últimos 28 dias, agrupadas por data, com atalho para o dia no histórico e acesso ao fluxo canônico de revisão. Nenhum log é alterado no painel, e dias sem registros não significam que uma dose não foi tomada.
7. **Diário privado:** roteiro opcional com situação e percepções antes/depois. Gera texto para o **editor existente**, não salva automaticamente. Apenas notas explicitamente marcadas e preenchidas mostram comparações privadas na própria tela; sem Brain, sincronização, classificação clínica ou inferência de eficácia. Proteção local, separação conta/pessoa e exportação seletiva originais preservadas.

## Não incluído / depende de homologação

- Nenhuma correção de data histórica de retirada sem reproduzir o caso real (09/10 vs 10/09). Este release somente melhora apresentação do mês.
- Nenhum prazo SUS universal, prescrição, alteração farmacológica, nova regra de dose, atualização nativa ou envio a contatos.
- A inspeção de todos os formulários, comportamento offline, Android com uma mão, fonte ampliada e navegação em aparelhos reais precisa de QA manual.
- Revisão de evidência do Brain: para padrões de dose longitudinal, conferência do **dia** no histórico; edição detalhada só pelo fluxo já existente. Outros padrões não ganham IDs de origem inventados.

## Gates

- Pré-voo: repositório main sem modificações, HEAD local/remoto exato, blobs rastreados e âncoras verificadas, arquivos novos ausentes.
- Backup seletivo de arquivos rastreados; rollback somente pré-commit, preservando terceiros.
- `git diff --check`, contratos M118, `tsc --noEmit`, `npm run test:release`, `npm run check:versions`, escopo e SHA256 final.
- Publicação separada, com hash de estado do backup; **não publicar** automaticamente.

## QA sugerido no Android

1. Verificar Modo Essencial na primeira dobra; alternar e voltar até a Central de Saúde e Rotina: áreas secundárias respondem sem repetir o interruptor.
2. Confirmar cinco abas de Minha Saúde visíveis de uma vez, todas alcançáveis, Avatar preservado, e expansão de Panorama/Mapa/relações.
3. Conferir `+` inferior nas páginas Tratamentos, Retiradas, Aquisições e Linha de cuidado; atalhos específicos e estados vazios intactos.
4. Abrir alerta longitudinal de uma **pessoa de teste** e tocar “Revisar registros de doses”; conferir 28 dias e navegação a um dia. Não deve alterar tomadas.
5. Testar plano de segurança vazio, só contatos, só texto e todos preenchidos (0–7, barra <=100%).
6. Em diário de teste, preencher antes/depois, preparar texto, revisar e consentir em salvar. Ver a comparação **somente** no diário desbloqueado, sem envio automático.
7. Testar tema escuro, teclado, telas pequenas, alvos de toque, voltar, offline e troca de perfil.
