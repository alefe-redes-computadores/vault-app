/** Safe diagnostic: never disclose arbitrary error text or clinical values. */
export function macro02RecoveryDiagnostic(error:unknown):string{
 const message=error instanceof Error?error.message:'';
 if(/^(?:M02_(?:RECOVERY|CUTOVER_STORAGE|R6|R5)_[A-Z0-9_]+|MACRO02_(?:CUTOVER|PROJECTION)_[A-Z0-9_]+)$/.test(message)&&message.length<=96)return message;
 const name=error instanceof Error?error.name:'';
 return ['NotFoundError','InvalidStateError','TransactionInactiveError','PrematureCommitError','QuotaExceededError','SecurityError','DataError','AbortError','NotReadableError'].includes(name)?name:'M02_RECOVERY_UNCLASSIFIED';
}
export function verifyMacro02SavedBytes(expected:string,actual:unknown):void{
 if(typeof actual!=='string'||actual!==expected)throw Error('M02_RECOVERY_FILE_VERIFY');
}
/** Only the read-only capture may restart, never restoration or a server claim. */
export async function retryMacro02ReadOnly<T>(attempt:()=>Promise<T>,visible:()=>boolean):Promise<T>{
 try{return await attempt();}catch(e){if(!(e instanceof Error)||e.message!=='M02_RECOVERY_SESSION_CHANGED'||!visible())throw e;return attempt();}
}
