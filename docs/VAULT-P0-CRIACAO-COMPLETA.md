# VAULT P0 GLOBAL — Criação visível após IA 2.0

Base mínima: UX360 R5 `7060755890042e3c75f68b938231b6fe2f12468b`.

## Achado

O componente `ContextualCreateP2` existe e as 19 listagens estão mapeadas, porém ele era colocado na mesma faixa horizontal de `rightAction` do `ListPageHeader`. A UI não assegurava espaço autônomo para a entrada de cadastro em 320–430 dp. Como `BottomNav` suprime Compose justamente nas listagens com criação no header, uma falha de exposição nessa faixa deixa o usuário sem caminho de criação perceptível. A imagem real de Medicamentos confirma esse sintoma; nenhum teste P2/P3 anterior comprovava a montagem responsiva final. Não é possível excluir cache de APK/PWA como causa adicional sem homologação no dispositivo.

## Correção

- O CTA único migra para uma linha visível própria dentro do `ListPageHeader`, antes das ferramentas da lista.
- Em telas estreitas, ocupa toda a largura útil com rótulo completo e ícone Lucide; em >=640 px, ajusta-se ao conteúdo.
- `suppressCreate`, catálogo de ações, `return_to`, vibração, feedback de navegação e alvo de 44 px permanecem.
- Medicamentos remove exclusivamente o atalho auxiliar **Retiradas** do topo. Retiradas continua pela tela própria e pelos fluxos operacionais.
- Empty states de Tratamentos, Retiradas, Cartões, Contas, Cofres e Senhas preservam mensagens e filtros, mas não repetem o CTA de criação agora presente no cabeçalho.
- Nenhuma modificação em `components/BottomNav.tsx`, `app/hoje/page.tsx`, `app/documentos/page.tsx`, `app/mais/page.tsx` ou `scripts/test-v63-release-gate.mjs`.

## Matriz canônica — 19 listas

| Lista | Destino da ação |
|---|---|
| Medicamentos | `/saude/medicamentos/novo` |
| Tratamentos | `/saude/tratamentos/novo` |
| Receitas e aquisições | `/saude/renovacao/nova` |
| Retiradas | `/saude/retiradas/nova` |
| Consultas | `/saude/consultas/nova` |
| Exames | `/saude/exames/novo` |
| Cirurgias | `/saude/cirurgias/nova` |
| CIDs | `/saude/cids/novo` |
| Médicos | `/saude/medicos/novo` |
| Farmácias | `/saude/farmacias/novo` |
| Hospitais | `/saude/hospitais/novo` |
| Locais | `/saude/locais/novo` |
| Registros | `/saude/registros/novo` |
| Fornecimento | `/saude/fornecimento?action=novo` (inline, sem CTA durante formulário) |
| Pessoas | `/pessoas/novo` |
| Cartões | `/cartoes/novo` |
| Contas | `/contas/novo` |
| Cofres | `/vaults/novo` |
| Senhas | `/senhas/novo` |

## Exceções legítimas

`/documentos` e `/saude/documentos` conservam o Compose inferior de ação única; `Hoje` e hubs (`/saude`, `/saude/minha-saude`, `/saude/rede`, `/saude/mapa`, `/saude/careflow`) conservam Compose multifuncional. `Lembretes` já tem `Criar lembrete` próprio, evitando duplicação. Essas superfícies não são modificadas por conflito com IA 2.0 P5/QG3. A antiga mensagem de Documentos Clínicos sobre “menu inferior” não foi reescrita para evitar mudança fora da allowlist P0; sua revisão deve ser conciliada com o outro chat.

## Provas automatizadas e limites

O teste P0 faz renderização React SSR do cabeçalho **real** para as 19 rotas com componentes reais compilados por TypeScript, conta as entradas de criação no HTML, verifica formulário destino, `return_to`, exclusividade contra Compose, tamanho e classes responsivas. Verifica ausência em edição inline, fallback nos hubs, ícones e nenhuma criação no botão. SSR não reproduz medições CSS/viewport nem garante que a versão atualizada chegou ao Android; 320/360/393/430 dp exigem inspeção visual após publicação.

Pré-diagnóstico cria clone isolado e executa o teste P0, TypeScript e toda a bateria V63 (CJS + MJS + os dois V70) sem interromper a primeira falha; registra hashes, HEAD e dependências. Aplicação no checkout real só com certificado correspondente. Publicação separada, Git add explicitamente na allowlist, backup/rollback seletivo. Nenhum registro clínico é escrito.

## R1 FIX1 — sem redundancia de icone
O CTA **Novo Medicamento** renderiza **Plus** (Lucide). A identidade farmacologica continua na lista/formulario e a acao de criar fica semanticamente explicita. Outros CTAs preservam seus icones de dominio. O teste P0 agora verifica o SVG renderizado, nao apenas a importacao JSX.

## R1 FIX2 — Iconografia universal e feedback contextual

- **Todas as 35 ações canônicas do catálogo Compose** passaram a usar o Lucide **Plus (+)**, incluindo criação nos 19 cabeçalhos e fallbacks dos hubs/Documentos, sem tocar na `BottomNav` da P5/QG3. O catálogo preserva os IDs, rótulos, destinos e `return_to`.
- `getIa20CreateAccent` e `getOptionColorClass` conservam cores por entidade; o símbolo (+) significa **ação**, não identidade do medicamento/documento.
- `ContextualCreateP2` usa haptics e o `ToastProvider` existente para um toast curto **“Abrindo ...”** ao iniciar navegação. Não confirma salvamento, dose ou qualquer evento clínico. Feedback de navegação em andamento, timeout de recuperação e proteção contra toque repetido permanecem.
- Os seis EmptyStates impactados continuam com título e ícones de domínio, mas orientam para **uma única ação do topo**, sem renderizar segundo botão de cadastro. Filtrar/limpar resultados continua separado.
- Navegação inferior, Hoje, Mais, Documentos P5, motores e sincronização não são alterados.
