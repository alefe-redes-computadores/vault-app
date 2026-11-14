# VAULT M147 P1 — Home operacional e tempo honesto

## Escopo real
- Preserva a decisão de agenda antes do Brain (M145/M146), mas prioriza pendências antigas e horários já passados antes dos horários futuros. Eventos sem horário declarado são identificados como tal; não se inventa pontualidade.
- Resumo conciso do relógio na Home: pendências de dias anteriores, horários que já passaram, compromissos ainda hoje e sem hora definida. Não cria avisos de comparecimento a uma consulta apenas por passar da hora.
- Retiradas passam a ocupar no máximo **um** cartão na primeira dobra, com botão para expandir todas as retiradas, sem apagar registros ou links. Mesmo dia com hora passada recebe rótulo claro.
- Somente alertas informativos relacionados ao **mesmíssimo evento de retirada visível no primeiro cartão** (mesmo ID de retirada e destino interno) viram descrição embutida no cartão. Sinais urgentes, vencidos, estoque, receitas, regulatórios, Brain e eventos de outra retirada permanecem independentes. Não se agrupa medicamento por nome.
- O acompanhamento de quantidade confirmada é acessível em expansão, sem duplicar cartão na primeira dobra, exceto severidade crítica/importante (abre visível). Brain e seu painel permanecem acessíveis.
- Não muda critérios de doses, interpretação médica, sincronização, banco, acesso, status, estoque ou prescrições. Não adiciona dados clínicos.

## Honestidade do escopo
- O resultado reduz repetições e dominações visuais, mas não funde todos os sinais diferentes do mesmo medicamento num único card nem refaz a lista de medicamentos; essas operações continuam reservadas à M148 sob critérios clínicos próprios.
- Também não elimina responsabilidades de verificação real: PWA/APK, atualização de versão, deep links, horários extremos e acessibilidade precisam de conferência.

## Arquivos
- Novo `lib/home/home-agenda-m147.ts`: relógio local, ordenação estável, equivalência estrita por ID/rota, preservação de alertas.
- Novo `scripts/test-vault-m147-p1.cjs`: contratos de lógica e integração.
- Novos docs. Modifica somente `app/page.tsx` e adiciona teste ao V63.

## Proteções
- worktree isolado, `git fetch` e merge `--ff-only` antes do patch; rollback apenas do próprio conteúdo; branch de backup; SHA256, recibo assinado por SHA256 do código/dependências/ferramentas; `tsc --noEmit`, `npm run test:release`, `git diff --check`; allowlist explícita, push normal só com HEAD remoto idêntico.
- Não usar `git add -A`, `reset --hard`, `clean`, `stash`, nem força. Se outro chat publicar, revalidar em novo HEAD.

## Testes no Android e PWA
1. 20h28: retirada aberta marcada 17h38 não aparece como "próxima"; outra para 22h continua "ainda hoje".
2. Diferenciar uma retirada atrasada no dia anterior, uma retirada sem horário e outra futura. Nenhum registro some após expandir.
3. Clonazepam com retirada + evidência de dose confirmada: evitar cartão repetitivo na primeira dobra; evidência permanece localizável e clicável.
4. Aviso clínico grave não se transforma em alias da retirada; M143/M146 e Home Brain continuam intactos.
5. Trocar de pessoa e reconectar offline; não carregar informações de pessoa anterior.
6. Captura de tela compacta após expansão e no modo letras maiores.
