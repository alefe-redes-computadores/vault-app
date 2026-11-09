# VAULT M100 P1 — Perfis familiares locais e transparência da Saúde Conectada

## Entregas
- Classificação local por conta/pessoa: relação com o perfil e papel descritivo na rotina.
- Sem migração de schema, sem gravar informação sensível nova no Supabase, sem herdar permissão de cofre.
- Menus de seleção de pessoa isolados por `user_id`, sem consultar perfis de outra conta.
- Painel recolhível e discreto no card de pessoa; badge compacto na troca de pessoa.
- Política de fonte Health Connect: status de vínculo, permissões, última importação, frescor da *importação* (não do sensor) e métricas ainda não suportadas.
- Rótulo explícito no histórico: importação via Health Connect não prova qual acessório realizou a medição.
- M99, V91, M66 e V226 permanecem intocados. O gate global é obrigatório.

## Limites de segurança
- A classificação familiar é armazenada em `localStorage` **neste navegador/aparelho**, por chave que inclui ID da conta e da pessoa, sem criptografia específica e sem sincronização entre dispositivos. Não registre informações sensíveis nesse campo; não trata de guarda legal ou consentimento formal.
- Nenhum papel local concede acesso clínico remoto, compartilhamento, marcação de dose ou papel de administrador. Dependentes/cuidadores remotos exigem RLS, convites auditados e revogação em etapa posterior.
- A identificação de um smartwatch/anel nunca é deduzida apenas da origem Samsung Health.
- O APK atual importa somente as seis métricas já implementadas. Não habilitar passos, HRV, estágios de sono, glicose ou energia antes do bridge Kotlin e de permissões Android testadas.
- Homologação em Android real ainda é necessária para estabilidade de leitura e permissões.

## Próxima etapa M100
Integração nativa Health Connect 2.0 por tipo com autorização explícita, testes do bridge, atualização de UI de medidas e gates RLS antes de qualquer colaboração remota.
