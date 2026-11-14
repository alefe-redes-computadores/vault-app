# VAULT M148 P3 — Estabilidade de acesso e hierarquia visual

Base imutável do pacote: GitHub main M148 P2 `84ae4727ee2aac4feb3939317dc311905f617e87`.

## O que esta cirurgia altera
- Barra inferior disponível na rota autenticada `/saude/central-m144`.
- Central M144 em cinco áreas montadas sob demanda; histórico mostra 15 registros inicialmente e permite carregar os seguintes, sem omitir registros do repositório.
- Central carregada sob demanda via Next dynamic. Registro no Diário, pessoa ativa, datas, contingência e semântica observacional originais preservados.
- Entrada única da Central em Minha Saúde; removido atalho solto do rodapé da Home.
- Lista de medicamentos: busca exclusivamente pela lupa do cabeçalho; SOS entre os filtros principais; preferências avançadas depois da lista, apresentação de grupos com rótulo explicativo.
- Tarja regulatória vertical interativa preservada; texto horizontal duplicado removido.
- Nome tipográfico em maiúsculas, dose secundária, princípio ativo sempre exibido quando confirmado no catálogo, mesmo quando igual ao nome comercial.
- Etiquetas de laboratório declarado e fabricante da última aquisição com design padronizado e proveniência explícita. Nenhuma marca gerada é declarada como logo oficial.
- Lista única ordenada pelo primeiro horário diário válido; grupos ordenados no próprio contexto. Atenção mantém prioridade clínica antes do desempate por horário. SOS e sem horário ao final.

## Não faz
Não corrige automaticamente dados do catálogo ou confirma classe regulatória só por encontrar uma substância. Não muda receitas, dose, esquemas, eventos, RLS, banco, estoque nem políticas SUS. Não instala APK, não certifica visual Android, não prova causa de todos os travamentos vistos em vídeo.

## Pendências pós-publicação
- Conciliação manual auditada das alterações no checkout local atrasado, sem reset/stash/force.
- Homologação de navegação em APK e PWA: Central M144, retorno à origem, barra inferior, grupos, data/horários; verificar se recargas completas persistem.
- Auditoria dedicada do catálogo regulatório por apresentação e fontes e diagnósticos de `Receita n/c`.
- Horários de tratamentos temporários sem `estoque_horarios` precisam de projeção autorizada por logs/dia antes de ganhar ordenação cronológica.
- Verificação Vercel READY independente do GitHub; APK independente de ambos.

## Gates
`node scripts/test-vault-m148-p3.cjs`, `git diff --check`, `npm run test:release` (V63/V70/TypeScript), índice allowlisted, HEAD/remoto pinados, nenhum build pesado no Android, commit/push apenas após sucesso real.
