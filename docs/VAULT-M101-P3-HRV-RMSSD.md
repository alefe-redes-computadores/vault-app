# VAULT M101 P3 — HRV RMSSD nativa, opt-in

- Base exata: `6cdfc3968bd86ecc1aa4bb8a3cda2f982c996ba3` (M101 P2 publicada).
- Oitava métrica: `hrv_rmssd` = variabilidade da frequência cardíaca RMSSD **pontual**, unidade **ms**, intervalo validado **1–200**. Não é bpm, média diária, nota de estresse, diagnóstico ou inferência clínica.
- Origem: somente `com.sec.android.app.shealth` filtrada no Health Connect. Se o Samsung Health não publicar esse tipo, não aparece registro; a ausência não vira zero.
- Android: `HeartRateVariabilityRmssdRecord`, `READ_HEART_RATE_VARIABILITY`, apenas leitura, em primeiro plano. Permissão independente; o usuário pode negar ou revogar sem bloquear as métricas anteriores.
- Proteção de versões: `ConnectStatus.supported` é anunciado pelo novo plugin; o aplicativo não oferece HRV em APK antigo. Se um vínculo existente incluir HRV mas o APK instalado for antigo, a sincronização continua com as outras métricas, sem enviar tipo desconhecido para o plugin.
- Os registros preservam `user_id`, `person_id`, `source_record_id`, horário observado e deduplicação existente. Não há migração destrutiva nem tabelas remotas novas.
- Gate: TypeScript, P3, P2, P1, M100, V113, V111, V112, V91/M66/V226 e suíte global, stage allowlisted, commit e push com resgate de rede.
- Atestado local é **hermético**: não substitui build Kotlin/Gradle do APK, verificação de permissão no Android real, Samsung Health publicando HRV ou teste no relógio/anel.
- Fontes de API: https://developer.android.com/health-and-fitness/health-connect/data-types ; https://developer.android.com/reference/androidx/health/connect/client/records/HeartRateVariabilityRmssdRecord
