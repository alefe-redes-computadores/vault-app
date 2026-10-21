# V207 — Cérebro contextual e postura do Avatar

O carregador clínico usado pelo Cérebro passa a exigir conta e pessoa válidas e consulta suas quinze fontes pelo índice composto `[user_id+person_id]`. A filtragem por proprietário deixa de acontecer depois da leitura: medicamentos, doses, tratamentos, agenda, documentos, retiradas, CIDs e toda a cadeia de fornecimento SUS já saem do IndexedDB no contexto correto.

A versão 45 acrescenta os índices que faltavam em CIDs, retiradas e nas quatro tabelas de fornecimento. A migração é somente aditiva e mantém os índices antigos. O contrato V207 executa a passagem V44→V45 com dados da pessoa ativa, outra pessoa, outro usuário e registros legados, comprovando preservação e isolamento.

O Avatar 3D recebe uma transição de trapézio entre pescoço e ombros, uma base de pernas menos rígida e uma abertura discreta dos tênis. A postura continua estática e o renderer permanece sob demanda: não há loop contínuo, rig ou animação extra consumindo bateria.

O release gate executa o contrato V207, a migração real, os contratos históricos e o TypeScript.
