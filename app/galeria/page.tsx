// app/galeria/page.tsx
"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Images,
  HeartPulse,
  Shield,
  Search,
  ZoomIn,
  ZoomOut,
  Share,
  X,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";
import { useActivePersonId } from "@/hooks/useActivePersonId";

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

function GalleryEmptyState({
  activeTab,
}: {
  activeTab: "saude" | "pessoal";
}) {
  const title =
    activeTab === "saude"
      ? "Nenhum documento de saúde"
      : "Nenhum documento pessoal";
  const subtitle =
    activeTab === "saude"
      ? "Receitas, exames e laudos médicos aparecerão aqui."
      : "RG, CNH, passaporte e certificados podem ser armazenados aqui.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 flex flex-col items-center justify-center text-center px-6"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-surface-raised border border-surface-border/50 shadow-sm mb-5">
        <Images size={32} className="text-ink-muted/50" />
      </div>
      <p className="font-display text-[19px] font-bold text-ink-primary leading-tight">
        {title}
      </p>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-[260px]">
        {subtitle}
      </p>
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
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (searchParams.get("upload") === "true") setIsUploadOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (viewingItem || isUploadOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [viewingItem, isUploadOpen]);

  const { items: allItems, isLoading } = useGaleria();

  const filteredItems = useMemo(() => {
    if (!allItems) return [];

    return allItems.filter((item: any) => {
      if (activePersonId && item.person_id !== activePersonId) {
        return false;
      }

      const category = item.category || item.category_id;

      if (activeTab === "saude") {
        return category === "saude";
      } else {
        return category !== "saude";
      }
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
        const mesAno = d.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        label = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    const orderedGroups: Record<string, GalleryItem[]> = {};
    const prioKeys = ["Hoje", "Ontem", "Últimos 7 dias"];

    prioKeys.forEach((key) => {
      if (groups[key]) orderedGroups[key] = groups[key];
    });

    const otherKeys = Object.keys(groups)
      .filter((key) => !prioKeys.includes(key))
      .sort((a, b) => {
        const getDateFromLabel = (label: string) => {
          const parts = label.split(" de ");
          if (parts.length === 2) {
            const months: Record<string, number> = {
              janeiro: 0,
              fevereiro: 1,
              março: 2,
              abril: 3,
              maio: 4,
              junho: 5,
              julho: 6,
              agosto: 7,
              setembro: 8,
              outubro: 9,
              novembro: 10,
              dezembro: 11,
            };
            const month = months[parts[0].toLowerCase()];
            const year = parseInt(parts[1]);
            if (!isNaN(month) && !isNaN(year)) {
              return new Date(year, month, 1);
            }
          }
          return new Date(0);
        };

        const dateA = getDateFromLabel(a);
        const dateB = getDateFromLabel(b);
        return dateB.getTime() - dateA.getTime();
      });

    otherKeys.forEach((key) => {
      orderedGroups[key] = groups[key];
    });

    return orderedGroups;
  }, [filteredItems]);

  const accentColor = activeTab === "saude" ? "#34D399" : "#38BDF8";

  const handleShare = async (item: GalleryItem) => {
    trigger("vibrate");
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          url: item.url,
        });
      } else {
        window.open(item.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  const handleZoomIn = () => {
    trigger("vibrate");
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    trigger("vibrate");
    setZoomLevel((prev) => Math.max(prev - 0.5, 0.5));
  };

  const resetZoom = () => {
    trigger("vibrate");
    setZoomLevel(1);
  };

  return (
    <main className="min-h-screen bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-void/85 pt-safe backdrop-blur-xl transition-colors duration-300 border-b border-surface-border/30">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary transition-transform active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="font-display text-[24px] font-bold text-ink-primary tracking-tight">
              Galeria
            </h1>
          </div>
          <button
            className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-primary transition-transform active:scale-95"
            aria-label="Buscar"
            onClick={() => {
              trigger("vibrate");
            }}
          >
            <Search size={18} />
          </button>
        </div>

        <div className="flex">
          <button
            onClick={() => {
              trigger("vibrate");
              setActiveTab("saude");
            }}
            className={`relative flex-1 py-4 text-[13px] uppercase tracking-widest font-bold transition-colors duration-300 ${
              activeTab === "saude" ? "text-ink-primary" : "text-ink-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <HeartPulse
                size={16}
                className={activeTab === "saude" ? "" : "opacity-60"}
                style={activeTab === "saude" ? { color: accentColor } : {}}
              />{" "}
              Saúde
            </div>
            {activeTab === "saude" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </button>
          <button
            onClick={() => {
              trigger("vibrate");
              setActiveTab("pessoal");
            }}
            className={`relative flex-1 py-4 text-[13px] uppercase tracking-widest font-bold transition-colors duration-300 ${
              activeTab === "pessoal" ? "text-ink-primary" : "text-ink-muted"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield
                size={16}
                className={activeTab === "pessoal" ? "" : "opacity-60"}
                style={activeTab === "pessoal" ? { color: accentColor } : {}}
              />{" "}
              Pessoal
            </div>
            {activeTab === "pessoal" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-md"
                style={{ backgroundColor: accentColor }}
              />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Object.entries(groupedItems).map(([label, groupItems]) => (
              <div key={label} className="mb-10">
                <h2 className="mb-4 pl-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                  {label}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {groupItems.map((item) => {
                    const typedItem = item as GalleryItem & { type?: string };
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          trigger("vibrate");
                          setViewingItem(item);
                          setZoomLevel(1);
                        }}
                        className="group relative aspect-square overflow-hidden rounded-[20px] border border-surface-border/50 bg-surface shadow-sm transition-all hover:border-ice/30"
                      >
                        {item.url && typedItem.type === "image" ? (
                          <img
                            src={item.url}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-surface-raised">
                            <FileText size={28} className="text-ink-muted" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-left backdrop-blur-sm">
                          <p className="truncate text-[10px] font-medium text-white">
                            {item.title || "Sem título"}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </section>
      )}

      <UploadGaleriaModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      <AnimatePresence>
        {viewingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => {
              setViewingItem(null);
              resetZoom();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-h-[90vh] w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute right-0 top-0 z-10 flex gap-2 p-2">
                <button
                  onClick={() => handleShare(viewingItem)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md active:scale-95"
                >
                  <Share size={18} />
                </button>
                <button
                  onClick={() => {
                    setViewingItem(null);
                    resetZoom();
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex justify-center overflow-hidden rounded-2xl bg-black/20">
                <img
                  src={viewingItem.url}
                  alt={viewingItem.title}
                  className="max-h-[75vh] w-full object-contain transition-transform duration-300"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  onClick={handleZoomOut}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md active:scale-95"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={resetZoom}
                  className="text-xs font-bold text-white opacity-70"
                >
                  Reset
                </button>
                <button
                  onClick={handleZoomIn}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md active:scale-95"
                >
                  <ZoomIn size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
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
