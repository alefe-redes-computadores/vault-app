import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const notifications = read("lib/notifications.ts");
const doses = read("lib/dose-notifications.ts");
const mais = read("app/mais/page.tsx");
const meds = read("app/saude/medicamentos/page.tsx");
const config = JSON.parse(read("capacitor.config.json"));
const workflow = read(".github/workflows/build-android.yml");
const icon = read("assets/android/ic_stat_vault.xml");

expect(notifications.includes('VAULT_NOTIFICATION_CHANNEL_ID'), "Canal ausente");
expect(notifications.match(/channelId:/g)?.length >= 2, "Canal ausente nos lembretes persistentes");
expect(doses.includes("DOSE_REMINDER_ACTIONS"), "Ações de dose ausentes");
expect(doses.includes('channelId:'), "Canal ausente nas doses");
expect(mais.includes("disponíveis no aplicativo Android (APK)"), "Aviso PWA ausente");
expect(mais.includes('item.id === "favoritos"'), "Ajuste do atalho ímpar ausente");
expect(meds.includes('title="Medicamentos"'), "Título compacto ausente");
expect(config.plugins?.LocalNotifications?.smallIcon === "ic_stat_vault", "smallIcon incorreto");
expect(workflow.includes("assets/android/ic_stat_vault.xml"), "Cópia do drawable ausente");
expect(icon.includes("#FFFFFFFF") && icon.includes("@android:color/transparent"), "Ícone não é monocromático/transparente");

console.log("Contrato v25.5 aprovado.");
