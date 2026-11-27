'use client';
import {useEffect,useRef,useState} from 'react';
import {verifyMacro02ActiveDeviceR5} from '@/lib/sync/macro02-device-r5';
import {readMacro02EnrollmentR5} from '@/lib/sync/macro02-enrollment-r5';
export function Macro02ActiveDeviceVerificationR5({uid}:{uid:string}){
 const [eligible,setEligible]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const alive=useRef(false),running=useRef(false);
 useEffect(()=>{alive.current=true;let current=true;const refresh=()=>{void readMacro02EnrollmentR5(uid).then(e=>{if(current)setEligible(e.state==='premium');},()=>{if(current)setEligible(false);});};refresh();window.addEventListener('online',refresh);return()=>{alive.current=false;current=false;window.removeEventListener('online',refresh);};},[uid]);
 async function verify(){if(running.current)return;running.current=true;setBusy(true);setMessage('');try{await verifyMacro02ActiveDeviceR5(uid);if(alive.current)setMessage('Aparelho conferido com a base remota. A autoridade da conta será reavaliada.');}catch{if(alive.current)setMessage('Não foi possível comprovar a correspondência integral. Preserve a fila e os dados; nenhuma restauração foi executada.');}finally{running.current=false;if(alive.current)setBusy(false);}}
 if(!eligible)return null;
 return <section className="mb-4 rounded-2xl border border-white/10 p-4"><h2 className="font-semibold">Conferência do aparelho Premium</h2><p className="mt-2 text-sm text-ink-secondary">Compara os dados locais com a conta ativa. Não restaura, não exclui e não reenvia operações.</p><button type="button" disabled={busy} onClick={()=>void verify()} className="mt-3 rounded-xl border border-white/20 px-4 py-2 disabled:opacity-50">{busy?'Conferindo…':'Conferir aparelho'}</button>{message&&<p role="status" className="mt-2 text-sm">{message}</p>}</section>;
}
