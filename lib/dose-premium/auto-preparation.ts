/** Private preparation orchestration. The only recovery writer is the existing
 * authenticated operational adapter. No clinical write, sync ACK, or activation
 * is performed by this module. Storage owns atomic add / epoch / completion. */
export type PreparationScope={account_id:string;operation_id:string;sha256:string;epoch:string|null;completed:boolean};
export type SavedPreparation=PreparationScope & {bytes:string};
export type PreparationStore={
 read(uid:string):Promise<SavedPreparation|null>;
 add(value:SavedPreparation):Promise<void>;
 bind(uid:string,operation:string,sha256:string,epoch:string):Promise<void>;
 complete(uid:string,operation:string,sha256:string,epoch:string):Promise<void>;
};
export type PreparationHost={
 guard():void;
 enrollment():Promise<{account_id:string;state:string;epoch:string|null}>;
 synchronize():Promise<boolean>;
 capture():Promise<{bytes:string;sha256:string}>;
 inspect(bytes:string):void;
 digest(bytes:string):Promise<string>;
 uuid():string;
 store:PreparationStore;
 recover(input:{uid:string;epoch:string;operationId:string;backupText:string;expectedSourceSha256:string}):Promise<{receipt:{account_id:string;epoch:string;operation_id:string;source_sha256:string;state:string}}>;};
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
const hash=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const fail=(reason:string):never=>{throw Error('M02_RECOVERY_AUTO_'+reason);};
export function preparationScope(value:SavedPreparation):PreparationScope {const {account_id,operation_id,sha256,epoch,completed}=value;return {account_id,operation_id,sha256,epoch,completed};}
async function check(h:PreparationHost,uid:string,v:SavedPreparation|null):Promise<SavedPreparation>{
 h.guard();if(!v||v.account_id!==uid||!uuid(v.operation_id)||!hash(v.sha256)||v.epoch!==null&&!uuid(v.epoch)||typeof v.completed!=='boolean'||v.completed&&!v.epoch||typeof v.bytes!=='string')return fail('SAVED_SCOPE');
 if(await h.digest(v.bytes)!==v.sha256)return fail('SAVED_HASH');h.guard();h.inspect(v.bytes);return v;
}
async function enrollment(h:PreparationHost,uid:string){h.guard();const e=await h.enrollment();h.guard();if(e.account_id!==uid)return fail('ACCOUNT');return e;}
export async function prepareMacro02Automatically(h:PreparationHost,uid:string):Promise<PreparationScope>{
 if(!uuid(uid)||(await enrollment(h,uid)).state!=='legacy')return fail('NOT_LEGACY');
 const existing=await h.store.read(uid);h.guard();
 // Never silently replace a preparation, including after app restart.
 if(existing){const v=await check(h,uid,existing);if(v.epoch||v.completed)return fail('ALREADY_BOUND');const image=await h.capture();h.guard();if(image.bytes!==v.bytes||image.sha256!==v.sha256)return fail('LOCAL_CHANGED');if((await enrollment(h,uid)).state!=='legacy')return fail('NOT_LEGACY');return preparationScope(v);}
 if(!await h.synchronize())return fail('SYNC_NOT_CONFIRMED');h.guard();
 if((await enrollment(h,uid)).state!=='legacy')return fail('NOT_LEGACY');
 const image=await h.capture();h.guard();h.inspect(image.bytes);
 if(!hash(image.sha256)||await h.digest(image.bytes)!==image.sha256)return fail('CAPTURE_HASH');
 const value:SavedPreparation={account_id:uid,operation_id:h.uuid(),sha256:image.sha256,epoch:null,completed:false,bytes:image.bytes};
 if(!uuid(value.operation_id))return fail('OPERATION');h.guard();
 await h.store.add(value);h.guard();
 const saved=await check(h,uid,await h.store.read(uid));
 if(saved.bytes!==value.bytes||saved.operation_id!==value.operation_id||saved.sha256!==value.sha256||saved.epoch!==null||saved.completed)return fail('READBACK');
 // Detect local changes while the independent copy was being committed.
 const current=await h.capture();h.guard();if(current.bytes!==saved.bytes||current.sha256!==saved.sha256)return fail('LOCAL_CHANGED');
 if((await enrollment(h,uid)).state!=='legacy')return fail('NOT_LEGACY');return preparationScope(saved);
}
export async function resumeMacro02Automatically(h:PreparationHost,uid:string):Promise<PreparationScope>{
 const e=await enrollment(h,uid);if(e.state!=='frozen'||!uuid(e.epoch))return fail('NOT_FROZEN');const epoch=e.epoch;
 const saved=await check(h,uid,await h.store.read(uid));if(saved.epoch&&saved.epoch!==epoch)return fail('EPOCH_CHANGED');
 if(!saved.epoch){h.guard();await h.store.bind(uid,saved.operation_id,saved.sha256,epoch);h.guard();}
 const bound=await check(h,uid,await h.store.read(uid));if(bound.epoch!==epoch||bound.operation_id!==saved.operation_id||bound.bytes!==saved.bytes||bound.sha256!==saved.sha256)return fail('BIND_READBACK');
 const fresh=await enrollment(h,uid);if(fresh.state!=='frozen'||fresh.epoch!==epoch)return fail('FENCE_CHANGED');
 if(bound.completed)return preparationScope(bound);
 const result=await h.recover({uid,epoch,operationId:bound.operation_id,backupText:bound.bytes,expectedSourceSha256:bound.sha256});h.guard();
 const r=result.receipt;if(r.account_id!==uid||r.epoch!==epoch||r.operation_id!==bound.operation_id||r.source_sha256!==bound.sha256||r.state!=='local_verified')return fail('RECEIPT');
 await h.store.complete(uid,bound.operation_id,bound.sha256,epoch);h.guard();const done=await check(h,uid,await h.store.read(uid));if(!done.completed||done.epoch!==epoch||done.operation_id!==bound.operation_id||done.bytes!==bound.bytes)return fail('COMPLETE_READBACK');return preparationScope(done);
}
