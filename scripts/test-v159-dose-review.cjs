const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const file='lib/pending-dose-review.ts',m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
for(const dose of [{data:'2026-10-14',horario:'22:00',stockUnavailable:true},{data:'2026-10-15',horario:'08:00',stockUnavailable:false}]){
 const before=JSON.stringify(dose);assert.equal(m.exports.pendingDoseCustomTime(dose),`${dose.data}T${dose.horario}`);assert.equal(JSON.stringify(dose),before);assert.match(m.exports.pendingDoseCustomTime(dose),/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
}
const modal=fs.readFileSync('components/PendingDosesModal.tsx','utf8');assert(modal.includes('motivo:"sem_estoque"'));assert(modal.includes('stockConfirmationOpen'));assert(modal.includes('resolutionLock.current'));assert(!modal.includes('horario}{dose.stockUnavailable'));
console.log('V159: custom timestamp remains valid for yesterday/today and both stock states; explicit stock confirmation and in-flight guard retained');
