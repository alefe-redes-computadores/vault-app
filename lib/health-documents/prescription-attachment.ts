export const PRESCRIPTION_ATTACHMENT_MAX_BYTES=15*1024*1024;
export type PrescriptionAttachmentLike={name:string;size:number;type:string};
export function validatePrescriptionAttachment(file:PrescriptionAttachmentLike):string|null{
  const extension=file.name.toLowerCase().split('.').pop()||"";
  const supported=file.type==="application/pdf"||file.type.startsWith("image/")||["pdf","jpg","jpeg","png","webp","heic","heif"].includes(extension);
  if(!supported)return "Use uma imagem ou PDF para anexar a receita.";
  if(!Number.isFinite(file.size)||file.size<=0)return "O arquivo selecionado está vazio ou indisponível.";
  if(file.size>PRESCRIPTION_ATTACHMENT_MAX_BYTES)return "O anexo deve ter no máximo 15 MB.";
  return null;
}
export const formatPrescriptionAttachmentSize=(bytes:number)=>bytes>=1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
