package __PACKAGE__;

import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * VAULT M111: verified, consent-based Android APK update.
 * No clinical data, no credentials, no silent installer, no arbitrary URL supplied by JS.
 */
@CapacitorPlugin(name = "VaultApkUpdater")
public class VaultApkUpdaterPlugin extends Plugin {
  private static final String PACKAGE_ID = "com.alefejohsefe.vault";
  private static final String REPOSITORY = "alefe-redes-computadores/vault-app";
  private static final String DIR = "vault-apk-updates";
  private static final String PREFS = "vault_native_apk_m111";
  private static final long MAX_BYTES = 160L * 1024L * 1024L;
  private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();
  private final AtomicBoolean activeDownload = new AtomicBoolean(false);
  private final AtomicBoolean cancellationRequested = new AtomicBoolean(false);

  private static boolean isHash(String value) {
    return value != null && value.matches("[a-fA-F0-9]{64}");
  }
  private static boolean isVersion(String value) {
    return value != null && value.matches("[0-9]+\\.[0-9]+\\.[0-9]+");
  }
  private static String hex(byte[] bytes) {
    StringBuilder out = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) out.append(String.format(Locale.ROOT, "%02x", b & 255));
    return out.toString();
  }
  private static String sha256(File file) throws Exception {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
      byte[] buffer = new byte[65536];
      int count;
      while ((count = in.read(buffer)) != -1) digest.update(buffer, 0, count);
    }
    return hex(digest.digest());
  }
  private static String sha256(byte[] bytes) throws Exception {
    return hex(MessageDigest.getInstance("SHA-256").digest(bytes));
  }
  private File apkFor(int build) {
    return new File(new File(getContext().getCacheDir(), DIR), "Vault-App-b" + build + ".apk");
  }
  private long installedBuild() throws Exception {
    PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
    return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
  }
  private static Signature[] signers(PackageInfo info) {
    if (Build.VERSION.SDK_INT >= 28) {
      return info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners();
    }
    return info.signatures;
  }
  private void verifyPackage(File file, int build, String version, String expectedCertificate) throws Exception {
    PackageManager manager = getContext().getPackageManager();
    int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
    PackageInfo archive = manager.getPackageArchiveInfo(file.getAbsolutePath(), flags);
    if (archive == null || !PACKAGE_ID.equals(archive.packageName) || !PACKAGE_ID.equals(getContext().getPackageName()))
      throw new SecurityException("Identificador do APK diferente do VAULT.");
    long newBuild = Build.VERSION.SDK_INT >= 28 ? archive.getLongVersionCode() : archive.versionCode;
    if (newBuild != build || newBuild <= installedBuild())
      throw new SecurityException("Build ausente, diferente ou não superior ao instalado.");
    if (archive.versionName == null || !archive.versionName.equals(version))
      throw new SecurityException("A versão do APK não corresponde à release.");
    PackageInfo installed = manager.getPackageInfo(PACKAGE_ID, flags);
    Signature[] present = signers(installed), incoming = signers(archive);
    if (present == null || incoming == null || present.length != 1 || incoming.length != 1 ||
        !Arrays.equals(present[0].toByteArray(), incoming[0].toByteArray()))
      throw new SecurityException("Assinatura divergente do aplicativo instalado.");
    if (!sha256(present[0].toByteArray()).equalsIgnoreCase(expectedCertificate))
      throw new SecurityException("Certificado não corresponde à release certificada.");
  }
  private static boolean trusted(URL url) {
    if (!"https".equalsIgnoreCase(url.getProtocol()) || url.getUserInfo() != null ||
        (url.getPort() != -1 && url.getPort() != 443)) return false;
    String host = url.getHost().toLowerCase(Locale.ROOT);
    return host.equals("github.com") || host.equals("release-assets.githubusercontent.com") ||
        host.equals("objects.githubusercontent.com") || host.equals("github-releases.githubusercontent.com");
  }
  private static HttpURLConnection openRelease(int build) throws Exception {
    URL current = new URL("https://github.com/" + REPOSITORY +
        "/releases/download/vault-android-b" + build + "/Vault-App.apk");
    for (int redirects = 0; redirects < 7; redirects++) {
      if (!trusted(current)) throw new SecurityException("Redirecionamento externo bloqueado.");
      HttpURLConnection connection = (HttpURLConnection) current.openConnection();
      connection.setInstanceFollowRedirects(false);
      connection.setConnectTimeout(15000);
      connection.setReadTimeout(30000);
      connection.setRequestProperty("Accept", "application/octet-stream");
      connection.setRequestProperty("User-Agent", "VAULT-Android-Updater/1");
      int status = connection.getResponseCode();
      if (status == 200) return connection;
      if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
        String location = connection.getHeaderField("Location");
        if (location == null) { connection.disconnect(); throw new SecurityException("Redirect sem destino."); }
        URL next = new URL(current, location);
        connection.disconnect();
        current = next;
        continue;
      }
      connection.disconnect();
      throw new Exception("Download indisponível (HTTP " + status + ").");
    }
    throw new SecurityException("Redirecionamentos em excesso.");
  }
  private static final class Metadata {
    final int build;
    final long bytes;
    final String hash, version, cert;
    Metadata(PluginCall call) throws Exception {
      Integer number = call.getInt("build");
      build = number == null ? -1 : number;
      hash = call.getString("sha256");
      cert = call.getString("certificateSha256");
      version = call.getString("version");
      bytes = call.getData().optLong("bytes", 0L);
      if (build <= 0 || bytes < 100000 || bytes > MAX_BYTES || !isHash(hash) || !isHash(cert) || !isVersion(version))
        throw new SecurityException("Metadados da release incompletos.");
      if (!PACKAGE_ID.equals(call.getString("appId")))
        throw new SecurityException("Identificador da release inválido.");
    }
  }
  private void notifyProgress(Metadata m, long received) {
    JSObject event = new JSObject();
    event.put("build", m.build);
    event.put("received", received);
    event.put("total", m.bytes);
    event.put("percent", (int) Math.min(100, received * 100 / m.bytes));
    notifyListeners("downloadProgress", event);
  }
  private void recordVerified(File file, Metadata m) {
    getContext().getSharedPreferences(PREFS, 0).edit()
      .putInt("build", m.build).putLong("bytes", m.bytes)
      .putString("sha256", m.hash.toLowerCase(Locale.ROOT))
      .putString("certificateSha256", m.cert.toLowerCase(Locale.ROOT))
      .putString("version", m.version).apply();
  }
  private void clearVerified() { getContext().getSharedPreferences(PREFS, 0).edit().clear().apply(); }

  @PluginMethod
  public void downloadVerified(PluginCall call) {
    final Metadata m;
    try {
      m = new Metadata(call);
      if (m.build <= installedBuild()) throw new SecurityException("Esta versão já está instalada.");
    } catch (Exception e) { call.reject(e.getMessage()); return; }
    if (!activeDownload.compareAndSet(false, true)) { call.reject("Já existe um download em andamento."); return; }
    cancellationRequested.set(false);
    WORKER.execute(() -> {
      File temp = null;
      HttpURLConnection connection = null;
      try {
        File target = apkFor(m.build);
        File directory = target.getParentFile();
        if (directory == null || (!directory.isDirectory() && !directory.mkdirs()))
          throw new Exception("Pasta privada indisponível.");
        if (target.isFile() && target.length() == m.bytes && sha256(target).equalsIgnoreCase(m.hash)) {
          verifyPackage(target, m.build, m.version, m.cert);
          recordVerified(target, m);
          JSObject response = new JSObject(); response.put("verified", true); response.put("build", m.build);
          notifyProgress(m, m.bytes);
          call.resolve(response); return;
        }
        if (target.exists() && !target.delete()) throw new Exception("APK de cache não pôde ser removido.");
        clearVerified();
        temp = new File(directory, "download-" + m.build + ".partial");
        if (temp.exists() && !temp.delete()) throw new Exception("Download interrompido anterior não pôde ser limpo.");
        connection = openRelease(m.build);
        long headerBytes = connection.getContentLengthLong();
        if (headerBytes > 0 && headerBytes != m.bytes) throw new SecurityException("Tamanho remoto inesperado.");
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long received = 0, lastEvent = 0;
        try (InputStream input = new BufferedInputStream(connection.getInputStream());
             FileOutputStream output = new FileOutputStream(temp)) {
          byte[] buffer = new byte[65536]; int read;
          while ((read = input.read(buffer)) != -1) {
            if (cancellationRequested.get()) throw new Exception("Download cancelado. Você pode tentar novamente.");
            received += read;
            if (received > m.bytes || received > MAX_BYTES) throw new SecurityException("APK excedeu o tamanho esperado.");
            output.write(buffer, 0, read);
            digest.update(buffer, 0, read);
            if (received - lastEvent > 262144 || received == m.bytes) { notifyProgress(m, received); lastEvent = received; }
          }
          output.getFD().sync();
        }
        if (cancellationRequested.get()) throw new Exception("Download cancelado.");
        if (received != m.bytes || !hex(digest.digest()).equalsIgnoreCase(m.hash))
          throw new SecurityException("SHA-256 ou tamanho do APK não corresponde à release.");
        if (!temp.renameTo(target)) throw new Exception("Falha ao finalizar o APK privado.");
        temp = null;
        verifyPackage(target, m.build, m.version, m.cert);
        recordVerified(target, m);
        JSObject response = new JSObject(); response.put("verified", true); response.put("build", m.build);
        call.resolve(response);
      } catch (Exception e) {
        clearVerified();
        File file = apkFor(m.build);
        if (file.exists()) file.delete();
        call.reject("Atualização não verificada: " + e.getMessage());
      } finally {
        if (connection != null) connection.disconnect();
        if (temp != null && temp.exists()) temp.delete();
        activeDownload.set(false);
        cancellationRequested.set(false);
      }
    });
  }

  @PluginMethod
  public void cancelDownload(PluginCall call) {
    cancellationRequested.set(true);
    JSObject response = new JSObject(); response.put("requested", activeDownload.get());
    call.resolve(response);
  }

  @PluginMethod
  public void installVerified(PluginCall call) {
    final Metadata m;
    try { m = new Metadata(call); }
    catch (Exception e) { call.reject(e.getMessage()); return; }
    WORKER.execute(() -> {
      try {
        android.content.SharedPreferences saved = getContext().getSharedPreferences(PREFS, 0);
        File file = apkFor(m.build);
        if (saved.getInt("build", 0) != m.build || saved.getLong("bytes", -1) != m.bytes ||
            !m.hash.equalsIgnoreCase(saved.getString("sha256", "")) ||
            !m.cert.equalsIgnoreCase(saved.getString("certificateSha256", "")) ||
            !m.version.equals(saved.getString("version", "")) || !file.isFile() ||
            file.length() != m.bytes || !sha256(file).equalsIgnoreCase(m.hash))
          throw new SecurityException("APK privado não está validado ou foi modificado.");
        verifyPackage(file, m.build, m.version, m.cert);
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
          JSObject response = new JSObject(); response.put("permissionRequired", true);
          call.resolve(response); return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), PACKAGE_ID + ".vaultupdateprovider", file);
        getActivity().runOnUiThread(() -> {
          try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.setClipData(ClipData.newUri(getContext().getContentResolver(), "Atualização VAULT", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            JSObject response = new JSObject(); response.put("opened", true);
            call.resolve(response);
          } catch (Exception e) { call.reject("Instalador do Android indisponível."); }
        });
      } catch (Exception e) { call.reject("Instalação bloqueada: " + e.getMessage()); }
    });
  }

  /** M117: read-only; permission is still granted solely by Android settings. */
  @PluginMethod
  public void checkInstallPermission(PluginCall call) {
    JSObject response = new JSObject();
    response.put("granted", Build.VERSION.SDK_INT < 26 ||
      getContext().getPackageManager().canRequestPackageInstalls());
    call.resolve(response);
  }

  @PluginMethod
  public void openInstallSettings(PluginCall call) {
    if (Build.VERSION.SDK_INT < 26) { call.resolve(); return; }
    getActivity().runOnUiThread(() -> {
      try {
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
          Uri.parse("package:" + PACKAGE_ID));
        getActivity().startActivity(intent);
        call.resolve();
      } catch (Exception e) { call.reject("Não foi possível abrir a permissão de atualização."); }
    });
  }
}
