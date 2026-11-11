# VAULT M122 R1 — Fênix + Brain: lente factual de evidências

## Escopo publicado mediante gates
- Lente premium, expansível, próxima ao Avatar na tela Minha Saúde. Categorias: medicamentos, tratamentos, doses com desfecho explícito, registros de saúde, consultas e documentos da saúde.
- Janelas reais de 7/30 dias para **eventos**; medicamentos e tratamentos são **cadastros atuais**, sem falsos indicadores de adesão ou conclusão.
- Exemplos com origem navegável, datas de cadastro/evento diferenciadas, até três exemplos por categoria; botão para abrir a área completa.
- Insights já gerados pelo Brain aparecem como **visão independente**, com contagem/amostra declarada no recibo M119, sem pareamento automático de relações. O detalhamento usa a folha de evidências existente.
- Link de volta para a lente na trilha Fênix/Brain M102P3 já existente.
- Nenhum novo ledger, chamada de rede, integração, leitura adicional Dexie, write, autolink, regra diagnóstica, cálculo de dose ou alteração do motor do Brain.

## Autoridades / proteção
- `HealthInsightContext` do motor canônico, filtrado pela conta e pessoa autenticadas **novamente** na projeção pura.
- Sem usuário/pessoa iguais ou com data impossível, a lente retorna estado indisponível, sem dados privados.
- Fênix não diagnostica a partir da aparência. Alertas, plano operacional e linha do tempo seguem autoridades independentes.
- Ausência de registro nunca significa falta de cuidado ou omissão; datas administrativas não são mostradas como datas clínicas.
- Nenhuma informação é transmitida, gravada, exportada ou compartilhada ao abrir a lente.

## Gates e limites
- Gate rápido M122 executa testes puros e análise sintática, segurança e contrato visual.
- Gate global `scripts/test-v63-release-gate.mjs`, TypeScript (`tsc --noEmit`), `npm run check:versions`, `git diff --check` e manifesto com allowlist e SHA256 antes da publicação automática.
- QA físico PWA/APK: verificar fonte 200%, 320/360 px, toque com uma mão, back, retorno após suspensão e WebGL em aparelho. A compilação do APK e deploy Vercel são verificações posteriores ao push, não atestadas apenas pelo gate local.
