/** Read-only: Supabase RLS expõe SOMENTE fatos verificados; indisponível = desconhecido. */
import { supabase } from '@/lib/supabase/client';
import type { MedicationUseFactM1 } from './use-evidence-macro1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function readOfficialUseEvidenceM1(productId:string):Promise<MedicationUseFactM1[]|null>{
 if(!UUID.test(productId))return null;
 try{
  const {data,error}=await supabase.from('medication_use_evidence').select('id,product_id,presentation_id,fact_kind,statement,qualification,source_url,source_section,source_document_sha256,source_version,reviewed_at,source_published_at,effective_from,effective_until,review_status')
   .eq('product_id',productId).eq('review_status','verified').limit(75);
  if(error||!data)return null;
  return data as MedicationUseFactM1[];
 }catch{return null;}
}
