# VAULT 360 — M5 REAB MACRO1 | Continuidade e aceite

Data de preparo: 21/11/2026. Base auditada: `73baf6cd32e7fa13bc7514036bd9ab3629ff0bc9` (M4 P2 no GitHub). Esta entrega é **pacote para gate local**, não publicação ou Android homologado.

## Escopo implementado

- 6 autoridades aditivas: programas, equipe A1, sessões, equipe por sessão, origens e eventos de agenda.
- Dexie v52 após M4 P2 v51, outbox existente, pull, CAS, tombstone e distinção rigorosa entre agendada e realizada.
- Hub Saúde -> `/saude/reabilitacao`: lista, novo, edição, detalhes, equipe, agenda, remarcação e ligações tipadas.
- Vínculos com consultas, cirurgias e tratamentos **só por ID e conta/pessoa comprovados**. Programas domiciliares não exigem cirurgia, hospital nem CRM.
- Estados do programa somente por escolha humana; sessão realizada/não compareceu somente por ação explícita, nunca pelo relógio.
- Remarcações registradas como eventos append-only, mantendo o horário anterior; anotações não geram diagnóstico.
- Integridade SQL com FKs compostas, triggers de mesma origem, RLS por pessoa/conta, grants restritos e proibição de DELETE físico.

## Fora desta macro, intencionalmente

- M5 MACRO2: avaliação/evolução física medida com fonte e unidade, arquivos clínicos compartilhados via M3, notificações Android agendadas/canceladas, Brain/Modo Médico/PDF A4, aceitação visual Premium contra vídeo. Esta macro **não ativa alarmes nativos**, não inventa evolução nem incorpora documentos antigos automaticamente.
- Internações A5 pertencem a outra frente e não são pré-requisito para a existência de um programa domiciliar.
- Não modifica medicamentos, estoque, doses, receitas, tratamentos antigos, pessoas, médicos ou arquivos já cadastrados.

## Ordem de publicação

1. Diagnosticar pacote no Termux. O instalador confirma hashes dos arquivos afetados no GitHub e prepara clone isolado.
2. Aplicar/validar: V63, V70, TypeScript, gates próprios; deixar aprovado localmente sem commit/push.
3. Verificar e executar a SQL aditiva no **mesmo Supabase da conta VAULT**, RLS, FKs, triggers, grants e ausência de dados sem autorização; nunca copiar secrets para o cliente.
4. Publicar por `PUBLICAR.sh` com `M5_REAB_SQL_VERIFICADO=1`, depois confirmar Action, build e APK.
5. Homologação real em duas contas e duas pessoas, offline e dois dispositivos, perda de resposta, remarcação e tombstones, sem usar dados pessoais reais nos testes sintéticos.

## Cenários de aceite obrigatórios

- Criar programa sem cirurgia, escolher atendimento domiciliar, registrar duas sessões sem marcar automaticamente comparecimento.
- Vincular fisioterapeuta declarado (CREFITO sem CRM) e outro profissional, ambos da conta, e equipe específica da sessão.
- Remarcar duas vezes e confirmar histórico completo; uma sessão já realizada não pode ser remarcada.
- Vincular consulta, cirurgia ou tratamento da pessoa correta; rejeitar vínculo de outra pessoa, usuário ou destino ausente.
- Marcar uma sessão como realizada exclusivamente por clique; estado inicial `scheduled`, não `performed`.
- Idempotência de criação ao reprocessar fila; CAS no update; tombstones sobrevivem ao pull e não ressuscitam no outro aparelho.
- Troca de pessoa limpa a listagem, vínculo e seleção. Android Back, teclado e Safe Area sem corte.
- Tipo/versão Dexie, data/hora e RLS consistentes entre PWA/APK e Supabase; SQL aplicada antes do push.

**Segurança de produto:** o aplicativo organiza registros fornecidos; não substitui fisioterapeuta ou médico, nem interpreta melhora funcional.
