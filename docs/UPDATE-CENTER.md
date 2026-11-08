# VAULT Update Center — contrato operacional M87–M90

## Fonte de verdade

1. A Action `build-android.yml` é disparada em `main` e manualmente.
2. `npm run test:release`, exportação Capacitor, Gradle e verificação do certificado e `versionCode` precisam passar.
3. O artefato temporário `Vault-App-debug` continua disponível por sete dias (salvo política da plataforma).
4. **Depois** de o upload ser aprovado, a mesma Action cria a release pública `vault-android-b<run_number>` e publica `Vault-App.apk`.
5. A release guarda `VAULT_VERSION`, `VAULT_BUILD`, `VAULT_COMMIT` e `VAULT_APK_SHA256` no corpo. Não publica dados clínicos nem segredos.
6. A API pública `GET /repos/alefe-redes-computadores/vault-app/releases/latest` é consultada sem token no cliente; o usuário jamais recebe `GITHUB_TOKEN`.
7. A API pública de runs da Action ajuda a diferenciar a última compilação falha/em andamento da última release aprovada.

## Cliente

- `App.getInfo()` é a fonte da versão/build instalados no **APK Android**. Sem build legível, a recomendação de atualização é bloqueada.
- No **PWA** exibe-se a versão de aplicação web, sem compará-la ao `versionCode` Android.
- GitHub Releases não tem a expiração automática de sete dias do Actions. Os assets podem, porém, desaparecer se a release for removida; não há promessa de permanência absoluta.
- O download abre URL HTTPS validada do repositório oficial por ação explícita. Não há instalação silenciosa ou verificação criptográfica local do APK (o download é servido pelo GitHub e a assinatura Android é validada pelo SO).
- Uma falha na consulta não converte release cacheada em atualização aprovada. Erros HTTP/rate-limit/offline geram código diagnóstico copiável.
- O intervalo mínimo para consultas automáticas bem-sucedidas é de seis horas. Manual pode forçar consulta.
- Notificação Android é opt-in, com autorização do sistema e deduplicada por build. Ela é **agendada quando o aplicativo está em primeiro plano**, não é push remoto com aplicativo encerrado.
- O `localStorage` desse recurso guarda somente a preferência e o build já avisado, sem identificadores pessoais ou dados clínicos.

## Diagnóstico

- `VAULT-UPD-BUILD-FAILED-<run_id>`: último workflow registrado falhou, sem invalidar um APK anterior certificado.
- `VAULT-UPD-RATE-LIMIT`: limite público da API do GitHub.
- `VAULT-UPD-OFFLINE`: dispositivo sem conexão.
- `VAULT-UPD-HTTP-<status>`: API respondeu com erro.
- `VAULT-UPD-NETWORK`: timeout, bloqueio CORS, falha de rede ou resposta inválida.

## M90 — Fechamento de interface e prazo do artefato

- O cliente tenta consultar `GET /actions/runs/<run_id>/artifacts` **somente** quando a última Action terminou com `success`. A consulta é best-effort: ausência de permissão, erro de rede ou falta do endpoint resulta em **prazo desconhecido**, não em expiração inventada.
- Um artefato temporário só é reconhecido com `name=Vault-App-debug`, `workflow_run.id` conferido, URL oficial, flag `expired` e `expires_at` válido. O prazo é lido da resposta do GitHub, nunca estimado pela data da Action.
- `expires_at` vale para o ZIP **temporário do Actions**. A release pública certificada continua independente do vencimento do artefato de teste.
- Com opt-in, o aplicativo pode agendar **um** aviso local até 24 horas antes do prazo verdadeiro, apenas quando a release certificada corresponde ao mesmo run e o APK instalado é mais antigo. Ao desativar notificações ou identificar build instalado atualizado, o lembrete anterior é cancelado.
- Lembrete já agendado pode tocar com o aplicativo fechado. Descoberta de novas versões e novos prazos exige o VAULT aberto ou retomado, pois **push remoto não está ativo**.
- Botões e ícones Lucide, transições Framer Motion e redução de movimento respeitada. O clique em baixar abre o link no navegador; **não** significa download concluído, percentual confirmado ou instalação automática.
- Os testes M90 verificam expiração com data real, isolamento de runs, falha parcial do endpoint de artefatos, renderização TSX, suporte à redução de movimento e preservação das garantias M87–M89.

## Homologação no Android (manual, após M90)

- Validar instalação por cima de APK anterior com o mesmo certificado no Android real.
- Validar o link de download no WebView, navegador padrão e a confirmação do instalador.
- Validar Actions em execução, falha, cancelamento, ausência de release, remoção de asset e rate-limit.
- Verificar apresentação mobile, preferência de alertas e retomada em aparelho físico.
- Avaliar push real em segundo plano de modo separado: requer emissor confiável e canal nativo; nunca prometer este comportamento apenas com LocalNotifications.
