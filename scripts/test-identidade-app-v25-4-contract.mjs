import fs from "node:fs";

const expected = {
  "vault-icon-master-transparent.png": [500, 500],
  "public/favicon-32x32.png": [32, 32],
  "public/icon-192x192.png": [192, 192],
  "public/icon-512x512.png": [512, 512],
  "public/icon-maskable-512x512.png": [512, 512],
  "app/icon.png": [512, 512],
  "app/apple-icon.png": [180, 180],
  "assets/icon.png": [1024, 1024],
  "assets/icon-foreground.png": [1024, 1024],
  "assets/icon-background.png": [1024, 1024],
  "assets/splash.png": [2732, 2732],
};

function readPng(file) {
  const data = fs.readFileSync(file);

  if (
    data.length < 26 ||
    data.toString("hex", 0, 8) !== "89504e470d0a1a0a"
  ) {
    throw new Error("PNG inválido: " + file);
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
  };
}

console.log("== IDENTIDADE VISUAL V25.4 ==");

for (const [file, [width, height]] of Object.entries(expected)) {
  if (!fs.existsSync(file)) {
    throw new Error("Arquivo ausente: " + file);
  }

  const png = readPng(file);

  if (png.width !== width || png.height !== height) {
    throw new Error(
      `Dimensão incorreta: ${file} (${png.width}x${png.height})`
    );
  }

  console.log("OK:", file, width + "x" + height);
}

const source = readPng(
  "vault-icon-master-transparent.png"
);

if (source.colorType !== 4 && source.colorType !== 6) {
  throw new Error(
    "A matriz não declara canal alfa PNG."
  );
}

const manifest = JSON.parse(
  fs.readFileSync("public/manifest.json", "utf8")
);

const anyIcons = manifest.icons.filter(
  (icon) => icon.purpose === "any"
);

const maskableIcons = manifest.icons.filter(
  (icon) => icon.purpose === "maskable"
);

if (anyIcons.length !== 2 || maskableIcons.length !== 1) {
  throw new Error(
    "Manifesto não separa any e maskable."
  );
}

const workflow = fs.readFileSync(
  ".github/workflows/build-android.yml",
  "utf8"
);

if (
  workflow.includes(
    "cp public/icon-512x512.png assets/splash.png"
  )
) {
  throw new Error(
    "Workflow ainda reutiliza o ícone como splash."
  );
}

console.log("IDENTIDADE VISUAL V25.4: OK");
