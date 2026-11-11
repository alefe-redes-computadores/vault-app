/* M123: a small deterministic impact gate BEFORE the full canonical release gate. */
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const selected=[
 'scripts/test-vault-m123-global-closure.cjs',
 'scripts/verify-vault-android-m123.cjs',
 'scripts/test-vault-m115-continuity.cjs',
 'scripts/test-vault-m114c-private-session.cjs',
 'scripts/test-vault-m117-update-ux.cjs',
 'scripts/test-vault-m122-fenix-lens.cjs',
];
for(const file of selected){
 if(!fs.existsSync(file)){console.error('M123 IMPACTO: suite ausente: '+file);process.exit(1);}
 console.log(`\n=== GATE RÁPIDO M123: ${file} ===`);
 const result=spawnSync(process.execPath,[file],{stdio:'inherit'});
 if(result.status!==0){console.error('M123 IMPACTO: bloqueado por '+file);process.exit(result.status??1);}
}
console.log(`\nM123 IMPACTO: ${selected.length} suítes aprovadas. Gate canônico completo continua obrigatório.`);
