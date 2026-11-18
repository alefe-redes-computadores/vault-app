# VAULT 360 · UI360 R5 — Health Hub Inteligente e Rede de Saúde

## Base e fronteira

Base publicada R4: `baa29efad5574a1b13d529027fb50c84a3d404f3`. O pacote não requer uma `main` congelada: aceita HEAD descendente desde que os arquivos alterados por esta cirurgia (exceto o gate V63, mesclado por âncora) conservem os blobs aprovados na R4. Se o outro chat modificar a mesma superfície, o preflight bloqueia sem escrever código.

**Minha Saúde:** `/saude/minha-saude` (rota original); `/saude` continua redirecionando para a Home. **Minha Rede de Saúde:** `/saude/rede` (rota original). Nenhuma nova autoridade médica, SQL, migration, endpoint, serviço ou remanejamento de registros.

## Entregas UI

1. **Home:** subtítulo Minha Saúde = "CareFlow, exames, sinais e dossiê"; rotas do HomeCommandCenter intactas.
2. **Hub Clínico:** três camadas, todos os links para áreas já existentes. Fixados aparecem somente após fixação; modo Organizar com drag de `framer-motion` **já instalado**, além de subir/descer. Estado local validado e isolado por `userId/personId`; informações persistidas são somente IDs de módulos (não dados clínicos).
3. **Em Foco Agora:** até quatro cards de consultas agendadas, consultas marcadas como realizadas, plano real, item real sem resultado e, quando existir rota canônica exata, sinal Brain ativo. Nenhuma pendência inventada. Duplica favoritos? Não. Sem evidência: últimos módulos explicitamente abertos neste Hub; sem histórico: seção desaparece.
4. **Grade:** quatro categorias e paletas distintas; ícones Lucide; busca sem acentos cruza módulos de Saúde e Rede; sem bibliotecas adicionais.
5. **Fênix, Avatar, fontes, indicadores, histórico, plano de segurança e painel antigo:** preservados. O painel detalhado de Minha Saúde é recolhível, com suporte a `#meu-avatar`, `#analises`, `#fontes`, `#indicadores`, `#historico`. Isso mantém os motores e contratos clínicos íntegros.
6. **Rede:** alternância em um toque nos dois hubs; acesso principal reorientado a médicos, unidades, fornecimento e agenda. Blocos clínicos redundantes continuam acessíveis sob demanda, sem competir pela primeira dobra nem perder funcionalidades.
7. **Chips relacionais:** pedidos de exame com `doctor_id`, `location_id` e `related_id` mostram chips clicáveis **somente** se IDs/conta/pessoa forem confirmados. Detalhe do médico mostra pedidos CareFlow explicitamente vinculados à mesma pessoa. Nada de inferência por nome.

## Não afirmado como concluído

- "Recentes" referem-se a módulos **abertos por este Hub** neste aparelho, não a visitas registradas por outras rotas ou aparelhos.
- A R5 não inventa recursos M3 P2/P3. OCR, notificações e PDF seguem os estados reais de seus módulos existentes.
- A R5 não sincroniza favoritos entre dispositivos; a ordem é local ao aparelho e escopada por identidade.
- O R5 não modifica saldo de medicamentos, retiradas, terapias, receitas, recomendações nem bancos de dados.
- GitHub publicado ≠ APK atualizado ou homologado.

## Gate e segurança de engenharia

A cirurgia valida HEAD/ancestralidade R4, blobs Git dos arquivos-alvo, SHA256 de todo o pacote, âncoras únicas e allowlist. Aplica em worktree isolada com backups de cada blob rastreado. Executa contratos R5 comportamentais, TypeScript, vetor V63 acumulado, R2/R3/R4/R5, V70 e V63 oficial. Publicação é manual, no commit exato da sessão; `git add -- <allowlist>`, push normal, sem `git add -A`, hard reset, clean ou force push.

## Homologação Android após aprovação

- Trocar pessoa ativa: favoritos e histórico do outro titular não aparecem.
- Fixar/desafixar, arrastar e usar botões subir/descer, fechar/reabrir.
- Testar 320px, 360px, teclado e leitor de tela; scroll horizontal isolado e `prefers-reduced-motion`.
- Buscar com duas letras, nomes acentuados e "médico" (resultado da Rede).
- Tocar em Fênix, fontes, indicadores e histórico: abrir painel existente na seção certa.
- Confirmar que uma consulta cancelada, retirada concluída e plano expirado **não geram providência nova**.
- Alternar Saúde ↔ Rede em um toque; médicos/local/careflow vinculados por IDs.
