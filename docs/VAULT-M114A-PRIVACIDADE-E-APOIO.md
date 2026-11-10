# VAULT M114 A — Privacidade local e acesso humano

## Entregue

- proteção opcional do diário e do plano pessoal com AES-GCM 256;
- chave derivada de frase secreta por PBKDF2-SHA256 (310.000 iterações);
- frase nunca persistida e AAD vinculado a conta, pessoa e módulo;
- migração explícita: a cópia aberta só é removida depois de cifrar, reabrir e validar;
- funcionamento offline e dados antigos preservados enquanto a proteção não é ativada;
- linguagem factual na Home quando não existem pendências observadas;
- acesso ao plano, CVV 188 e SAMU 192 independente do Brain.

## Modelo de ameaça e limites

A proteção reduz exposição do texto em repouso no armazenamento local. Ela não protege uma tela já desbloqueada, código malicioso executado no mesmo contexto, captura de tela, aparelho comprometido ou uma frase fraca. Não existe recuperação automática da frase. O bloqueio do aparelho continua necessário.

## Não incluído

Contatos estruturados, mensagens, lembretes de humor e janelas de retirada permanecem para M114 B. Nenhum dado é enviado a terceiros e nenhum texto é interpretado pelo Brain.
