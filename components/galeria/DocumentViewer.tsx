import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Share2, FileText, ExternalLink } from "lucide-react";
import type { GalleryItem } from "@/hooks/useGaleria";

interface DocumentViewerProps {
  item: GalleryItem;
  onClose: () => void;
  onShare: (item: GalleryItem) => void;
}

export function DocumentViewer({ item, onClose, onShare }: DocumentViewerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Referências mutáveis (Bypass no React State para performance máxima de 60fps)
  const transform = useRef({ scale: 1, x: 0, y: 0 });
  const initialPinch = useRef({ dist: 0, scale: 1 });
  const lastPan = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);

  // Aplica as transformações diretas na GPU
  const applyTransform = () => {
    if (imgRef.current) {
      imgRef.current.style.transform = `translate3d(${transform.current.x}px, ${transform.current.y}px, 0) scale(${transform.current.scale})`;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPanning.current = false;
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialPinch.current = { dist, scale: transform.current.scale };
    } else if (e.touches.length === 1 && transform.current.scale > 1) {
      isPanning.current = true;
      lastPan.current = {
        x: e.touches[0].clientX - transform.current.x,
        y: e.touches[0].clientY - transform.current.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinch.current.dist > 0) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      // Limita o zoom entre 1x e 4x
      const newScale = Math.min(Math.max(1, initialPinch.current.scale * (dist / initialPinch.current.dist)), 4);
      transform.current.scale = newScale;
      requestAnimationFrame(applyTransform);
    } else if (e.touches.length === 1 && isPanning.current) {
      // Arrastar (Pan) protegido pela GPU
      transform.current.x = e.touches[0].clientX - lastPan.current.x;
      transform.current.y = e.touches[0].clientY - lastPan.current.y;
      requestAnimationFrame(applyTransform);
    }
  };

  const handleTouchEnd = () => {
    initialPinch.current.dist = 0;
    isPanning.current = false;
    
    // Snap back: Se o usuário tirar muito o zoom, volta ao normal com transição suave e zera posição
    if (transform.current.scale < 1.05) {
      transform.current = { scale: 1, x: 0, y: 0 };
      if (imgRef.current) {
        imgRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        applyTransform();
        setTimeout(() => { if (imgRef.current) imgRef.current.style.transition = 'none'; }, 300);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-2xl"
    >
      {/* Header Interativo */}
      <div className="flex items-center justify-between p-5 pt-safe z-10">
        <button onClick={onClose} className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md active:scale-90 transition-transform">
          <X size={22} />
        </button>
        <button onClick={() => onShare(item)} className="flex items-center gap-2 rounded-full bg-ice/20 px-5 py-3 text-sm font-bold text-ice active:scale-95 transition-transform backdrop-blur-md">
          <Share2 size={16} /> Compartilhar
        </button>
      </div>

      {/* Viewer Canvas */}
      <div className="flex-1 overflow-hidden flex items-center justify-center relative touch-none px-2">
        {item.file_type === "pdf" ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-24 w-24 rounded-[28px] bg-coral/10 text-coral flex items-center justify-center mb-6 shadow-2xl shadow-coral/5">
              <FileText size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 max-w-[280px] leading-tight">{item.title}</h3>
            <p className="text-sm text-white/50 mb-8">Documento PDF seguro</p>
            <button 
              onClick={() => window.open(item.url, "_blank")}
              className="flex items-center gap-2 bg-white text-black px-6 py-3.5 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
            >
              <ExternalLink size={18} /> Abrir Arquivo Completo
            </button>
          </div>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Visualiza sempre a URL ORIGINAL em alta definição, nunca a thumb */}
            <img 
              ref={imgRef}
              src={item.url} 
              alt={item.title} 
              className="max-h-full max-w-full object-contain origin-center select-none"
              draggable="false"
              style={{ willChange: 'transform' }} // Dica para o navegador usar a GPU
            />
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] z-10 pointer-events-none">
        <div className="flex items-center gap-3 mb-3">
          <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md">{item.category}</span>
          <span className="text-xs font-semibold text-white/50">{new Date(item.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
        {item.file_type !== "pdf" && <h2 className="text-2xl font-bold text-white leading-tight line-clamp-2">{item.title}</h2>}
      </div>
    </motion.div>
  );
}
