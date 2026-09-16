import fs from "node:fs"; import path from "node:path";
const walk=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];
const pluginJson=walk("android").find(f=>f.endsWith("capacitor.plugins.json"));
if(!pluginJson) throw new Error("capacitor.plugins.json não encontrado após cap sync");
const raw=fs.readFileSync(pluginJson,"utf8").toLowerCase();
for(const required of ["localnotifications","nativebiometric","statusbar","app"]) if(!raw.includes(required)) throw new Error(`Plugin nativo ausente no Android gerado: ${required}`);
const config=walk("android").find(f=>f.endsWith("capacitor.config.json")); if(!config) throw new Error("capacitor.config.json Android não encontrado");
console.log("V29 bridge/plugins Android OK:",pluginJson); console.log("V29 config Android OK:",config);
