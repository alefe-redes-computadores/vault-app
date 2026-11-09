# VAULT M102 P2 — Rosto e resiliência do Avatar

Base: M102 P1 `0f8cc8f9cbbf61d902957a2d0d7b235fab145fa8`.

## Implementado

- Ilustração 2D: olhos com esclera/íris/pupila/um brilho discreto, pálpebras e expressão facial consistente com a fonte de humor explícito. Sem imagem externa, webcam ou sensor.
- 3D: pequena correção da proporção da íris existente, sem criar novas malhas e **sem tocar** nos coeficientes de expressão V208/V234/V272 nem nos materiais já homologados. Pupilas, escalas e cliques continuam iguais.
- Segurança visual: entrada desconhecida resulta em expressão neutra. Humor somente por registros explícitos de 7 dias, com os limites já definidos pela função canônica `avatarBodyContext`. Não converter HRV, sono, remédios ou diagnósticos em expressão facial.
- Android/WebView: fallback protegido quando `ResizeObserver` ou `IntersectionObserver` indisponível. `resize` alternativo tem cleanup, renderização permanece sob demanda e canvas WebGL é descartado normalmente.
- Acessibilidade: as novas formas SVG são decorativas e o rótulo existente do Avatar continua único. `prefers-reduced-motion` e apresentação 2D existentes permanecem inalterados.

## Sem diagnósticos

Expressão é apenas uma representação opcional dos registros declarados; não revela estado emocional atual, estado mental ou risco clínico. Aparência física não muda com os dados do wearable. Não há novas tabelas, RLS, sync, permissões, notificações, coleta de dados ou atualização do APK nesta cirurgia. A aplicação real no WebView/Android depende de publicação e teste visual.

## Gates

1. Conferir HEAD remoto/local e allowlist; criar backup isolado.
2. Atualizar 3 arquivos rastreados, criar 3 novos e compilar `tsc --noEmit`.
3. Executar testes M102 P2 + V234 + V272 + V208 + V177 + V240 + M102 P1 + V112.
4. Executar `npm run test:release`, `git diff --check`, stage exato e commit apenas se todos aprovarem.
5. Publicar com retentativas; falha HTTPS após o commit não ativa rollback e admite `publicar.sh`.

## R3 — ciclo de vida de GPU
A liberaçao dos observadores usa if(observer) observer.disconnect(), mantendo a guarda de WebViews sem API e os contratos historicos V173 + M4. O teste V173 e executado logo apos M4, antes da suite global.
