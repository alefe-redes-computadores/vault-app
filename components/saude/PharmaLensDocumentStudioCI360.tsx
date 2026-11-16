'use client';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Camera, ScanText, PencilLine, ShieldCheck, AlertTriangle, FileCheck2, Database, Eraser, LockKeyhole } from 'lucide-react';
import type { Medicamento } from '@/lib/types';
import {
  analyzePharmaLensDocumentTextCI360, candidateFieldsCI360, updatePharmaLensCandidateFieldCI360,
  validateLocalPhotoCI360, type PharmaLensCandidateCI360, type PharmaLensDocumentFieldCI360,
  type PharmaLensTextOriginCI360,
} from '@/lib/health-intelligence/pharmalens-document-candidate-ci360';
import { auditPharmaLensDocumentCI360 } from '@/lib/health-intelligence/pharmalens-catalog-audit-ci360';

type TextBlockCI360={rawValue?:string};
type TextDetectorCI360=new()=>{detect(image:ImageBitmap):Promise<TextBlockCI360[]>};
const labels:Record<PharmaLensDocumentFieldCI360,string>={name:'Nome identificado',strength:'Dosagem',manufacturer:'Fabricante',batch:'Lote',expiry:'Validade',registration:'Número de registro'};
const fields:PharmaLensDocumentFieldCI360[]=['name','strength','manufacturer','batch','expiry','registration'];
function detectAvailability():boolean {
  if(typeof window==='undefined')return false;
  return Boolean((window as Window & {TextDetector?:TextDetectorCI360}).TextDetector && typeof createImageBitmap==='function');
}
/** P4: imagem e texto ficam em memória até sair da tela. Nenhuma foto ou candidato é sincronizado. */
export function PharmaLensDocumentStudioCI360({medication}:{medication:Medicamento}) {
  const [photo,setPhoto]=useState<string|null>(null);
  const [selectedFile,setSelectedFile]=useState<File|null>(null);
  const [fileName,setFileName]=useState('');
  const [text,setText]=useState('');
  const [origin,setOrigin]=useState<PharmaLensTextOriginCI360>('manual_transcription');
  const [candidate,setCandidate]=useState<PharmaLensCandidateCI360|null>(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [readOnlyOCRSupported,setReadOnlyOCRSupported]=useState<boolean|null>(null);
  useEffect(()=>{setReadOnlyOCRSupported(detectAvailability());},[]);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo);},[photo]);
  const analysis=useMemo(()=>candidate?auditPharmaLensDocumentCI360(candidate,medication):null,[candidate,medication]);
  function reset(){setPhoto(null);setSelectedFile(null);setFileName('');setText('');setOrigin('manual_transcription');setCandidate(null);setStatus('');}
  function handleFile(file:File|undefined){
    if(!file)return;
    const error=validateLocalPhotoCI360(file);
    if(error){reset();setStatus(error);return;}
    setPhoto(URL.createObjectURL(file));setSelectedFile(file);setFileName(file.name.slice(0,100));setText('');setOrigin('manual_transcription');setCandidate(null);
    setStatus('Imagem selecionada apenas neste aparelho; nenhuma leitura ou envio começou automaticamente.');
  }
  async function runLocalOCR(){
    if(!selectedFile||busy)return;
    const Detector=(window as Window & {TextDetector?:TextDetectorCI360}).TextDetector;
    if(!Detector||typeof createImageBitmap!=='function'){
      setStatus('OCR local não disponível neste Android/WebView. Use a transcrição manual sem enviar a imagem.');return;
    }
    setBusy(true);setStatus('Lendo a imagem localmente, sem upload…');
    let bitmap:ImageBitmap|null=null;
    try{
      bitmap=await createImageBitmap(selectedFile);
      const blocks=await new Detector().detect(bitmap);
      const output=blocks.map(b=>String(b.rawValue||'').trim()).filter(Boolean).join('\n').slice(0,12000);
      if(!output){setStatus('Nenhuma palavra reconhecida. Confira a imagem e transcreva os dados manualmente.');return;}
      setText(output);setOrigin('local_ocr');setCandidate(null);
      setStatus('OCR local concluído. O texto pode conter erros; revise cada campo antes de confirmar.');
    }catch{
      setStatus('O detector local falhou nesta imagem. Nenhum dado foi enviado; use a transcrição manual.');
    }finally{bitmap?.close();setBusy(false);}
  }
  function extract(){
    if(!text.trim()){setStatus('Digite o texto da embalagem ou execute OCR local para extrair candidatos.');return;}
    const result=analyzePharmaLensDocumentTextCI360(text,origin,new Date().toISOString());
    setCandidate(result.candidate);
    setStatus(`${candidateFieldsCI360(result.candidate)} campo(s) candidato(s) encontrado(s). Conferir, editar ou descartar sem alterar cadastro.`);
  }
  return <section aria-label="Estúdio documental privado do PharmaLens" className="space-y-3 rounded-[22px] border border-violet-400/20 bg-violet-400/[.045] p-3.5">
    <div className="flex items-start gap-2"><span className="rounded-xl bg-violet-400/10 p-2 text-violet-300"><LockKeyhole size={18}/></span>
      <div><h3 className="text-sm font-bold text-ink-primary">Conferência documental privada</h3><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Imagem e candidato temporários nesta sessão. Sem upload, alteração de dose, estoque, receita, catálogo ou aquisição.</p></div></div>
    <div className="rounded-xl border border-surface-border/60 bg-surface p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><Camera size={15} className="text-sky-300"/>1. Selecionar embalagem ou foto</div>
      <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-violet-300/25 bg-violet-300/[.06] px-3 text-xs font-semibold text-violet-200">Selecionar imagem local<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event:ChangeEvent<HTMLInputElement>)=>handleFile(event.target.files?.[0])}/></label>
      {photo&&<img src={photo} alt="Imagem local para conferência privada do rótulo" className="mt-3 max-h-72 w-full rounded-xl bg-black object-contain"/>}
      {fileName&&<p className="mt-1 text-[10px] text-ink-muted">Imagem: {fileName}</p>}
      <button type="button" disabled={!selectedFile||busy||readOnlyOCRSupported!==true} onClick={()=>void runLocalOCR()}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-300/[.045] px-3 text-xs font-semibold text-sky-200 disabled:opacity-45"><ScanText size={15}/>{busy?'Lendo imagem…':'Ler texto por OCR local'}</button>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{readOnlyOCRSupported===null?'Verificando suporte de OCR local…':readOnlyOCRSupported?'Detector local disponível: execute apenas se desejar.':'Este aparelho/WebView não disponibiliza o detector local de texto; transcrição manual disponível.'}</p>
    </div>
    <div className="rounded-xl border border-surface-border/60 bg-surface p-3">
      <label htmlFor="pl-ci360-text" className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><PencilLine size={15} className="text-amber-300"/>2. Corrigir ou transcrever o texto</label>
      <textarea id="pl-ci360-text" value={text} rows={5} maxLength={12000} onChange={(event:ChangeEvent<HTMLTextAreaElement>)=>{setText(event.target.value);setOrigin('manual_transcription');setCandidate(null);}} placeholder="Ex.: Medicamento: ... / Dosagem: ... / Lote: ... / Validade: ... / Reg. MS: ..." className="mt-2 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-xs leading-relaxed text-ink-primary"/>
      <p className="text-[10px] text-ink-muted">Origem atual: {origin==='local_ocr'?'OCR local (texto ainda não validado)':'transcrição/editado por você'}.</p>
      <button type="button" onClick={extract} className="mt-2 min-h-11 w-full rounded-xl border border-violet-300/30 bg-violet-400/10 px-3 text-xs font-bold text-violet-200">Extrair campos para conferência</button>
    </div>
    {candidate&&analysis&&<div className="space-y-3 rounded-xl border border-amber-300/20 bg-amber-300/[.025] p-3">
      <div className="flex items-center gap-2"><FileCheck2 size={16} className="text-amber-200"/><strong className="text-xs text-ink-primary">3. Candidato privado · não confirmado</strong></div>
      <p className="text-[11px] text-ink-muted">Os campos abaixo são apenas sugestões extraídas. Você pode corrigi-los sem alterar o cadastro de {medication.nome}.</p>
      <div className="grid gap-2 sm:grid-cols-2">{fields.map(field=><label key={field} className="text-[11px] text-ink-muted">{labels[field]}<input value={candidate[field]} onChange={(event:ChangeEvent<HTMLInputElement>)=>setCandidate(current=>current?updatePharmaLensCandidateFieldCI360(current,field,event.target.value):current)} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-surface-border bg-surface px-2.5 text-xs text-ink-primary"/></label>)}</div>
      <div className="rounded-xl border border-surface-border/60 bg-void/20 p-2.5"><strong className="flex items-center gap-1 text-xs text-ink-primary"><Database size={13}/>Comparação OCR/transcrição × cadastro × catálogo</strong>
        <p className="mt-1 text-[10px] text-ink-muted">{analysis.hasOfficialExact?'Existe referência oficial exata previamente vinculada no cadastro.':'Não há referência oficial exata comprovada para esta apresentação.'} A comparação de texto não valida registro na Anvisa.</p>
        <div className="mt-2 space-y-1.5">{analysis.rows.map(row=><div key={row.field} className="rounded-lg border border-surface-border/40 px-2 py-1.5 text-[10px] text-ink-secondary"><strong className="text-ink-primary">{row.label}</strong><p>Candidato: {row.captured||'não identificado'} · Cadastro: {row.declared||'não informado'}</p>{row.catalog&&<p>Catálogo ({row.catalogAuthority}): {row.catalog}</p>}<p className={row.status==='diverge_do_cadastro'?'text-amber-200':'text-ink-muted'}>{row.status==='diverge_do_cadastro'?'Diferença para revisão':row.status==='concorda_com_cadastro'?'Texto coincide com cadastro (não confirma autenticidade)':'Sem correspondência certificada'} · {row.note}</p></div>)}</div>
        {analysis.provenance.length>0&&<p className="mt-2 text-[10px] text-ink-muted">Proveniência vinculada: {analysis.provenance.slice(0,6).join(' · ')}</p>}
      </div>
      <button type="button" aria-pressed={candidate.reviewedByPerson} onClick={()=>setCandidate(c=>c?{...c,reviewedByPerson:!c.reviewedByPerson}:c)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 px-3 text-xs font-semibold text-emerald-200"><ShieldCheck size={15}/>{candidate.reviewedByPerson?'Conferência visual marcada nesta sessão':'Marcar que conferi os campos visualmente'}</button>
      {candidate.reviewedByPerson&&<p role="note" className="text-[10px] text-emerald-200">Revisão humana local, não é verificação da Anvisa, prescrição, comprovação de compra ou entrada de estoque.</p>}
    </div>}
    {status&&<p role="status" className="flex items-start gap-1.5 text-[11px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>{status}</p>}
    <button type="button" onClick={reset} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-border/60 px-3 text-xs text-ink-muted"><Eraser size={14}/>Descartar imagem, texto e candidato desta sessão</button>
    <p className="text-[10px] leading-relaxed text-ink-muted">OCR experimental depende do suporte do navegador; fotos e texto não saem desta tela. Para guardar documentos, use o módulo Documentos existente com confirmação explícita. Nunca transformar leitura de rótulo em prescrição ou estoque.</p>
  </section>;
}
