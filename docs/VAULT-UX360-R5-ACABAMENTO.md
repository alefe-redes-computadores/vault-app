# UX360 R5 — geometria da listagem e etiquetas contextuais reais

Fonte: vídeo de homologação R4 publicado, prints e três imagens conceituais fornecidos pelo proprietário.

Escopo exclusivo: Medicamentos, ListCard opt-in, testes de regressão visual. Não alterar Home Viva, sincronização, autoridade de dose, estoque, histórico, receitas, dados, migrations, schema.

## Compacto
- Ícone ao lado do nome e dose; cabeçalho começa após 44px, operacional ocupa largura integral.
- Princípio ativo verdadeiro (se houver) visível abaixo do nome em 10px, sem duplicação na acessibilidade.
- Regime e tratamentos vinculados acessíveis pelo toque, com área 44px.
- Ações dimensionadas, coluna 88px somente quando existe CTA; sem seta órfã.
- Tarja regulatória reduzida de 32px para 28px só nesta lista, mantendo texto e interação original.

## Conforto
- Além do Compacto: etiquetas reais e condicionais de origem cadastrada (SUS, comprado, gratuito), fabricante (distinguindo última aquisição e etiqueta) e documento vinculado comprovado, com destino nas abas Ficha/Receita da Gaveta 360.
- Origem híbrida nunca apresentada como fornecedor atual confirmado.
- Tratamento abre detalhes reais quando ID existe; sem ID abre a ficha, sem inventar link.
- Princípio ativo maior e informação operacional canônica.

## Segurança de interface
- Nenhum evento clínico criado, dosagem inferida, estoque modificado ou documento vinculado automaticamente.
- onClick dos chips usa stopPropagation/preventDefault por estarem dentro de card com navegação de fundo.
- Menus, CTAs e chips com 44px mínimos; scroll/reflow deve ser conferido em 320/360/393/430px no Android.
- Filtros permanecem no único BottomSheet; +1 não retorna.
- Contratos legados de geometria alterados apenas onde exigiam coluna fixa antiga de 78px ou seta órfã.

## Etapas
1. DIAGNOSTICAR-TUDO.sh — clone Git e coleta V63 completa sem abortar no primeiro contrato, além de TypeScript e V70.
2. APLICAR-VALIDAR.sh — aproveita certificado se HEAD, ambiente e candidata forem iguais; faz backup seletivo, sem commit.
3. PUBLICAR.sh — exige sessão aprovada, verifica SHA/allowlist e envia commit apenas com arquivos R5.
4. ROLLBACK-LOCAL.sh — antes do commit, restaura arquivos R5 sem tocar em dados pessoais.

Sem promessa de fidelidade visual sem vídeo pós-publicação.
