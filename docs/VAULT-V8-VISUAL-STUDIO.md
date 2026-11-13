# VAULT V8 — Visual Studio + Clinical Dossier (macrocirurgia)

## Entrega funcional

- `PillStudioV8`: prévia SVG de cápsula, comprimido com/sem sulco, oblongo, gota, adesivo e injeção; os dados da forma e cores vêm exclusivamente do medicamento salvo, nunca da marca inferida. A comparação de paleta é local e **não modifica o cadastro**. Alterações permanentes devem ocorrer no editor canônico.
- `FenixSceneV8`: espaço visual decorativo vinculado à **cobertura documental** dos quatro eixos e dispositivos ativos realmente vinculados à pessoa. Não modifica `HealthAvatar3D`, não ativa WebGL adicional, não diagnostica o estado emocional e não inventa Galaxy Watch/Ring.
- `AxisCheckinV8`: quatro escalas diferentes de 0–10; cada clique `Salvar somente este eixo` cria um registro separado no repositório oficial `registrosSaudeRepository`, respeitando auth/pessoa e enfileirando sync existente. Falha parcial é informada por eixo; nenhum save silencioso ou transação multi-eixo ilusória. Dor 10 = mais dor; energia/humor/apetite 10 = maior presença percebida.
- `ClinicalDossierV8`: síntese observacional de uma página em A4 via `jspdf` já instalado; versão textual/cópia; longos conteúdos recebem truncamento explícito. Não exporta em segundo plano; mantém o dossiê completo V7 como fonte detalhada. Não inclui dados privados fixos ou validação de posologia.
- `visual-studio-v8.ts`: projeções puras, janelas 7/14/30 dias, faltas de registro preservadas, proveniência de métricas e dispositivos, filtro `user_id`+`person_id`, sem gravar medidas imaginadas.
- Integrações: links em **PharmaLens** e **Brain V7** e contrato no gate V63. Não toca Home, Hoje, cadastro ou Fênix 3D original, nem Supabase schema.

## Dependência e fronteira

Instalar **somente depois da SS7 publicada**, num checkout isolado sem alterações rastreadas. Conferir o `HEAD` remoto; não fazer rebase, reset, stash ou `git add -A`. O script recusa mudança de base, divergência, arquivos próprios existentes e âncoras faltantes. O `PUBLICAR-APOS-GATES.sh` usa `VAULT_REPO` e permite somente os arquivos na allowlist e verifica novamente o gate e remoto.

## Homologação manual obrigatória

1. `/saude/visual-studio` com pessoa ativa e conta autenticada; trocar pessoa e conferir isolamento.
2. Cápsula bicolor, comprimido sulcado, gotas/adesivos com formas e cores cadastradas. Comparar paleta e resetar, sem mudar dados.
3. Verificar que o painel só mostra watch/ring quando cadastrado e ativo; conferir nome e ausência de sinais sem medidas.
4. Salvar cada um dos quatro eixos; recarregar, conferir histórico e Brain V7 após sync. Testar offline e erro de rede.
5. Gerar resumo e PDF de uma página; confirmar que nenhuma prescrição/estoque/alerta foi alterada. Verificar linhas longas e limite de conteúdo.
6. Verificar telas em largura compacta Android, back, clique e zoom do PDF e atualização de dados. Fênix 3D original continua intacta.

## Limitações preservadas

Esta é uma **prévia ilustrativa**, não imagem verdadeira de comprimido, geometria de fabricante ou visualizador químico. Não altera layout do formulário principal de cadastro (para evitar colisão M143), nem substitui o modelo 3D da Fênix. Não afirma efeito farmacológico por curva de 7/14/30 dias, não estima níveis plasmáticos, não calcula doses seguras, não silencia alertas. O resumo de uma página prioriza o esquema e a evidência mais recente, com truncamento consciente.
