# VAULT PL7-P2 — PharmaLens V7 | macrocirurgia funcional

## Objetivo

Concluir a primeira experiência end-to-end de leitura do PharmaLens, preservando o trabalho do outro chat na área de fornecimento e a fundação PL7-P1 já instalada.

## Entrega

- `/saude/pharmalens` — central premium, seletor sem `<select>` nativo, busca, janelas 7 e 30 dias, agrupamento de fabricantes e aquisição selecionada.
- Integração em `Detalhes do medicamento` via ClinicalDisclosure, com contadores e laboratório da última aquisição documentada.
- Entrada na Fênix M122 dentro de `Minha Saúde`, sem modificar o motor central do Brain.
- Relatos M127/M129: motor PL7-P1 preservado, comparação observacional por fabricante com qualidade e data confirmada.
- DoseLogs: separa programadas tomadas, SOS/extra **efetivamente tomadas** e doses explicitamente ignoradas. Sem inferir tomas ausentes.
- Confounder Shield prudente: dias com doses ignoradas de outro tratamento marcado `continuo`; `sem_estoque` só quando explicitamente declarado. Não presume abstinência.
- Samsung Health/Health Connect: dias e fontes documentadas, sem correlação causal nem falsa janela de 10 horas.
- Consulta Brief: resumo para copiar localmente, sem envio automático a terceiros.
- Conta + pessoa isoladas por índice Dexie, consultas de biometria/doses limitadas a 30 dias. Nenhuma mutação.

## Limites

Não altera dose, estoque, prescrições, Supabase, Dexie migrations, RLS, Health Connect, central do Brain nem Avatar 3D. Não representa farmacocinética nem dá instrução clínica. Não publica o APK antes de Action certificada.

## 10 arquivos alterados/criados

8 arquivos novos listados em `FILES.txt`; 2 páginas existentes listadas em `PATCHES.txt`, com inserções ancoradas. Fundamentos PL7-P1 reaproveitados intactos.

## Instalação segura

`bash VAULT-PL7-P2-PHARMALENS-MACRO/INSTALAR-VALIDAR.sh`

Verifica pacote SHA-256, base PL7-P1, branch main, worktree rastreado limpo, não-sobrescrita, âncoras únicas, backup individual, testes P1 + P2, M142 quando disponível, TS e gate global V63 (`npm run test:release`). Falha -> restaura só as 2 páginas e remove só os 8 arquivos novos, preservando P1. Não cria commit/push.

## Publicação separada

Somente após a outra frente corrigir a Action M140/M142 e o gate global passar, execute `bash VAULT-PL7-P2-PHARMALENS-MACRO/PUBLICAR-APOS-GATES.sh`.

O publicador confirma `origin/main == HEAD`, restageia explicitamente apenas os arquivos PL7-P1+P2, executa gate global, tsc e diff e faz push normal. A Action Android certifca depois do push; falha nela não vira sucesso presumido.
