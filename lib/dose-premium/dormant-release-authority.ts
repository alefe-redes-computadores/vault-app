import {countMacro02Pending} from './authority-session';
import type {PendingItem} from './atomic-envelope';
import type {Macro02Writer} from './account-authority';

/** Release-bound contract, not a cache of R2 capability. This specific binary
 * may write only legacy facts while the independently approved persistent R2
 * activation barrier exists. Never use this policy for an activated release.
 * Removing the barrier requires a separate server/client cutover protocol,
 * including incompatible older binaries that might reconnect indefinitely. */
export const MACRO02_RELEASE_AUTHORITY = 'dormant-legacy-r2-20261126212304' as const;
// Deliberately not a mutable feature flag or user preference.
export const MACRO02_PREMIUM_UI_ENABLED: boolean = false;
export type ClinicalWriteAuthority={writer:Macro02Writer;epoch?:string;assertCurrent:()=>Promise<void>};
export function createDormantReleaseAuthority(host:{
 localAccount:()=>Promise<string|null>;
 queue:()=>Promise<readonly PendingItem[]>;
}){
 let generation=0;
 function invalidate(){generation++;}
 async function prepareWrite(uid:string):Promise<ClinicalWriteAuthority>{
  const selected=generation;
  if(!uid||await host.localAccount()!==uid||selected!==generation)throw Error('MACRO02_LOCAL_ACCOUNT_UNCONFIRMED');
  // No auth or network inside the Dexie transaction. Auth lifecycle changes
  // invalidate the generation synchronously, including account switches.
  const assertCurrent=async()=>{
   if(selected!==generation)throw Error('MACRO02_LOCAL_AUTHORITY_CHANGED');
   const pending=countMacro02Pending(await host.queue(),uid);
   if(selected!==generation)throw Error('MACRO02_LOCAL_AUTHORITY_CHANGED');
   if(pending.premium||pending.unclassified)throw Error('MACRO02_LOCAL_PENDING_CONFLICT');
  };
  await assertCurrent();
  if(await host.localAccount()!==uid||selected!==generation)throw Error('MACRO02_LOCAL_AUTHORITY_CHANGED');
  return Object.freeze({writer:'legacy' as const,assertCurrent});
 }
 return {invalidate,prepareWrite};
}
