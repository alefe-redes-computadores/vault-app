package com.alefejohsefe.vault

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Button

/** Local, readable permission rationale even without internet or a Vault session. */
class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val panel = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48,64,48,48); setBackgroundColor(Color.rgb(6,9,14)) }
        panel.addView(TextView(this).apply { text = "Vault · Dados de saúde"; textSize = 24f; setTextColor(Color.WHITE) })
        panel.addView(TextView(this).apply {
            text = "\nO Vault lê somente os tipos autorizados no Health Connect, publicados pelo Samsung Health: sono, peso, pressão, batimentos, oxigenação e caminhada.\n\nA importação é vinculada ao perfil que você confirmar em Minha saúde. Os registros ficam no histórico local e são sincronizados com sua conta Vault para aparecerem também na versão web. O cérebro usa esses registros para identificar padrões descritivos; isso não substitui avaliação clínica.\n\nO Vault não grava no Samsung Health, não mede sinais vitais e não realiza leituras com o aplicativo fechado. Revogue as permissões nas configurações do Health Connect ou pause a conexão em Minha saúde. Pausar preserva o histórico; a exclusão de registros é feita na Linha de cuidado."
            textSize = 16f; setTextColor(Color.LTGRAY)
        })
        panel.addView(Button(this).apply { text = "Voltar"; setOnClickListener { finish() } })
        setContentView(android.widget.ScrollView(this).apply { addView(panel) })
    }
}
