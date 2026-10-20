# VAULT V202 — Prévia canônica e refinamento facial

Base: V201 (`2fd1240c85fbbdf0053248fbcd571aa310e3a312`).

## Problema
A página Minha Saúde herdava a vista Rosto/Tênis e a rotação/zoom do editor 3D, inclusive entre visitas porque o framing estava persistido. A prévia deveria ser sempre o corpo inteiro e de frente.

## Alterações
- A prévia compacta usa enquadramento `body`, independentemente da última inspeção.
- Ao fechar o modal, o framing persistido volta a `body`.
- O modal não reaparece sozinho no próximo boot; o modo oculto continua respeitado.
- O controller da cena cancela transições pendentes, redefine frente, zoom, câmera e GPU budget ao voltar para a prévia compacta. Sem recriar o renderer por troca de modo, sem novo RAF contínuo.
- Ajustes discretos em nariz, bochechas, sobrancelhas, barba e frente da copa do boné reduzem protuberâncias sem alterar acessórios clínicos nem dados.

## Não altera
Banco, estoque, doses, Health Connect, sincronização, formulários do Cofre ou semântica de tratamentos.

## Testes de aceitação mobile
1. Minha Saúde → Avatar → Rosto → Voltar: prévia deve mostrar corpo inteiro e frente.
2. Minha Saúde → Avatar → Tênis → girar para costas → zoom → Voltar: prévia deve mostrar corpo inteiro, frente e zoom neutro.
3. Reabrir Avatar: inicia em Corpo inteiro; Rosto e Tênis continuam funcionando apenas na tela expandida.
4. Trocar de pessoa e reiniciar PWA/APK: nenhuma prévia fica presa na vista anterior.
5. Validar modo oculto/ilustração, acessibilidade, botões de aparelhos/Brain, aviso WebGL e bateria.
