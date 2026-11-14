# VAULT M150 P3 — Identidade visual Venvanse + Fast Lane GitHub

Base observada: GitHub main `106e641a4761cb4cae01728c1f0d65c59a1c885e` (M150 P2 FIX1). Este pacote **não publica a main**. Se o Work avançar a main sem alterar os arquivos protegidos, o instalador aplica a mudança sobre o novo HEAD. Havendo colisão, bloqueia sem sobrescrever.

## Correções da Frente A

1. **Cards na referência Venvanse:** uma linha de fabricante + origem + posologia, sem dois badges consecutivos; fabricante de aquisição e etiqueta cadastrada continuam fontes separadas na descrição acessível e nos detalhes. Nenhum nome é inferido do princípio ativo ou de embalagem física.
2. **Ações:** no máximo um CTA primário; demais operações ficam acessíveis em `Outras ações`. Medicamento suspenso não recebe CTA primário; exceção histórica conserva aviso.
3. **Filtros 2×2:** Contínuos, Por período, Controlados, Encerrados com alvo mínimo de 44 px; sem última célula órfã em terceira coluna.
4. **Receituários:** notificação B exibe azul, A amarelo, receita de controle especial neutra/branca; classificação declarada recebe informação de não confirmada até existir evidência do catálogo. Cores não equivalem à tarja da embalagem nem comprovam classificação por substância. Matching por concentração/apresentação continua sujeito a homologação adicional.
5. **Mapa:** seis famílias semânticas de cor, preservando 22 rotas, busca e retornos seguros.
6. **Densidade:** seleção Compactos/Conforto permanece; uma instância no código. Duplicação relatada visualmente ainda exige conferência no aparelho.

## Testes e publicação

- Novo contrato M150 P3 executado pelo V63.
- Legados modernizados **somente onde a marcação JSX antiga ficou obsoleta**: M149 (dois badges), M132 (grade 3+1) e P15 R9 (origem híbrida). As verificações de pessoa/estoque/receitas/doses permanecem.
- **Termux:** trabalho isolado, SHA/allowlist e 13 verificações direcionadas; sem rodar V63 local e sem build de APK.
- **GitHub Actions:** candidato em branch `vault/fastlane/**`, permissão `contents: read`, sem APK/release. Executa a mesma lista integral V63, ambos os V70 e TypeScript, com todas as falhas em um relatório único. A execução integral é indispensável antes de promover.
- **Main:** após conferir o verde e SHA candidato, integrar por avanço protegido. Workflow Android existente repete gate e compila/assina/publica APK.

## Não incluído

Home, Hoje, Mais, flash preto de transição, formulários/motores Brain e Fênix ficam nas próximas etapas. Não há mudanças de dados clínicos, Supabase, sync, dose, estoque, pessoa, notificação, migração ou BrainActiveProbingEngine.

## Segurança de coexistência com o Work

- Checks de blob dos arquivos atuais; mudanças do Work nos mesmos caminhos bloqueiam.
- Backups de status/diffs, worktree isolada, staging por allowlist; sem `git add -A`, reset, stash, rebase, force push ou push na main.
- Branch candidata **não** cria APK e não pode publicar release com token read-only.
- Se um gate reprovou, não promover nem silenciar teste legado.

## Homologação visual Android

Clonazepam, Zolpidem, Venvanse, Tramal, Metadona, Bupropiona, Donaren, Fenergan e Tadalafila: card com miniatura, nome/dose, princípio, procedência única, saldo/rotina visíveis; ações secundárias e SOS suspenso acessíveis; filtros em grade 2x2, mapa com cores; testar identidade proveniente de fontes distintas; validar a tarja declarada versus verificada; conferir Compactos/Conforto persistente.

## Regulação

Fontes oficiais: Anvisa, lista atualizada RDC 1.036/2026 e modelos de receituário físico vigentes (Versão 2 desde 18/05/2026). Verificar a classificação legal de cada apresentação antes de afirmar catálogo confirmado. Cor UI não determina controle legal.

## Emenda R2 — compatibilidade com Work M152B

A partir da M152B, o V63 pode receber novos contratos de BrainActiveProbingEngine, Dexie V2 e sincronização. Por isso o patcher R2 não compara o hash antigo do manifesto V63 nem substitui seu final: acrescenta exclusivamente M150 P3 e confere que todos os contratos do Work foram preservados. Os demais sete hashes continuam protegidos: colisões reais exigem nova reconciliação. O instalador também exige que M152B seja ancestral da main remota, e nunca publica a main diretamente.

**Auditoria de GitHub M152B publicada (`8b1fb39b`)**: os sete blobs protegidos e o manifesto V63 continuaram iguais aos da M150 P2. A M152B incluiu `scripts/test-vault-m152b-final.cjs` (25 verificações), mas ainda não o registrou no V63. O patch R2 cadastra este teste e o novo M150 P3 juntos, preservando todo o manifesto; ambos rodam no Fast Lane e, após promoção, no `test:release` padrão. Preflight Termux passa a ter 13 testes direcionados (o 13º é o contrato M152B).
