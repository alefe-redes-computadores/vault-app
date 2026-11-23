/** A11: evidências separadas de promessas. Nenhuma aprovação física é inferida de um teste de código. */
export type A11Verdict = 'not_tested' | 'passed' | 'failed' | 'blocked';
export type A11Track =
  | 'typescript'|'v63'|'v70'|'git_integrity'|'android_ci'|'android_install'
  | 'identity_2x2'|'storage_2x2'|'offline_two_devices'|'race_two_devices'
  | 'notification_doze'|'accessibility_320_430'|'avatar_performance'|'pwa_production';
export type A11Evidence = {
  track:A11Track; verdict:A11Verdict; source:'code'|'ci'|'physical'|'authenticated'|'vercel'|'not_tested';
  sha?:string|null; evidenceRef?:string|null; note?:string;
};
export const A11_TRACKS: ReadonlyArray<{id:A11Track;label:string;requires:A11Evidence['source']}> = [
  {id:'typescript',label:'TypeScript integral',requires:'code'},
  {id:'v63',label:'V63 estrito',requires:'code'},
  {id:'v70',label:'V70 duplo',requires:'code'},
  {id:'git_integrity',label:'Hashes e diff Git',requires:'code'},
  {id:'android_ci',label:'CI Android no SHA',requires:'ci'},
  {id:'android_install',label:'Instalação e retorno no APK real',requires:'physical'},
  {id:'identity_2x2',label:'RLS real: 2 contas × 2 pessoas',requires:'authenticated'},
  {id:'storage_2x2',label:'Storage real: leitura negativa',requires:'authenticated'},
  {id:'offline_two_devices',label:'Dois aparelhos: offline, reinício e fila',requires:'physical'},
  {id:'race_two_devices',label:'Dois aparelhos: concorrência e tombstones',requires:'physical'},
  {id:'notification_doze',label:'Notificações, quiet hours e Doze',requires:'physical'},
  {id:'accessibility_320_430',label:'320–430 dp, Voltar e TalkBack',requires:'physical'},
  {id:'avatar_performance',label:'Fênix: GPU, bateria e reduced motion',requires:'physical'},
  {id:'pwa_production',label:'Vercel pronta no mesmo SHA',requires:'vercel'},
] as const;
const isSha=(s:unknown):s is string=>typeof s==='string'&&/^[a-f\d]{40}$/i.test(s);
export function auditA11Certification(evidence:readonly A11Evidence[], expectedSha:string){
  if(!isSha(expectedSha)) throw Error('SHA de certificação não é um commit completo');
  const issues:string[]=[];
  const byId=new Map<A11Track,A11Evidence>();
  for(const item of evidence){
    if(!A11_TRACKS.some(t=>t.id===item.track)||byId.has(item.track)){issues.push('Etapa duplicada ou desconhecida');continue;}
    byId.set(item.track,item);
  }
  let passed=0,unverified=0,failed=0;
  for(const track of A11_TRACKS){
    const ev=byId.get(track.id);
    if(!ev||ev.verdict==='not_tested'){unverified++;continue;}
    if(ev.verdict==='failed'||ev.verdict==='blocked'){failed++;issues.push(track.label+': falhou ou foi bloqueada');continue;}
    if(ev.source!==track.requires||ev.sha!==expectedSha||!ev.evidenceRef?.trim()){
      unverified++;issues.push(track.label+': prova de fonte, recibo ou SHA ausente');continue;
    }
    passed++;
  }
  return {ready:passed===A11_TRACKS.length&&failed===0&&unverified===0&&issues.length===0,
    passed,failed,unverified,total:A11_TRACKS.length,issues};
}
/** Relatório compartilhável não contém identificadores de pessoa, nomes, documentos ou payloads. */
export function redactA11Report(input:{counts:Readonly<Record<string,number|null>>; queue:{ready:number;deferred:number;failed:number};
  coverage:string;generatedAt:string;isOnline:boolean}){
  const counts:Record<string,number|null>={};
  for(const [key,value] of Object.entries(input.counts)){
    if(!/^[a-z_]{1,48}$/.test(key))continue;
    counts[key]=value===null?null:Number.isSafeInteger(value)&&value>=0?value:null;
  }
  return {version:1,kind:'VAULT_A11_REDACTED_LOCAL_DIAGNOSTIC',generatedAt:input.generatedAt,
    coverage:input.coverage==='local_counts_only'?'local_counts_only':'unverified',isOnline:Boolean(input.isOnline),
    counts,queue:{ready:Math.max(0,Math.trunc(input.queue.ready||0)),
      deferred:Math.max(0,Math.trunc(input.queue.deferred||0)),failed:Math.max(0,Math.trunc(input.queue.failed||0))},
    disclaimer:'Contagens locais não certificam nuvem, histórico integral, segurança RLS nem dois aparelhos.'};
}
