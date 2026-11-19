# VAULT CAREFLOW 360 — P0/P1 R1

Base auditada: HEAD 473f6ebd3b4168fb644c72f668d4bfb60b461209, 19/11/2026.

Este pacote implementa correções concretas de rastreabilidade, leitura e UX CareFlow. Fonte de requisitos: dossiê definitivo do vídeo de oito minutos e PDF original Gemini. Fronteira: `app/saude/careflow/**`, projeções `lib/m3/**`, testes e gate V63; sem alteração de schema, dose, estoque, Home Viva, Fênix ou BottomNav.

Garantias: registros de dose e medições só podem ser abertos pelo ID real e escopo conta/pessoa; períodos com aria-pressed; retorno contextual com datas/filtros; linguagem sem códigos técnicos; exames sem estado global compartilhado; históricos reorganizados; sinais de intensidade apenas descritivos, sem diagnóstico. Eventos e PDFs só são gravados após ação explícita.

Não confundir qualidade do código e testes com aceite visual Android. Teste no APK: períodos 7/15/30/90/custom, doses por nome e origem, retorno, buscas, exames manuais pré-marcados mas não confirmados, OCR duvidoso até revisão, dois exames com estados diferentes, sintomas, documentos e pressão. Se algo não tiver ID resolvido, informar indisponibilidade — nunca inventar vínculo.

Diagnóstico em clone privado + todos os contratos V63 + TypeScript + diff; a aplicação só ocorre depois. Publicação separada, com comparação de hashes contra a aprovação e `git add` limitado à allowlist.

Pendências explícitas fora deste R1: vínculo opcional de pressão com consulta e sintoma sem modificar o schema, tradução total nos PDFs históricos antigos, renderização visual real do APK e ajustes do pós-vídeo não cobertos por testes automatizados. Este pacote não reivindica conclusão dos 51 itens do dossiê.
