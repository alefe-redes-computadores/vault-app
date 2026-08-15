import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Image as ImageIcon, FileWarning } from "lucide-react";
import type { GalleryItem } from "@/hooks/useGaleria";

interface DocumentPreviewProps {
  item: GalleryItem;
  accentColor: string;
  onClick: (item: GalleryItem) => void;
}

export function DocumentPreview({ item, accentColor, onClick }: DocumentPreviewProps) {
  const [imgStatus, setImgStatus] = useState<"idle" | "loading" | "success" | "error">("loading");

  // Usa a miniatura ultraleve se existir, caso contrário tenta a original
  const imageSource = item.thumbnail_url || item.url;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(item)}
      className="group relative aspect-square w-full overflow-hidden rounded-[20px] border bg-surface transition-all"
      style={{ borderColor: `${accentColor}30` }} // Accent Layer Média (30% opacidade)
    >
      {item.file_type === "pdf" ? (
        // STATE: PDF PREVIEW
        <div className="flex h-full w-full flex-col items-center justify-center bg-void/30 p-4 transition-colors group-hover:bg-void/50">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[18px] shadow-inner" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
            <FileText size={26} strokeWidth={1.5} />
          </div>
          <span className="rounded-lg bg-surface-border/50 px-2.5 py-1 text-[10px] font-bold text-ink-primary uppercase tracking-widest">PDF</span>
        </div>
      ) : (
        // STATE: IMAGE PREVIEW
        <>
          {imgStatus === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-ink-muted" />
            </div>
          )}
          
          {imgStatus === "error" ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-void/30 p-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-border/30 text-ink-muted">
                <FileWarning size={18} />
              </div>
              <span className="text-[10px] font-medium text-ink-muted text-center leading-tight">Prévia<br/>Indisponível</span>
            </div>
          ) : (
            <img 
              src={imageSource} 
              alt={item.title} 
              loading="lazy"
              onLoad={() => setImgStatus("success")}
              onError={() => setImgStatus("error")}
              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${imgStatus === "success" ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </>
      )}
      
      {/* Informações sobrepostas (Accent Layer Fraca no Fundo) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-10 text-left">
        <p className="truncate text-[13px] font-semibold text-white/95 leading-tight">{item.title}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-white/60">{item.category === 'saude' ? 'Saúde' : 'Pessoal'}</span>
          {item.subtitle && <span className="text-[10px] font-medium text-white/50 truncate max-w-[60%] text-right">{item.subtitle}</span>}
        </div>
      </div>
    </motion.button>
  );
}
