import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const ok = (value, message) => {
  if (!value) {
    throw new Error(`V84: ${message}`);
  }
};

const layout = read("app/layout.tsx");
const css = read("app/globals.css");
const providers = read("components/Providers.tsx");

ok(
  layout.includes('viewportFit:\n    "cover"'),
  "viewportFit cover não foi configurado"
);

const bodyTag =
  layout.match(/<body className="([^"]+)"/)?.[1] || "";

ok(
  bodyTag.split(/\s+/).includes("pt-safe"),
  "body raiz não possui safe-area superior"
);

ok(
  bodyTag.split(/\s+/).includes("pb-safe"),
  "safe-area inferior foi removida"
);

ok(
  css.includes(".pt-safe") &&
    css.includes("safe-area-inset-top"),
  "helper global de safe-area superior não existe"
);

ok(
  providers.includes("StatusBar.setOverlaysWebView") &&
    providers.includes("overlay: true"),
  "edge-to-edge nativo foi removido"
);

const pageFiles = [];

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const path = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      walk(path);
    } else if (
      entry.isFile() &&
      entry.name === "page.tsx"
    ) {
      pageFiles.push(path);
    }
  }
};

walk("app");

const duplicatedOwners = pageFiles.filter((path) => {
  const source = read(path);

  return (
    /\bpt-safe\b/.test(source) ||
    /safe-area-inset-top/.test(source)
  );
});

ok(
  duplicatedOwners.length === 0,
  `páginas ainda duplicam o inset superior: ${duplicatedOwners.join(", ")}`
);

console.log("V84 NATIVE SAFE-AREA — CONTRATO OK");
