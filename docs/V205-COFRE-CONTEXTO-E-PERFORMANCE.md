# V205 — Cofre contextual, lembretes isolados e Avatar

## Contrato de identidade

- A tela **Mais** lê medicamentos, documentos, credenciais e cartões somente do par `user_id + person_id` ativo.
- A ativação de lembretes agenda apenas dados desse contexto. Desativar continua cancelando todos os lembretes locais do aplicativo.
- Contagens do cofre nunca misturam pessoas nem incluem registros legados sem proprietário confirmado.
- A sincronização manual continua abrangendo a conta autenticada, mas não força recarga da página: as consultas Dexie reativas atualizam a interface.

## Índices locais

A versão 43 do Dexie adiciona o índice composto `[user_id+person_id]` a documentos, medicamentos, credenciais e cartões/contas. A migração é aditiva: não reescreve dados clínicos, estoque, doses ou fila de sincronização.

## Experiência

- Os atalhos do cofre em **Mais** mostram quantidades reais da pessoa ativa, sem revelar títulos, bancos, logins ou números.
- Cartões, contas e senhas usam o índice composto quando a leitura de legado está desativada.
- O Avatar ganha encaixe de boné, painéis de copa, apoio nasal e hastes dos óculos, além de contorno da pegada do celular. Todas as peças são estáticas e preservam a renderização sob demanda.
