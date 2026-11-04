# VAULT M67 — Fechamento global e critérios de homologação

Base: M66 `57f78ecd749e78877ff3df804546f9f19aa05a3f`.

## Objetivo

Certificar os motores já publicados, sem modificar nenhuma autoridade clínica ou alterar dados de pessoas. A M67 fecha o ciclo de macrocirurgias M65 (experiência relacional) e M66 (confiabilidade/offline). Não substitui testes com os dispositivos reais.

## Escopo desta cirurgia

- Introduz um gate comportamental integrado M67, executado **antes** de M66/M65/M64 e de todos os testes anteriores no release canônico.
- Certifica que o workflow Android **só gera o resumo M67** depois dos passos de exportação, bridge, compilação e verificação da assinatura/versionCode.
- Adiciona script read-only para comparar HEAD local × remoto, árvore limpa e identificação da M67. O script não lê banco ou credenciais.
- Preserva todas as rotinas de dose, estoque, SUS, documentos, sincronização e notificações; não altera estruturas Supabase, Dexie, horários, agendamentos ou APIs.

## Gates obrigatórios no instalador

1. SHA256 de cada item do pacote + SHA Git dos dois arquivos existentes (contra M66).
2. Preflight das âncoras e arquivos novos (somente leitura), backup seletivo.
3. Novo gate de comportamento M67; regressões M66, M65, M64, M52, V91, V228 e V234.
4. `npm run test:release`, incluindo TypeScript integral; auditoria `git diff --check` e allowlist.
5. Confirmação de HEAD remoto ainda igual à M66 antes do commit/push.
6. Commit/push com exclusividade dos cinco caminhos desta cirurgia; rollback seletivo se falhar antes do commit.

## Provas automatizadas e limites

Os testes de comportamento cobrem: fila com prazo e falha terminal, single-flight e solicitação urgente, isolamento de conta no refresh, dose remota idêntica versus alteração local, deduplicação de notificações por snapshot e preferência, troca de pessoa, Mapa de Cuidado 360 sem promover planos a fatos, destinos de notificações, presença dos módulos essenciais, Fênix com render condicionado, help, diagnóstico e CI Android.

**Publicação não é homologação do APK.** O push na `main` dispara o workflow `Compilar APK Vault` via GitHub Actions. A homologação automatizada exige execução concluída com sucesso, APK gerado, `versionCode` correto e certificado Android estável verificado. O relatório de Actions não garante instalação ou uso em um aparelho real.

## Homologação manual final (sem exclusões automáticas)

- Em PWA e APK, confirmar mesma conta e pessoa ativa, registrar uma dose real no dispositivo autorizado e validar que surge no outro dispositivo **uma única vez** após sincronização; não criar dose fictícia para isso.
- Colocar o dispositivo sem rede, conferir fila local, reconectar, aguardar envio, comparar antes/depois na tela de diagnóstico; não usar reparo destrutivo.
- Conferir notificação de dose e atraso respeitando o horário, a preferência e a pessoa ativa; notificações jamais confirmam uma tomada.
- Conferir medicamento contínuo, por período e SOS, estoque, receita, retirada, compra, processo SUS, documento e vínculos existentes. Planejado continua planejado.
- Avaliar Home/Hoje/Medicações/Minha Saúde/Brain/Fênix/Ajuda na tela pequena e no teclado; verificar safe-area, foco, rolagem e movimento reduzido.
- Instalar o APK **sobre o aplicativo atual**, preservando os dados, somente após confirmação de assinatura idêntica pelo workflow.

## Encerramento

A M67 encerra o plano de **desenvolvimento** apenas após gate integral e push. O encerramento de **homologação** depende do GitHub Actions READY e dos testes reais PWA/APK acima. Se algum gate falhar, não declarar como concluído.
