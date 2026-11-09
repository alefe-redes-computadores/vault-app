# VAULT M101 P1 — Cobertura real do Health Connect

Base: M100 P1, commit `74dbbad1f82fc6916f44511503191c461f80ac63`.

## Entrega
- Painel opcional de cobertura **por conta e pessoa**, para os seis tipos já compatíveis com o plugin Android.
- Registros importados únicos nos últimos 28 dias, dias com registros em 7/28, última data observada, status de permissão atual.
- Dados ausentes não equivalem a valor zero, e sensores não são identificados por inferência.
- Consulta IndexedDB somente ao expandir; nenhuma leitura do Android ou ação clínica disparada pelo painel.
- Botão de sincronização manual disponível mesmo com a sincronização automática ativa; leitura continua sujeita a permissão e confirmação do vínculo.
- Estado de permissões atualizado ao retornar ao aplicativo ou conceder/revogar permissões no Android.
- Sem migração Dexie, mudança de RLS, acesso remoto familiar, gravação de valores no Health Connect ou novos tipos nativos.
- Publicação resiliente: commit local aprovado é mantido quando o push falha; publicar.sh retoma somente a publicação, verificando origem e escopo.

## Limite explícito
**Passos, HRV, estágios do sono, glicose e energia ainda NÃO são importados nesta fase**. Dependem de API/permissões nativas, deduplicação e homologação real no APK.

## Homologação no aparelho
1. Verificar PWA sem importação nativa; histórico previamente sincronizado segue legível.
2. Conferir seis métricas autorizadas, com 0 registros e com registros reais.
3. Revogar uma permissão no Android, voltar ao VAULT e confirmar o estado.
4. Conferir usuário B e perfil B não exibem métricas do usuário A/perfil A.
5. Simular modo avião, recuperação de rede e reinício; nenhum diagnóstico infere leitura quando só houve sincronização.
