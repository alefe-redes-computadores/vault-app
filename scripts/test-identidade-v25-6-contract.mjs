import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const expect = (value, message) => {
  if (!value) throw new Error(message);
};

const manifest = JSON.parse(read("public/manifest.json"));
const layout = read("app/layout.tsx");
const login = read("app/login/page.tsx");
const splash = read("components/SplashScreen.tsx");
const sw = read("public/sw.js");
const capacitor = JSON.parse(read("capacitor.config.json"));
const workflow = read(".github/workflows/build-android.yml");

for (const icon of manifest.icons) {
  expect(fs.existsSync(`public${icon.src}`), `Ícone ausente: ${icon.src}`);
}
expect(manifest.icons.some((icon) => icon.purpose === "maskable"), "Maskable ausente");
expect(layout.includes('/apple-icon.png?v=2'), "Apple icon incorreto");
expect(!layout.includes("icon-144x144"), "Referência antiga de 144 px permaneceu");
expect(login.includes('/icon-v2-192x192.png'), "Login não usa a identidade nova");
expect(!login.includes("ring-gradient glow-ice mb-4"), "Moldura antiga permaneceu no login");
expect(splash.includes('/icon-v2-192x192.png'), "Splash React não usa a identidade nova");
expect(!splash.includes("ring-gradient glow-ice flex h-[72px]"), "Moldura antiga permaneceu no splash");
expect(sw.includes('vault-shell-v25-6'), "Cache do SW não mudou");
expect(sw.includes('/icon-maskable-v2-1024x1024.png'), "SW não inclui maskable novo");
expect(capacitor.plugins?.LocalNotifications?.smallIcon === "ic_stat_vault", "Ícone de notificação regrediu");
expect(workflow.includes("assets/android/ic_stat_vault.xml"), "Workflow perdeu o ícone de notificação");

console.log("Contrato de identidade v25.6 aprovado.");
