# VAULT V201 — Cirurgia recuperada/reconstruída

Base exigida: `688b5cf3b4beede5366e3856e6d3cd3f988eb600` (V200).

Esta reconstrução NÃO é uma cópia do patch perdido no Work. Recupera seu escopo de quatro frentes a partir do estado público da V200.

1. Cofre Pessoal: seletor de bancos local e pesquisável nos formulários de nova/editar conta e novo/editar cartão. Mantém entrada manual e valores legados; usa o catálogo já existente; não cria entidades de banco duplicadas.
2. Isolamento de pessoa: os hooks de lista de contas/cartões e credenciais não consultam nem retornam dados antes de existir pessoa ativa; mantém fluxo explícito de legado quando uma pessoa está selecionada.
3. Diagnóstico manual: cobertura de cofres, credenciais, cartões, documentos, rede clínica e fornecimento; número de consultas simultâneas limitado a quatro; leitura remota somente após toque no ícone de verificação; visão do último teste; nenhuma gravação.
4. Avatar: linha frontal de cabelo em malha estática quando modelo está sem boné e com cabelo curto/degradê, sem loop extra.

Segurança: nenhum novo endpoint, sem mudanças Supabase/Postgres, sem mudança em dose logs, estoque, prescrição, registros históricos ou sync engine.

O instalador valida HEAD V200, integridade Git, âncoras, TypeScript, teste V201 e npm run test:release; rollback automático em erro. --publicar opcional, faz push somente após todos os gates.
