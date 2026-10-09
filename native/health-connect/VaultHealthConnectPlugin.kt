package com.alefejohsefe.vault

import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.*
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.reflect.KClass
import kotlin.math.roundToInt

/** Read-only Samsung Health bridge. Foreground use only, no writes or sensor access. */
@CapacitorPlugin(name = "VaultHealthConnect")
class VaultHealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val origin = "com.sec.android.app.shealth"
    private val types: Map<String, KClass<out Record>> = mapOf(
        "sono" to SleepSessionRecord::class, "peso" to WeightRecord::class,
        "pressao_arterial" to BloodPressureRecord::class, "frequencia_cardiaca" to HeartRateRecord::class,
        "oxigenacao" to OxygenSaturationRecord::class, "caminhada" to ExerciseSessionRecord::class
    )
    private val permissionContract = PermissionController.createRequestPermissionResultContract()
    private fun client(): HealthConnectClient {
        check(HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) { "Health Connect não está disponível. Instale ou atualize o serviço no Android." }
        return HealthConnectClient.getOrCreate(context)
    }
    private fun selected(call: PluginCall): List<String> {
        val a = call.getArray("types") ?: error("Selecione os tipos de dado.")
        val selected = (0 until a.length()).map { a.getString(it) }.distinct()
        require(selected.isNotEmpty() && selected.all { types.containsKey(it) }) { "Tipo de dado inválido." }
        return selected
    }
    private suspend fun result(): JSObject {
        val status = HealthConnectClient.getSdkStatus(context)
        val value = when(status) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
            else -> "unavailable"
        }
        val permissions = if(status == HealthConnectClient.SDK_AVAILABLE) client().permissionController.getGrantedPermissions() else emptySet()
        return JSObject().put("availability",value).put("granted",JSArray(types.filter { HealthPermission.getReadPermission(it.value) in permissions }.keys.toList()))
    }
    private fun work(call: PluginCall, task: suspend () -> JSObject) {
        scope.launch {
            try { call.resolve(task()) }
            catch(e: CancellationException) { call.reject("Leitura interrompida. Abra o Vault e tente novamente.") }
            catch(e: Exception) { call.reject(e.message ?: "Não foi possível ler o Health Connect.") }
        }
    }
    @PluginMethod fun status(call: PluginCall) = work(call) { result() }
    @PluginMethod override fun requestPermissions(call: PluginCall) {
        scope.launch { try {
            client()
            val permissions = selected(call).map { HealthPermission.getReadPermission(types.getValue(it)) }.toSet()
            startActivityForResult(call,permissionContract.createIntent(context,permissions),"permissionResult")
        } catch(e: Exception) { call.reject(e.message ?: "Não foi possível pedir autorização.") } }
    }
    @ActivityCallback private fun permissionResult(call: PluginCall?, response: ActivityResult) {
        if(call != null) work(call) { result() }
    }
    @PluginMethod fun openSettings(call: PluginCall) {
        scope.launch { try {
            val status = HealthConnectClient.getSdkStatus(context)
            val intent = if(status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
                Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"))
            else HealthConnectClient.getHealthConnectManageDataIntent(context)
            activity.startActivity(intent); call.resolve()
        } catch(e: Exception) { call.reject("Abra as configurações do Android e procure Health Connect.") } }
    }
    private suspend fun <T : Record> readAll(hc: HealthConnectClient, type: KClass<T>, start: Instant, end: Instant): List<T> {
        val rows = mutableListOf<T>(); var token: String? = null
        do {
            val response = hc.readRecords(ReadRecordsRequest(recordType = type,timeRangeFilter = TimeRangeFilter.between(start,end),dataOriginFilter = setOf(DataOrigin(origin)),pageSize = 500,pageToken = token))
            rows.addAll(response.records)
            check(rows.size <= 6000) { "Muitos dados neste período. Tente novamente com menos tipos selecionados." }
            token = response.pageToken
        } while(token != null)
        return rows
    }
    private fun row(id: String, type: String, time: Instant, value: Number): JSObject = JSObject().put("id",id).put("origin",origin).put("type",type).put("time",time.toString()).put("value",value)
    @PluginMethod fun read(call: PluginCall) = work(call) {
        val selected = selected(call)
        val days = call.getInt("days",28) ?: 28
        require(days in 1..28) { "Período de leitura inválido." }
        val hc = client(); val permissions = hc.permissionController.getGrantedPermissions()
        val allowed = selected.filter { HealthPermission.getReadPermission(types.getValue(it)) in permissions }
        val end = Instant.now(); val start = end.minus(Duration.ofDays(days.toLong()))
        val records = JSArray()
        if("sono" in allowed) readAll(hc,SleepSessionRecord::class,start,end).filter { !it.endTime.isAfter(end) }.forEach {
            val min = Duration.between(it.startTime,it.endTime).toMillis().toDouble().div(60000).roundToInt()
            records.put(row(it.metadata.id,"sono",it.endTime,min).put("start",it.startTime.toString()).put("end",it.endTime.toString()))
        }
        if("peso" in allowed) readAll(hc,WeightRecord::class,start,end).forEach { records.put(row(it.metadata.id,"peso",it.time,it.weight.inKilograms)) }
        if("pressao_arterial" in allowed) readAll(hc,BloodPressureRecord::class,start,end).forEach {
            records.put(row(it.metadata.id,"pressao_arterial",it.time,it.systolic.inMillimetersOfMercury.roundToInt()).put("second",it.diastolic.inMillimetersOfMercury.roundToInt()))
        }
        if("oxigenacao" in allowed) readAll(hc,OxygenSaturationRecord::class,start,end).forEach { records.put(row(it.metadata.id,"oxigenacao",it.time,it.percentage.value.roundToInt())) }
        if("caminhada" in allowed) readAll(hc,ExerciseSessionRecord::class,start,end).filter { it.exerciseType == ExerciseSessionRecord.EXERCISE_TYPE_WALKING && !it.endTime.isAfter(end) }.forEach {
            val min = Duration.between(it.startTime,it.endTime).toMillis().toDouble().div(60000).roundToInt()
            records.put(row(it.metadata.id,"caminhada",it.endTime,min).put("start",it.startTime.toString()).put("end",it.endTime.toString()))
        }
        // Daily aggregation avoids importing thousands of heart-rate samples and counting wearable sources twice.
        if("frequencia_cardiaca" in allowed) {
            val zone = ZoneId.systemDefault(); var day = LocalDate.now(zone).minusDays(days.toLong()-1)
            val today = LocalDate.now(zone)
            while(!day.isAfter(today)) {
                val a = day.atStartOfDay(zone).toInstant(); val b = minOf(day.plusDays(1).atStartOfDay(zone).toInstant(),end)
                val aggregate = hc.aggregate(AggregateRequest(metrics = setOf(HeartRateRecord.BPM_AVG),timeRangeFilter = TimeRangeFilter.between(a,b),dataOriginFilter = setOf(DataOrigin(origin))))
                val avg = aggregate[HeartRateRecord.BPM_AVG]
                if(avg != null) records.put(row("daily-$day","frequencia_cardiaca",b.minusMillis(1),avg.toDouble().roundToInt()).put("dailyAverage",true))
                day = day.plusDays(1)
            }
        }
        check(records.length() <= 6000) { "Muitos dados neste período. Reduza os tipos selecionados." }
        JSObject().put("records",records).put("granted",JSArray(allowed))
    }
    override fun handleOnDestroy() { scope.cancel(); super.handleOnDestroy() }
}
