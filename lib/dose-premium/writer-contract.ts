import {readPharmaceuticalSnapshot,type PharmaceuticalSnapshot} from './pharmaceutical-snapshot';
import {readDoseUnit,preserveUnitForOrdinaryWrite,type DoseUnitFields} from './historical-unit';
import {planStockChange,readStockEvidence,type StockContext,type StockEvidence,type Conversion} from './stock-evidence';
import {verifyDoseSnapshotAck,type DoseSnapshot} from './compatibility';
import {validDay,validHour,validInstant} from './center-view';
export type ClinicalWriteRequest={identity:Pick<DoseSnapshot,'id'|'user_id'|'person_id'|'medicamento_id'|'data'|'horario'>;status:'taken'|'ignored'|'clear';pharmaceuticalSnapshot?:PharmaceuticalSnapshot|null;actualAt?:string;ignoredReason?:string;note?:string;quantity?:number|null;unit?:DoseUnitFields;asOf:string;expected: DoseSnapshot|null;adjustStock:boolean;historicalReview?:boolean;requireRegisteredStock?:boolean;origin?:NonNullable<DoseSnapshot['dose_kind']>};
export type PreparedWrite={previous:DoseSnapshot|null;next:DoseSnapshot|null;stockBefore:StockContext;delta:number;stockEvidence:StockEvidence;stockAfter:number|null};
/** Called inside the existing transaction after authoritative slot, medication and stock reads. No I/O, no queue. */
export function prepareClinicalWrite(req:ClinicalWriteRequest,current:DoseSnapshot|null,stock:StockContext,conversion?:Conversion):PreparedWrite{
  const id=req.identity;
  if(!id.id||!id.user_id||!id.person_id||!id.medicamento_id||!validDay(id.data)||!validHour(id.horario)||!validInstant(req.asOf))throw Error('Identidade ou instante inválido.');
  if(stock.user_id!==id.user_id||stock.person_id!==id.person_id||stock.medicationId!==id.medicamento_id)throw Error('Estoque fora do escopo.');
  if(Boolean(current)!==Boolean(req.expected)||current&&req.expected&&!verifyDoseSnapshotAck(req.expected,current))throw Error('Dose alterada desde a revisão.');
  if(current&&Object.entries(id).some(([k,v])=>current[k as keyof DoseSnapshot]!==v))throw Error('Identidade da dose divergente.');
  if(req.status==='clear'&&!current)throw Error('Registro inexistente.');
  if(req.status==='taken'&&(!validInstant(req.actualAt)||Date.parse(req.actualAt)>Date.parse(req.asOf)))throw Error('Informe o instante real da tomada, não futuro.');
  if(req.status!=='taken'&&req.actualAt!==undefined)throw Error('Somente uma tomada possui instante real.');
  if(req.status==='ignored'&&(!req.ignoredReason?.trim()||req.ignoredReason.trim().length>500))throw Error('Informe o motivo da não tomada.');
  if(req.note!==undefined&&req.note.trim().length>500)throw Error('Observação muito longa.');
  if(req.quantity!=null&&(!Number.isFinite(req.quantity)||req.quantity<=0))throw Error('Quantidade inválida.');
  const wasTaken=Boolean(current?.tomado_em),willBeTaken=req.status==='taken';
  // Omitted quantity retains the previous fact; never reads the current medication's configured dose here.
  const quantity=req.quantity===undefined?current?.quantidade??null:req.quantity;
  const unit=preserveUnitForOrdinaryWrite(current??{},req.unit??{});
  const previousUnit=readDoseUnit(current??{}).fields;
  const kind=current?.dose_kind??req.origin??'scheduled';
  if(current?.dose_kind&&req.origin&&current.dose_kind!==req.origin)throw Error('Origem histórica não pode ser alterada.');
  const factUnchanged=wasTaken&&willBeTaken&&quantity===(current?.quantidade??null)&&unit.unidade_dose===previousUnit.unidade_dose&&unit.unidade_dose_rotulo===previousUnit.unidade_dose_rotulo&&unit.fonte_unidade===previousUnit.fonte_unidade;
  const plan=planStockChange({identity:{user_id:id.user_id,person_id:id.person_id,medicationId:id.medicamento_id,doseId:id.id},stock,previous:current?.estoque_movimento,wasTaken,willBeTaken,quantity,unit,conversion,adjustStock:req.adjustStock,historicalReview:req.historicalReview,requireRegisteredStock:req.requireRegisteredStock,asOf:req.asOf,factUnchanged});
  if(plan.kind==='blocked')throw Error(plan.reason);
  const pharma=current?.farmaco_snapshot??(!current?.tomado_em&&!current?.ignorado_em?readPharmaceuticalSnapshot(req.pharmaceuticalSnapshot,id):null);
  const next:DoseSnapshot|null=req.status==='clear'?null:{...id,...(pharma?{farmaco_snapshot:pharma}:{}),quantidade:quantity,...unit,dose_kind:kind,tomado_em:willBeTaken?req.actualAt!:null,ignorado_em:req.status==='ignored'?current?.ignorado_em??req.asOf:null,motivo:req.status==='ignored'?req.ignoredReason!.trim():req.note!==undefined?req.note.trim()||null:kind==='planned'||kind==='sos'||kind==='extra'?current?.motivo??null:null,estoque_movimento:plan.next};
  // The planned receipt is not proof of a committed movement. Canonical writer must use confirmObservedWrite below.
  const stockAfter=stock.balance===null?null:stock.balance-plan.delta;
  return {previous:current,next,stockBefore:{...stock},delta:plan.delta,stockEvidence:plan.next,stockAfter};
}
/** Assert the exact read-back of both records before the existing writer commits/enqueues. No write in this helper. */
export function confirmObservedWrite(prepared:PreparedWrite,observed:{dose:DoseSnapshot|null;stock:StockContext}):void{
  const a=prepared.stockBefore,b=observed.stock;
  if(a.user_id!==b.user_id||a.person_id!==b.person_id||a.medicationId!==b.medicationId||a.basis!==b.basis||a.unit!==b.unit||!Object.is(prepared.stockAfter,b.balance))throw Error('Movimentação efetiva não corresponde à intenção; abortar transação.');
  if(Boolean(prepared.next)!==Boolean(observed.dose)||prepared.next&&observed.dose&&!verifyDoseSnapshotAck(prepared.next,observed.dose))throw Error('Dose efetivamente persistida diverge; abortar transação.');
  if(prepared.delta!==0&&readStockEvidence(prepared.stockEvidence).state==='unknown')throw Error('Movimentação sem evidência; abortar transação.');
}
