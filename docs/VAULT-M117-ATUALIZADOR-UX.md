# VAULT M117 — Atualizações: continuidade de navegação e permissão Android

Base fechada: `a1db21f30b95076b6bd3ee568e78bb36d1202ce8` (M116). Escopo somente atualizador e aviso da Home.

## Entrega

1. Aviso discreto na Home somente no APK com release certificada mais nova, aproveitando o snapshot do reconciliador existente: "Ver e atualizar" ou fechar por build no armazenamento local. Uma nova versão pode reaparecer; não desabilita as notificações.
2. O toque em notificação de atualização ou aviso da Home envia ao destino fixo `/mais#vault-updates`. A seção recolhível de preferências é aberta somente quando o fragmento corresponde exatamente à Central de Atualizações, e a tela rola ao painel. Não aceita destino arbitrário vindo de notificação.
3. Após download privado e verificado, o VAULT tenta abrir o instalador oficial sem um segundo toque. SHA-256, tamanho, pacote, build superior, versão e certificado seguem verificados no Java, usando GitHub Releases e FileProvider restrito.
4. Quando falta autorização para instalar APKs deste app, mostra o botão para configurações. Após retornar com a autorização concedida, verifica diretamente no Android e mostra estado verde `Permissão concedida` com CTA `Continuar instalação`. O usuário ainda confirma a instalação no Android; não há instalação silenciosa, bypass do Play Protect ou do instalador. Em APK anterior à ponte M117, o botão manual de continuidade permanece como fallback.
5. PWA não exibe aviso de atualização de APK nem usa a ponte nativa. Nenhuma escrita clínica, pessoa, senha, Supabase, Finance ou bot é alterada.

## Aceite

- Testar do zero no Android: aviso Home / ignorar build / novo build, notificação clicada (app aberto e fechado), rolagem dentro do `details`, atualização sem permissão e com permissão concedida, instalação concluída ou cancelada, rede interrompida, aparelho offline, assinatura e checksum rejeitados pelo plugin, PWA sem ponte.
- App anterior à M117 **não contém o novo método de consulta de permissão**. O APK M117 inicial precisa ser instalado via fluxo existente; o estado verde é verificável numa release **posterior**. O método ausente falha fechado e mantém o fluxo anterior.
- O build da Action aplica `native/updates/VaultApkUpdaterPlugin.java` na árvore Android antes da compilação nativa. Conferir o workflow e a assinatura habitual. Não mudar `REQUEST_INSTALL_PACKAGES`, IDs, URL de release ou chave de assinatura.
- Gate global local não substitui QA Android real. Sem publicação se HEAD divergente, diretório sujo, alteração fora da allowlist ou teste falho.
