"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, UploadCloud, FileText, Image as ImageIcon, 
  Loader2, User, FolderHeart, FileWarning 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { safeAddDocument, safeAddAnexoClinico } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabase/client";
import { compressImage, generateThumbnail } from "@/lib/imageCompression";

interface UploadGaleriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadGaleriaModal({ isOpen, onClose, onSuccess }: UploadGaleriaModalProps) {
  const { user } = useAuth();
  const persons = usePersons();
  const { showToast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [personId, setPersonId] = useState<string>("");
  const [categoria, setCategoria] = useState<"pessoal" | "saude">("saude");
  const [titulo, setTitulo] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);

  // Limpeza de memória (Evita vazamento do createObjectURL)
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const resetState = () => {
    setFile(null);
    setThumbnailFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPersonId("");
    setCategoria("saude");
    setTitulo("");
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      const isImage = selectedFile.type.startsWith("image/");
      
      // Se for imagem, faz dupla compressão (Alta para visualização, Baixa para Grid)
      const finalFile = await compressImage(selectedFile, 1600, 0.8);
      const thumbFile = isImage ? await generateThumbnail(selectedFile) : null;
      
      setFile(finalFile);
      setThumbnailFile(thumbFile);
      
      if (isImage) {
        if (preview) URL.revokeObjectURL(preview); // Limpa o anterior
        setPreview(URL.createObjectURL(finalFile));
      } else {
        setPreview(null);
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(selectedFile));
      }
    }
  };

  const handleUpload = async () => {
    if (!user?.id || !file || !personId || !titulo.trim()) {
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }

    setIsUploading(true);

    try {
      const isImage = file.type.startsWith("image/");
      const fileExt = file.name.split('.').pop();
      const baseUuid = crypto.randomUUID();
      
      const fileName = `${baseUuid}.${fileExt}`;
      const filePath = `${user.id}/${categoria}/${fileName}`;

      // 1. Upload do Arquivo Principal
      const { error: uploadError } = await supabase.storage
        .from('vault-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vault-attachments')
        .getPublicUrl(filePath);

      let thumbnailPublicUrl = undefined;

      // 2. Upload da Miniatura (Se for imagem)
      if (isImage && thumbnailFile) {
        const thumbPath = `${user.id}/${categoria}/thumb_${fileName}`;
        const { error: thumbError } = await supabase.storage
          .from('vault-attachments')
          .upload(thumbPath, thumbnailFile);
          
        if (!thumbError) {
          const { data: thumbData } = supabase.storage
            .from('vault-attachments')
            .getPublicUrl(thumbPath);
          thumbnailPublicUrl = thumbData.publicUrl;
        }
      }

      // 3. Roteamento Inteligente no Dexie (Salvando Original + Thumbnail)
      if (categoria === "pessoal") {
        await safeAddDocument({
          user_id: user.id,
          person_id: personId,
          category_id: "pessoal",
          type: "outro", 
          title: titulo.trim(),
          metadata: {},
          attachments: [{
            id: crypto.randomUUID(),
            name: file.name,
            url: publicUrl,
            thumbnail_url: thumbnailPublicUrl, // Amarrado com o novo Type!
            type: file.type.includes("pdf") ? "pdf" : "image",
            uploaded_at: new Date().toISOString()
          }],
          is_favorite: false
        });
      } else {
        await safeAddAnexoClinico({
          user_id: user.id,
          person_id: personId,
          tipo: titulo.trim(),
          url: publicUrl,
          thumbnail_url: thumbnailPublicUrl, // Amarrado no banco de saúde!
          tags: ["Upload Expresso"],
        });
      }

      showToast("Arquivo salvo com sucesso!", "success");
      if (onSuccess) onSuccess();
      handleClose();

    } catch (error) {
      console.error("Erro no upload:", error);
      showToast("Erro ao enviar arquivo", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 30 }}
            className="w-full max-w-md overflow-hidden rounded-[32px] border border-surface-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-surface-border/50 bg-surface-raised/30 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-ink-primary">
                Adicionar à Galeria
              </h2>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="rounded-full bg-surface-border/50 p-2 text-ink-muted transition-colors hover:bg-coral/20 hover:text-coral disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
              
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-ice/30 bg-ice/5 py-10 transition-all hover:bg-ice/10 active:scale-[0.98]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ice/20 text-ice">
                    <UploadCloud size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-ink-primary">Toque para selecionar</p>
                    <p className="text-xs text-ink-muted mt-1">Fotos ou PDFs</p>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[24px] border border-surface-border/50 bg-surface-raised p-2">
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-40 w-full rounded-[18px] object-cover" />
                  ) : (
                    <div className="flex h-40 w-full flex-col items-center justify-center rounded-[18px] bg-void/50">
                      <FileText size={40} className="text-ice opacity-80" />
                      <p className="mt-3 text-sm font-medium text-ink-muted truncate max-w-[200px]">{file.name}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => { setFile(null); setThumbnailFile(null); setPreview(null); }}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-void/80 text-white backdrop-blur-md"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*,application/pdf" 
                className="hidden" 
              />

              {file && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-primary">
                      A quem pertence?
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {persons.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => setPersonId(p.id)}
                          className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 transition-all ${
                            personId === p.id ? "border-ice bg-ice/15 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                          }`}
                        >
                          <User size={14} />
                          <span className="text-sm font-medium">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-primary">
                      O que é este arquivo?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCategoria("saude")}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all ${
                          categoria === "saude" ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        <FolderHeart size={24} />
                        <span className="text-xs font-semibold text-center">Exame / Laudo<br/>Receita</span>
                      </button>
                      <button
                        onClick={() => setCategoria("pessoal")}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all ${
                          categoria === "pessoal" ? "border-ice bg-ice/10 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        <FileWarning size={24} />
                        <span className="text-xs font-semibold text-center">Documento<br/>Pessoal (RG, etc)</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-primary">
                      Dê um título curto
                    </label>
                    <input
                      type="text"
                      placeholder={categoria === "saude" ? "Ex: Raio-X do Joelho" : "Ex: CNH Atualizada"}
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-sm text-ink-primary outline-none focus:border-ice"
                    />
                  </div>

                </motion.div>
              )}
            </div>

            <div className="border-t border-surface-border/50 bg-surface-raised/30 p-4">
              <button
                onClick={handleUpload}
                disabled={isUploading || !file || !personId || !titulo.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ice py-3.5 text-sm font-bold text-void transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando para a nuvem...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Salvar na Galeria
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
