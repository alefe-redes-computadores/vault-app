# Histórico de versões do VAULT

Este arquivo registra entregas efetivas. O `versionCode` Android identifica cada compilação aprovada; `APP_VERSION` representa a versão-base do produto.

## M87–M89 — VAULT Update Center (2026-11-07)

- **M87:** pipeline publica APK Android aprovado em GitHub Releases depois do gate, exportação, assinatura, versão nativa e upload do artefato; mantém retenção de sete dias para o artefato do Actions.
- **M88:** Central de Atualizações na aba Mais mostra versão realmente instalada, build, release, novidades, estados de compilação e diagnóstico copiável. PWA é apresentado separadamente do APK.
- **M89:** verificação no primeiro plano ao abrir/retomar, intervalo de seis horas, aviso local opt-in e deduplicação por build. Notificação com aplicativo fechado **não** é prometida; exige futura infraestrutura push.

### Restrições e segurança

- Download somente de APK de release pública não rascunho/não pré-release publicada pelo workflow, sob o repositório oficial, com metadados e SHA-256 registrados.
- Não há instalação silenciosa; a pessoa escolhe baixar e o Android solicita confirmação de instalação.
- Não altera banco Dexie, Supabase, medicamentos, estoque, doses ou dados pessoais.
- O primeiro APK com Update Center precisa ser instalado pelo método já existente; builds anteriores não podem executar retroativamente funções que não continham.
- Teste de instalação e atualização em aparelho físico continua na M90.

## M77–M86 — Ciclo Premium 360

- M77–M79: interface progressiva clínica, evolução do Brain e inspeção da Fênix 3D.
- M80–M82: lista única de medicamentos, mantendo agrupamentos clínicos.
- M83–M85: carregamento progressivo e verificações de fechamento.
- M86: identidade do princípio ativo discreta, ações e resumo operacional alinhados; contratos visuais legados atualizados.
