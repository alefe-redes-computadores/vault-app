# VAULT M101 P2 — Passos diários nativos, Samsung Health / Health Connect

Base: M101 P1 publicada (`b0bd1ef47f9c6deed8eb5016c70a1e01f43c4848`).

## O que passa a funcionar após atualização do APK
- Sétimo tipo opt-in: `passos`, separado de `caminhada` (minutos), com permissão Android `READ_STEPS` somente leitura. Não solicita escrita, background nem histórico estendido.
- O plugin Android utiliza `StepsRecord.COUNT_TOTAL` em agregação por dia civil local e filtra `DataOrigin("com.sec.android.app.shealth")`. Soma de amostras cruas é proibida para evitar sobreposição. **Se a origem Samsung não publicou passos, nenhum valor é criado**, nem zero.
- Os resultados enviados ao JS são `type=passos`, `id=daily-YYYY-MM-DD`, `origin=com.sec.android.app.shealth`, `dailyTotal=true`, `value=inteiro positivo`, `time=instante final daquela janela`. UUIDs estáveis derivam de usuário+pessoa+origem+tipo+ID, preservando o mecanismo de importação e exclusão já existente.
- A normalização valida fonte, dado positivo inteiro, limite 150.000/dia, instante e natureza do agregado. Nenhum relógio ou anel específico é presumido. O valor representa uma medida de bem-estar.
- Passos aparecem como hábito separado nos formulários, tendências, Minha Saúde e cobertura de 7/28 dias. Não contam como minutos de caminhada.
- A tela de permissões nativa descreve explicitamente a nova leitura, e a lista de itens ainda indisponíveis deixa de dizer que passos não são suportados. HRV, estágios do sono, glicose e energia ativa continuam não implementados.

## Limites e segurança
- Um APK anterior não terá o novo tipo no plugin: publicar o código web/PWA não instala a atualização Android.
- Health Connect pode apresentar passos da fonte **Android/dispositivo** e não da Samsung. O Vault M101 P2 deliberadamente não usa esses passos nem os atribui à Samsung; ausência de dados da Samsung deve ser tratada como indisponibilidade, não como falta de atividade.
- O app requer autorização individual no Android e seleção explícita de Passos dentro de Minha Saúde. Trocar pessoa não transfere autorização nem vincula aparelho a outro perfil.
- Dados clínicos são sensíveis; não há nova permissão de acesso familiar ou remoto e nenhuma alteração em RLS/Supabase.
- **Homologação em aparelho físico e build Gradle são necessários**. Os testes estáticos/TS e V113 não certificam compilação real de Kotlin, entrega de dados Samsung, mudanças de permissão após reboot nem integração com Galaxy Ring.

## Referências técnicas oficiais
- https://developer.android.com/health-and-fitness/health-connect/read-data
- https://developer.android.com/health-and-fitness/health-connect/features/steps
- https://developer.android.com/health-and-fitness/health-connect/data-types

## Gates
`tsc --noEmit`, M101 P2 hermético, V113 Android (manifesto e patch idempotente), V111 tipos e medidas, M101 P1, M100 P1, V112, M66, V91, V226 e release gate global. Sem build local pesado no Termux. Commit e publicação somente com gates aprovados; falha de rede após commit preserva o commit local para `publicar.sh`.
