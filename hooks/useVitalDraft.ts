"use client";
import {useEffect,useRef,useState} from 'react';
import type {Scope} from '@/lib/vital/model';
import type {DraftKind,createVitalDraftStorage} from '@/lib/vital/drafts';
import {own} from '@/lib/vital/validation';
export type DraftStorage=ReturnType<typeof createVitalDraftStorage>;
/** Autosave is local, revision-guarded and serialized. Final record still uses the only domain writer. */
export function useVitalDraft<T extends object>(storage:DraftStorage,scope:Scope,id:string,kind:DraftKind,expectedRevision:number|null,payload:T,initialDraftRevision:number|null=null){
 const revision=useRef(initialDraftRevision),serial=useRef<Promise<unknown>>(Promise.resolve()),closed=useRef(false),alive=useRef(true),scopeRef=useRef(scope);const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');const [message,setMessage]=useState('');
 const latest=useRef({payload,expectedRevision});latest.current={payload,expectedRevision};scopeRef.current=scope;
 const identity=useRef({...scope,id,kind});const last=useRef('');
 const encode=(value:unknown)=>JSON.stringify(value,(_k,v)=>{if(typeof v==='number'&&!Number.isFinite(v)){if(!Number.isNaN(v))throw Error('Número inválido.');return {__vault_invalid_number:true};}return v;});
 const fingerprint=JSON.stringify({payload,expectedRevision},(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?'__invalid_number__':v);
 function persist(){const captured=latest.current;return serial.current=serial.current.catch(()=>{}).then(async()=>{if(closed.current||!own(scopeRef.current,identity.current))return;try{const encoded=encode(captured);if(encoded===last.current)return;if(alive.current)setStatus('saving');const row=await storage.save(scope,{id,kind,payload:captured.payload,expected_revision:captured.expectedRevision,expected_draft_revision:revision.current});revision.current=row.draft_revision;last.current=encoded;if(alive.current){setStatus('saved');setMessage('');}}catch(e){if(alive.current){setStatus('error');setMessage(e instanceof Error?e.message:'Rascunho não salvo.');}throw e;}});}
 useEffect(()=>{alive.current=true;closed.current=false;return()=>{alive.current=false;};},[]);
 useEffect(()=>{void persist().catch(()=>{});},[fingerprint]);
 useEffect(()=>{const flush=()=>{if(document.visibilityState==='hidden')void persist().catch(()=>{});};document.addEventListener('visibilitychange',flush);return()=>document.removeEventListener('visibilitychange',flush);},[]);
 async function clear(){closed.current=true;await serial.current.catch(()=>{});try{if(revision.current!==null)await storage.discard(scope,id,revision.current);revision.current=null;last.current='';}catch(e){closed.current=false;throw e;}}
 return {status,message,flush:persist,clear};
}
