// app/galeria/page.tsx
"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Images,
  HeartPulse,
  Shield,
  Search,
  ArrowLeft,
  X,
  Share2,
  FileText,
  ExternalLink,
  FileWarning,
} from "lucide-react";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";
import { useActivePersonId } from "@/hooks/useActivePersonId";

// ============================================================
// 1. COMPONENTE DE PREVIEW DO CARD (Otimizado com Miniaturas)
// ============================================================
interface DocumentPreviewProps {
  item: GalleryItem;
  accentColor: string;
  onClick: (item: GalleryItem) => void;
}

function DocumentPreview({ item, accentColor, onClick }: DocumentPreviewProps) {
  const [imgStatus, setImgStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const imageSource = item.thumbnail_url || item.url;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(item)}
      className="group relative aspect-square w-full overflow-hidden rounded-[20px] border bg-surface transition-all shadow-sm"
      style={{ borderColor: `${accentColor}30` }}
    >
      {item.file_type === "pdf" ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-void/30 p-4 transition-colors group-hover:bg-void/50">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[18px] shadow-inner" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
            <FileText size={26} strokeWidth={1.5} />
          </div>
          <span className="rounded-lg bg-surface-border/50 px-2.5 py-1 text-[10px] font-bold text-ink-primary uppercase tracking-widest">PDF</span>
        </div>
      ) : (
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
      
      {/* Informações Organizadas no Rodapé do Card */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-10 text-left">
        <p className="truncate text-[13px] font-bold text-white/95 leading-tight">{item.title}</p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="text-[10px] font-semibold text-white/70 uppercase">
            {item.date ? new Date(item.date).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : ""}
          </span>
          {item.subtitle && (
            <span className="text-[10px] font-medium text-white/50 truncate max-w-[60%] text-right">
              {item.subtitle}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================
// 2. COMPONENTE VISUALIZADOR TELA CHEIA (Com Zoom via GPU)
// ============================================================
interface DocumentViewerProps {
  item: GalleryItem;
  onClose: () => void;
  onShare: (item: GalleryItem) => void;
}

function DocumentViewer({ item, onClose, onShare }: DocumentViewerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  
  const transform = useRef({ scale: 1, x: 0, y: 0 });
  const initialPinch = useRef({ dist: 0, scale: 1 });
  const lastPan = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);

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
      const newScale = Math.min(Math.max(1, initialPinch.current.scale * (dist / initialPinch.current.dist)), 4);
      transform.current.scale = newScale;
      requestAnimationFrame(applyTransform);
    } else if (e.touches.length === 1 && isPanning.current) {
      transform.current.x = e.touches[0].clientX - lastPan.current.x;
      transform.current.y = e.touches[0].clientY - lastPan.current.y;
      requestAnimationFrame(applyTransform);
    }
  };

  const handleTouchEnd = () => {
    initialPinch.current.dist = 0;
    isPanning.current = false;
    
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
      <div className="flex items-center justify-between p-5 pt-safe z-10">
        <button onClick={onClose} className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md active:scale-90 transition-transform" aria-label="Fechar">
          <X size={22} />
        </button>
        <button onClick={() => onShare(item)} className="flex items-center gap-2 rounded-full bg-ice/20 px-5 py-3 text-sm font-bold text-ice active:scale-95 transition-transform backdrop-blur-md">
          <Share2 size={16} /> Compartilhar
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex items-center justify-center relative touch-none px-2">
        {item.file_type === "pdf" ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-24 w-24 rounded-[28px] bg-coral/10 text-coral flex items-center justify-center mb-6 shadow-2xl">
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
            <img 
              ref={imgRef}
              src={item.url} 
              alt={item.title} 
              className="max-h-full max-w-full object-contain origin-center select-none"
              draggable="false"
              style={{ willChange: 'transform' }}
            />
          </div>
        )}
      </div>

      <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] z-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-widest">{item.category}</span>
          <span className="text-xs font-semibold text-white/60">{new Date(item.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
        {item.file_type !== "pdf" && <h2 className="text-xl font-bold text-white leading-tight line-clamp-2">{item.title}</h2>}
      </div>
    </motion.div>
  );
}

// ============================================================
// 3. ESTRUTURA PRINCIPAL DA GALERIA
// ============================================================
function GallerySkeleton() {
  return (
    <div className="animate-pulse space-y-8 px-5 pt-8">
      <div className="mb-4 h-4 w-28 rounded-md bg-surface-border/40"></div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square rounded-[20px] bg-surface-border/20"></div>
        ))}
      </div>
    </div>
  );
}

function GalleryEmptyState({ activeTab }: { activeTab: "saude" | "pessoal" }) {
  const title = activeTab === "saude" ? "Nenhum documento de saúde" : "Nenhum documento pessoal";
  const subtitle = activeTab === "saude" ? "Receitas, exames e laudos médicos aparecerão aqui." : "RG, CNH, passaporte e certificados podem ser armazenados aqui.";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-16 flex flex-col items-center justify-center text-center px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-surface-raised border border-surface-border/50 shadow-sm mb-5">
        <Images size={32} className="text-ink-muted/50" />
      </div>
      <p className="font-display text-[19px] font-bold text-ink-primary leading-tight">{title}</p>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-[260px]">{subtitle}</p>
    </motion.div>
  );
}

function GaleriaContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activePersonId } = useActivePersonId();

  const [activeTab, setActiveTab] = useState<"saude" | "pessoal">("saude");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (searchParams.get("upload") === "true") setIsUploadOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (viewingItem || isUploadOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [viewingItem, isUploadOpen]);

  const { items: allItems, isLoading } = useGaleria();

  const filteredItems = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter((item: any) => {
      const pertenceAoPerfil = !activePersonId || !item.person_id || item.person_id === activePersonId;
      if (!pertenceAoPerfil) return false;
      const category = item.category || item.category_id;
      if (activeTab === "saude") return category === "saude";
      return category !== "saude";
    });
  }, [allItems, activePersonId, activeTab]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, GalleryItem[]> = {};
    const hojeBase = new Date();
    hojeBase.setHours(0, 0, 0, 0);

    filteredItems.forEach((item) => {
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;

      const docDate = new Date(d);
      docDate.setHours(0, 0, 0, 0);

      const diffTime = hojeBase.getTime() - docDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let label = "";
      if (diffDays === 0) label = "Hoje";
      else if (diffDays === 1) label = "Ontem";
      else if (diffDays > 1 && diffDays <= 7) label = "Últimos 7 dias";
      else {
        const mesAno = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        label = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    const orderedGroups: Record<string, GalleryItem[]> = {};
    const prioKeys = ["Hoje", "Ontem", "Últimos 7 dias"];
    prioKeys.forEach((key) => { if (groups[key]) orderedGroups[key] = groups[key]; });

    const otherKeys = Object.keys(groups)
      .filter((key) => !prioKeys.includes(key))
      .sort((a, b) => {
        const getDateFromLabel = (label: string) => {
          const parts = label.split(" de ");
          if (parts.length === 2) {
            const months: Record<string, number> = {
              janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
              julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
            };
            const month = months[parts[0].toLowerCase()];
            const year = parseInt(parts[1]);
            if (!isNaN(month) && !isNaN(year)) return new Date(year, month, 1);
          }
          return new Date(0);
        };
        return getDateFromLabel(b).getTime() - getDateFromLabel(a).getTime();
      });

    otherKeys.forEach((key) => { orderedGroups[key] = groups[key]; });
    return orderedGroups;
  }, [filteredItems]);

  const accentColor = activeTab === "saude" ? "#34D399" : "#38BDF8";

  const handleShare = async (item: GalleryItem) => {
    trigger("vibrate");
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: item.url });
      } else {
        window.open(item.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  return (
    <main className="min-h-screen bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-void/85 pt-safe backdrop-blur-xl border-b border-surface-border/30">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary transition-transform active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="font-display text-[24px] font-bold text-ink-primary tracking-tight">Galeria</h1>
          </div>
          <button
            className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary transition-transform active:scale-95"
            aria-label="Buscar"
            onClick={() => trigger("vibrate")}
          >
            <Search size={18} />
          </button>
        </div>

        <div className="flex">
          <button
            onClick={() => { trigger("vibrate"); setActiveTab("saude"); }}
            className={`relative flex-1 py-4 text-[13px] uppercase tracking-widest font-bold transition-colors duration-300 ${activeTab === "saude" ? "text-ink-primary" : "text-ink-muted"}`}
          >
            <div className="flex items-center justify-center gap-2">
              <HeartPulse size={16} className={activeTab === "saude" ? "" : "opacity-60"} style={activeTab === "saude" ? { color: accentColor } : {}} /> Saúde
            </div>
            {activeTab === "saude" && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md" style={{ backgroundColor: accentColor }} />
            )}
          </button>
          <button
            onClick={() => { trigger("vibrate"); setActiveTab("pessoal"); }}
            className={`relative flex-1 py-4 text-[13px] uppercase tracking-widest font-bold transition-colors duration-300 ${activeTab === "pessoal" ? "text-ink-primary" : "text-ink-muted"}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield size={16} className={activeTab === "pessoal" ? "" : "opacity-60"} style={activeTab === "pessoal" ? { color: accentColor } : {}} /> Pessoal
            </div>
            {activeTab === "pessoal" && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md" style={{ backgroundColor: accentColor }} />
            )}
          </button>
        </div>
      </header>

      {isLoading ? (
        <GallerySkeleton />
      ) : Object.keys(groupedItems).length === 0 ? (
        <GalleryEmptyState activeTab={activeTab} />
      ) : (
        <section className="px-5 pt-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {Object.entries(groupedItems).map(([label, groupItems]) => (
              <div key={label} className="mb-10">
                <h2 className="mb-4 pl-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">{label}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {groupItems.map((item) => (
                    <DocumentPreview
                      key={item.id}
                      item={item}
                      accentColor={accentColor}
                      onClick={(clickedItem) => {
                        trigger("vibrate");
                        setViewingItem(clickedItem);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </section>
      )}

      <UploadGaleriaModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      <AnimatePresence>
        {viewingItem && (
          <DocumentViewer
            item={viewingItem}
            onClose={() => setViewingItem(null)}
            onShare={handleShare}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function GaleriaPage() {
  return (
    <PageTransition>
      <Suspense fallback={<GallerySkeleton />}>
        <GaleriaContent />
      </Suspense>
    </PageTransition>
  );
}
