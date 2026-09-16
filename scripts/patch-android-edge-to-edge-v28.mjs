import fs from "node:fs"; import path from "node:path";
const walk=(d)=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];
const file=walk("android/app/src/main/java").find(f=>/MainActivity\.(java|kt)$/.test(f));
if(!file) throw new Error("MainActivity não encontrada");
let s=fs.readFileSync(file,"utf8");
if(file.endsWith(".java")){
 if(!s.includes("android.os.Bundle")) s=s.replace(/package ([^;]+);\s*/,m=>`${m}\nimport android.os.Bundle;\nimport android.graphics.Color;\nimport androidx.core.view.WindowCompat;\n`);
 else if(!s.includes("android.graphics.Color")) s=s.replace("import android.os.Bundle;","import android.os.Bundle;\nimport android.graphics.Color;\nimport androidx.core.view.WindowCompat;");
 if(!s.includes("VAULT_EDGE_TO_EDGE_V28")) s=s.replace(/public class MainActivity extends BridgeActivity \{\s*/,`public class MainActivity extends BridgeActivity {\n  // VAULT_EDGE_TO_EDGE_V28\n  @Override protected void onCreate(Bundle savedInstanceState) {\n    super.onCreate(savedInstanceState);\n    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);\n    getWindow().setStatusBarColor(Color.TRANSPARENT);\n    getWindow().setNavigationBarColor(Color.TRANSPARENT);\n    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);\n  }\n\n`);
}else{
 if(!s.includes("android.os.Bundle")) s=s.replace(/package ([^\n]+)\n/,m=>`${m}\nimport android.os.Bundle\nimport android.graphics.Color\nimport androidx.core.view.WindowCompat\n`);
 if(!s.includes("VAULT_EDGE_TO_EDGE_V28")) s=s.replace(/class MainActivity\s*:\s*BridgeActivity\(\)\s*\{\s*/,`class MainActivity : BridgeActivity() {\n    // VAULT_EDGE_TO_EDGE_V28\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        WindowCompat.setDecorFitsSystemWindows(window, false)\n        window.statusBarColor = Color.TRANSPARENT\n        window.navigationBarColor = Color.TRANSPARENT\n        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false\n    }\n\n`);
}
if(!s.includes("VAULT_EDGE_TO_EDGE_V28")) throw new Error("Patch edge-to-edge não aplicado");
fs.writeFileSync(file,s); console.log("V28 edge-to-edge aplicado:",file);
