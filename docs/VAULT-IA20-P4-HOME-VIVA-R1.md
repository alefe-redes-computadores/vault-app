# VAULT 360 — IA 2.0 P4 | Home Viva, Hub Saúde, Explorar e Fênix Premium

**Data de preparação:** 19/11/2026 • **Fase:** pacote candidato de diagnóstico • **Base de UI auditada:** `d2a9e1d3d4f0fc0aeab9b711bfe223dd882326ac`.

## Alterações pretendidas, verificáveis

1. Home: bloco `HomeVivaP4` substitui *na renderização da Home primária* o acesso estático «Minha saúde»; o atalho Medicamentos continua ao lado, os cards de Brain `HomeActionNowCardP7R3`, `HomeDailyHero`, atenção, compromissos e CareFlow mantêm autoridade e posições. Não cria novo Brain.
2. Modelo `buildHomeVivaFrontsP4`: somente dados já presentes em medicamentos, consultas e CareFlow M2 com `user_id` e `person_id` da pessoa ativa. O motor da agenda temporária fornece início e fim de período declarado, nunca leitura de adesão, lote ou estoque. Ordem: período temporário vigente, monitoramento registrado vigente, consulta realizada recente e rotina padrão. O critério de consulta é janela conservadora de até três dias civis, não prova de 72 horas exatas quando o horário for desconhecido. Abas internas apenas quando há pelo menos duas frentes simultâneas.
3. Hub Saúde: cabeçalho reduzido, seis acessos rápidos compactos, favoritos com `Star`/duas colunas como Explorar, organização acessível por arrastar e botões subir/descer, busca e rede preservadas. A lista «Em foco agora» vira linhas verticais com Lucide, motivo e seta, sem card horizontal cortado. Conta e pessoa são chaves locais das preferências.
4. Catálogo: rótulo único «Fênix e Perfil Clínico» na entrada da área; `minha-saude` permanece como id do catálogo, enquanto o módulo canônico de favoritos é `fenix`. Preferências antigas `minha-saude` migram para `fenix` *em memória* com dedupe e persistem na próxima operação do usuário.
5. Fênix: rota realmente própria `/saude/fenix`, usando o mesmo componente de dashboard existente via import, com seleção contextual `usePathname`. O Hub Saúde só exibe card de navegação para Fênix; os dados completos e as cinco áreas Fênix/Análises/Fontes/Indicadores/Histórico, Avatar 3D, perfil, editora de dispositivos, leitura de biomarcadores, PharmaLens, Brain e segurança clínica continuam no componente original, sem cópia de dados. Hashes antigos do hub são enviados para a rota nova e a volta considera `return_to` seguro.
6. Explorar: Em foco já utiliza a autoridade `buildHealthFocusR5`; cards mantêm mesmos favoritos, com linha vertical, ícone e CTA de navegação. Sem um segundo catálogo, sem novo localStorage e sem inventar ações.

## Segurança e regras que o código NÃO muda

- Nenhum banco, Supabase, SQL, schema, repositório de DoseLogs, tratamento, prescrição, receita, retirada, estoque, mensagens ou notificações.
- Tratamento temporário ativo NÃO prova tomada; datas de conclusão NÃO são inferidas; ausência de log não é não adesão; Brain não prescreve.
- Nenhum arquivo do núcleo D4 P5 alterado pela IA 2.0 P4.
- Sem `git add -A`, `git reset --hard`, `git push --force`, patch de checkout com HEAD divergente ou supressão de teste para ficar verde.
- A P4 de UI não deve ser confundida com a **D4 P4 de auditoria nativa de notificações** (frente clínica distinta).

## Contratos e integração

- 13 modificados e 6 novos; gate V63 registra exatamente um teste IA20 P4, preservando D4 P5, UI360 R5, P1–P3, QG1/QG2 e V31.
- `DIAGNOSTICAR-TUDO.sh`: clone isolado sem push, 500+ contratos `.cjs` e `.mjs` individualmente com todas as falhas acumuladas, V70, TypeScript e `git diff --check`; grava `ENVIAR_PARA_ANALISE-IA20P4.zip` em pasta privada.
- `APLICAR-VALIDAR.sh`: somente diagnóstico do mesmo HEAD e mesma candidatura aprovado; copia backup seletivo, aplica os 19 caminhos auditados e executa uma bateria integral no checkout real. Falha dispara rollback seletivo somente quando os hashes ainda correspondem.
- `PUBLICAR.sh`: separado, hashes de pós-gate, allowlist exata, HEAD/origin atualizados, stage exato e push sem força.
- Metas de validação: 320/360/393/430dp, RTL/safe-area Android, botão FAB visível, legibilidade, favoritos de dois perfis distintos, retorno e links profundos. **Validação real no Termux/PWA/APK ainda NÃO ocorreu nesta preparação.**

## Atenção à concorrência

O relatório V15 descreve UX360 R4 em outra frente, com alteração de densidade e parser farmacêutico. Se aquela cirurgia publicar mudanças nos mesmos arquivos de Home, Hub ou Explorar, o blob SHA-1 do `patch.py` reprova; é necessário revisar o diff e reconstruir sobre HEAD atual. Nunca ignorar essa trava para publicar uma UI ultrapassada.

## Roteiro de inspeção visual no aparelho

1. Início: dois blocos principais *Medicamentos* e *Contexto Viva* sem card estático duplicado. Sem caso ativo: rotina neutra; somente tratamento: um card; tratamento+consulta: seletor contextual visível.
2. Saúde: identificar imediatamente acessos essenciais; favoritos estrela, 2 colunas (1 em 320dp), lista Em foco vertical, Fênix como card único e FAB sem sobreposição.
3. Fênix: tocar o card e verificar URL `/saude/fenix`; navegar pelas cinco seções, testar Avatar e edições, voltar à origem e trocar pessoa sem mostrar dado anterior.
4. Explorar: abrir Fênix e conferir os mesmos favoritos/nomes; buscar por «minha saúde», «Fênix», «perfil» e «pressão».
5. Testar links antigos `/saude/minha-saude#meu-avatar`, `#fontes`, `#indicadores` e `#historico`; confirmar redirecionamento ao destino dedicado.
6. Conferir os 25 itens B1–B5 do histórico do V15 e os 7 achados UX360 R4 em contexto real; não declarar concluído antes de observar no APK.

## Próximo marco

**QG3 integrado** depois da homologação da IA20 P4 e UX360 R4 no Android. Iniciativas separadas: D4 P4 auditoria nativa sob toque, validade após abertura pela bula/produto exato, comparação de episódios documentados, plano médico de crise, PDF seletivo verdadeiro, P4-E curadoria regulatória, sync E2E dois dispositivos, Fênix Studio/GPU e Android notifications E2E. Nenhuma está automaticamente entregue por este ZIP.
