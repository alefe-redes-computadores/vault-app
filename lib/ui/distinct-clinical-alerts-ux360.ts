/** Presentation only: never deduplicate records, CID links or sources. */
export function distinctClinicalAlertMessages(messages:readonly unknown[]):string[]{
 const seen=new Set<string>();const result:string[]=[];
 for(const message of messages){if(typeof message!=='string')continue;const trimmed=message.trim();if(!trimmed)continue;const key=trimmed.normalize('NFC').replace(/\s+/gu,' ').toLocaleLowerCase('pt-BR');if(seen.has(key))continue;seen.add(key);result.push(trimmed);}
 return result;
}
