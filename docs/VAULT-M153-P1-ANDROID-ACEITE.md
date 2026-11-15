# VAULT 360 — Checklist de homologacao P5 P5 / M153

A compilacao do APK **nao** prova homologacao. Use fixture artificial em ambiente de teste, nunca doses reais da conta.

- [ ] Confirmar hash do APK e commit real de `main`, instalar no dispositivo e comparar versao interna.
- [ ] Android 320/360/390/430px + rotacao: safe area, bottom nav, teclado, voltar, CTA sem cortes.
- [ ] Hoje abre doses na primeira dobra, `?focus=doses` funciona; filtros preservados.
- [ ] Home coloca rotina e entradas principais antes de compromissos e Brain; sem duplicar a mesma retirada por ID.
- [ ] Clonazepam -> preparar receita -> anexo clinico (nao Cofre Pessoal), salvar/cancelar/voltar.
- [ ] Tramal SOS tomado vs previsto/ignorado: sinal sem falso diagnostico; apenas fatos confirmados.
- [ ] Cerumin dose explicitamente amanha: nao entra como hoje nem altera o log.
- [ ] React #310 em lote com falta de estoque: sem crash e sem marcar tomada ficticia.
- [ ] Retirada ja realizada com link de recebimento nao mostra CTA da mesma; outra aberta continua visivel.
- [ ] Explorar 22 destinos / busca 'remedio', 'medicamento', 'receita', 'SUS' / retorno contextual.
- [ ] Fenix 3D: cabeca, pes, bone, oculos, tenis; GPU, fallback e dispositivos reais sem medidas inventadas.
- [ ] Brain M152B OFF: nao cria prompts silenciosos, nao sincroniza dados ocultos; opt-in por pessoa so apos liberacao formal.

Registrar prints e resultado por item. Falha de uma etapa ≠ release homologado.
