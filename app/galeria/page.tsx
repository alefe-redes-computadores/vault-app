// app/galeria/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FileWarning,
  HeartPulse,
  Images,
  Search,
  Share2,
  Shield,
  X,
} from "lucide-react";
import { useGaleria, type GalleryItem } from "@/hooks/useGaleria";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { UploadGaleriaModal } from "@/components/UploadGaleriaModal";
import { useActivePersonId } from "@/hooks/useActivePersonId";

// ============================================================
// HELPERS
// ============================================================

type GalleryTab = "saude" | "pessoal";

function parseGalleryDate(value: string): Date | null {
  if (!value) return null;

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly;

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function formatGalleryDate(
  value: string,
  options: Intl.DateTimeFormatOptions
): string {
  const parsed = parseGalleryDate(value);

  if (!parsed) {
    return "Data não informada";
  }

  return parsed.toLocaleDateString(
    "pt-BR",
    options
  );
}

function getSourceLabel(
  item: GalleryItem
): string {
  switch (item.source_table) {
    case "documents":
      return "Documento";

    case "anexos_clinicos":
      return "Anexo clínico";

    case "renovacoes":
      return "Renovação";

    default:
      return "Arquivo";
  }
}

function getGroupLabel(
  date: Date,
  today: Date
): string {
  const normalizedDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const normalizedToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const diffDays = Math.round(
    (
      normalizedToday.getTime() -
      normalizedDate.getTime()
    ) /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return "Hoje";
  }

  if (diffDays === 1) {
    return "Ontem";
  }

  if (
    diffDays >= 2 &&
    diffDays <= 7
  ) {
    return "Últimos 7 dias";
  }

  const mesAno =
    date.toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric",
      }
    );

  return (
    mesAno.charAt(0).toUpperCase() +
    mesAno.slice(1)
  );
}

// ============================================================
// CARD
// ============================================================

interface DocumentPreviewProps {
  item: GalleryItem;
  accentColor: string;
  onClick: (
    item: GalleryItem
  ) => void;
}

function DocumentPreview({
  item,
  accentColor,
  onClick,
}: DocumentPreviewProps) {
  const [
    imgStatus,
    setImgStatus,
  ] = useState<
    "loading" | "success" | "error"
  >("loading");

  const isDeadBlob =
    item.url.startsWith("blob:");

  const imageSource =
    item.thumbnail_url ||
    item.url;

  return (
    <motion.button
      type="button"
      whileTap={{
        scale: 0.975,
      }}
      onClick={() =>
        onClick(item)
      }
      className="group w-full overflow-hidden rounded-[22px] border bg-surface text-left shadow-sm transition-shadow active:shadow-none"
      style={{
        borderColor:
          `${accentColor}24`,
      }}
      aria-label={`Abrir ${item.title}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-raised">
        {item.file_type ===
        "pdf" ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-[20px]"
              style={{
                backgroundColor:
                  `${accentColor}16`,

                color:
                  accentColor,
              }}
            >
              <FileText
                size={28}
                strokeWidth={
                  1.6
                }
              />
            </div>

            <span className="mt-4 rounded-full border border-surface-border/50 bg-surface px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              PDF
            </span>
          </div>
        ) : isDeadBlob ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/10 text-coral">
              <FileWarning
                size={20}
              />
            </div>

            <p className="mt-3 text-[11px] font-semibold text-coral">
              Link local expirado
            </p>

            <p className="mt-1 text-[9px] leading-relaxed text-ink-muted">
              Reanexe o arquivo
              para recuperar a
              prévia.
            </p>
          </div>
        ) : (
          <>
            {imgStatus ===
              "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-ink-muted" />
              </div>
            )}

            {imgStatus ===
            "error" ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-ink-muted">
                  <FileWarning
                    size={
                      20
                    }
                  />
                </div>

                <p className="mt-3 text-[10px] font-medium text-ink-muted">
                  Prévia
                  indisponível
                </p>
              </div>
            ) : (
              <img
                src={
                  imageSource
                }
                alt={
                  item.title
                }
                loading="lazy"
                onLoad={() =>
                  setImgStatus(
                    "success"
                  )
                }
                onError={() =>
                  setImgStatus(
                    "error"
                  )
                }
                className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] ${
                  imgStatus ===
                  "success"
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              />
            )}
          </>
        )}

        <div className="pointer-events-none absolute left-2.5 top-2.5">
          <span className="rounded-full border border-black/10 bg-black/55 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            {getSourceLabel(
              item
            )}
          </span>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-3">
        <p className="line-clamp-2 min-h-[34px] text-[12px] font-semibold leading-[1.35] text-ink-primary">
          {item.title}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-surface-border/35 pt-2.5">
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            {formatGalleryDate(
              item.date,
              {
                day: "2-digit",
                month: "short",
              }
            )}
          </span>

          {item.subtitle && (
            <span className="max-w-[55%] truncate text-right text-[9px] text-ink-muted">
              {
                item.subtitle
              }
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================
// VISUALIZADOR
// ============================================================

interface DocumentViewerProps {
  item: GalleryItem;
  onClose: () => void;
  onShare: (
    item: GalleryItem
  ) => void;
}

function DocumentViewer({
  item,
  onClose,
  onShare,
}: DocumentViewerProps) {
  const imgRef =
    useRef<HTMLImageElement>(
      null
    );

  const transform =
    useRef({
      scale: 1,
      x: 0,
      y: 0,
    });

  const initialPinch =
    useRef({
      dist: 0,
      scale: 1,
    });

  const lastPan =
    useRef({
      x: 0,
      y: 0,
    });

  const isPanning =
    useRef(false);

  const applyTransform =
    () => {
      if (
        !imgRef.current
      ) {
        return;
      }

      imgRef.current.style.transform =
        `translate3d(${transform.current.x}px, ${transform.current.y}px, 0) scale(${transform.current.scale})`;
    };

  const resetTransform =
    () => {
      transform.current = {
        scale: 1,
        x: 0,
        y: 0,
      };

      if (
        !imgRef.current
      ) {
        return;
      }

      imgRef.current.style.transition =
        "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";

      applyTransform();

      window.setTimeout(
        () => {
          if (
            imgRef.current
          ) {
            imgRef.current.style.transition =
              "none";
          }
        },
        300
      );
    };

  const handleTouchStart =
    (
      event: React.TouchEvent
    ) => {
      if (
        event.touches
          .length === 2
      ) {
        isPanning.current =
          false;

        const dist =
          Math.hypot(
            event.touches[0]
              .clientX -
              event.touches[1]
                .clientX,

            event.touches[0]
              .clientY -
              event.touches[1]
                .clientY
          );

        initialPinch.current =
          {
            dist,
            scale:
              transform
                .current
                .scale,
          };

        return;
      }

      if (
        event.touches
          .length === 1 &&
        transform.current
          .scale > 1
      ) {
        isPanning.current =
          true;

        lastPan.current = {
          x:
            event.touches[0]
              .clientX -
            transform.current
              .x,

          y:
            event.touches[0]
              .clientY -
            transform.current
              .y,
        };
      }
    };

  const handleTouchMove =
    (
      event: React.TouchEvent
    ) => {
      if (
        event.touches
          .length === 2 &&
        initialPinch.current
          .dist > 0
      ) {
        const dist =
          Math.hypot(
            event.touches[0]
              .clientX -
              event.touches[1]
                .clientX,

            event.touches[0]
              .clientY -
              event.touches[1]
                .clientY
          );

        transform.current.scale =
          Math.min(
            Math.max(
              1,

              initialPinch
                .current
                .scale *
                (
                  dist /
                  initialPinch
                    .current
                    .dist
                )
            ),
            4
          );

        requestAnimationFrame(
          applyTransform
        );

        return;
      }

      if (
        event.touches
          .length === 1 &&
        isPanning.current
      ) {
        transform.current.x =
          event.touches[0]
            .clientX -
          lastPan.current.x;

        transform.current.y =
          event.touches[0]
            .clientY -
          lastPan.current.y;

        requestAnimationFrame(
          applyTransform
        );
      }
    };

  const handleTouchEnd =
    () => {
      initialPinch.current.dist =
        0;

      isPanning.current =
        false;

      if (
        transform.current
          .scale < 1.05
      ) {
        resetTransform();
      }
    };

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-[100] flex flex-col bg-black"
    >
      <header className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-safe">
        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-md transition-transform active:scale-95"
            aria-label="Fechar"
          >
            <X
              size={19}
            />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onShare(
                  item
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-md transition-transform active:scale-95"
              aria-label="Compartilhar"
            >
              <Share2
                size={
                  18
                }
              />
            </button>

            <button
              type="button"
              onClick={() => {
                window.open(
                  item.url,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-md transition-transform active:scale-95"
              aria-label="Abrir arquivo original"
            >
              <ExternalLink
                size={
                  18
                }
              />
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {item.file_type ===
        "pdf" ? (
          <div className="flex max-w-[280px] flex-col items-center px-6 text-center text-white">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/10">
              <FileText
                size={
                  34
                }
                strokeWidth={
                  1.5
                }
              />
            </div>

            <p className="mt-5 font-display text-lg font-semibold">
              Documento PDF
            </p>

            <p className="mt-2 text-xs leading-relaxed text-white/55">
              Abra o arquivo
              original para
              visualizar todas
              as páginas.
            </p>

            <button
              type="button"
              onClick={() => {
                window.open(
                  item.url,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="mt-5 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold"
            >
              <ExternalLink
                size={
                  15
                }
              />

              Abrir PDF
            </button>
          </div>
        ) : item.url.startsWith(
            "blob:"
          ) ? (
          <div className="flex max-w-[280px] flex-col items-center px-6 text-center text-white">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-coral/20 bg-coral/10 text-coral">
              <FileWarning
                size={
                  32
                }
              />
            </div>

            <p className="mt-5 font-display text-lg font-semibold">
              Arquivo local
              expirado
            </p>

            <p className="mt-2 text-xs leading-relaxed text-white/55">
              Este endereço
              temporário não
              sobreviveu ao
              fechamento do
              aplicativo.
            </p>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={
              item.url
            }
            alt={
              item.title
            }
            draggable={
              false
            }
            onDoubleClick={() => {
              if (
                transform
                  .current
                  .scale > 1
              ) {
                resetTransform();
              } else {
                transform.current =
                  {
                    scale: 2,
                    x: 0,
                    y: 0,
                  };

                applyTransform();
              }
            }}
            onTouchStart={
              handleTouchStart
            }
            onTouchMove={
              handleTouchMove
            }
            onTouchEnd={
              handleTouchEnd
            }
            className="max-h-full max-w-full select-none object-contain will-change-transform"
            style={{
              touchAction:
                "none",
            }}
          />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-14 text-white">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/70 backdrop-blur-md">
              {getSourceLabel(
                item
              )}
            </span>

            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
              {formatGalleryDate(
                item.date,
                {
                  day: "2-digit",
                  month:
                    "short",
                  year: "numeric",
                }
              )}
            </span>
          </div>

          <h2 className="font-display text-[18px] font-semibold leading-tight">
            {
              item.title
            }
          </h2>

          {item.subtitle && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
              {
                item.subtitle
              }
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SKELETON
// ============================================================

function GallerySkeleton() {
  return (
    <div className="px-5 pt-6">
      <div className="mb-4 h-3 w-24 animate-pulse rounded-full bg-surface-raised" />

      <div className="grid grid-cols-2 gap-3">
        {Array.from({
          length: 6,
        }).map(
          (_, index) => (
            <div
              key={
                index
              }
              className="overflow-hidden rounded-[22px] border border-surface-border/40 bg-surface"
            >
              <div className="aspect-[4/5] animate-pulse bg-surface-raised" />

              <div className="space-y-2 p-3.5">
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-surface-raised" />

                <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-surface-raised" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

interface GalleryEmptyStateProps {
  activeTab: GalleryTab;
  isSearching: boolean;
  onClearSearch: () => void;
}

function GalleryEmptyState({
  activeTab,
  isSearching,
  onClearSearch,
}: GalleryEmptyStateProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="mx-auto mt-16 flex max-w-[300px] flex-col items-center px-6 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface-raised">
        {isSearching ? (
          <Search
            size={
              30
            }
            className="text-ink-muted/50"
          />
        ) : activeTab ===
          "saude" ? (
          <HeartPulse
            size={
              30
            }
            className="text-emerald-400/60"
          />
        ) : (
          <Shield
            size={
              30
            }
            className="text-ice/60"
          />
        )}
      </div>

      <p className="mt-5 font-display text-[18px] font-semibold text-ink-primary">
        {isSearching
          ? "Nenhum resultado"
          : activeTab ===
              "saude"
            ? "Nenhum arquivo de saúde"
            : "Nenhum arquivo pessoal"}
      </p>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
        {isSearching
          ? "Tente outro nome, tipo ou data."
          : activeTab ===
              "saude"
            ? "Receitas, exames, anexos e outros arquivos clínicos aparecem aqui automaticamente."
            : "Documentos pessoais com arquivos anexados aparecem aqui automaticamente."}
      </p>

      {isSearching && (
        <button
          type="button"
          onClick={
            onClearSearch
          }
          className="mt-5 rounded-full border border-surface-border/50 bg-surface px-4 py-2 text-[11px] font-semibold text-ink-primary transition-transform active:scale-95"
        >
          Limpar busca
        </button>
      )}
    </motion.div>
  );
}

// ============================================================
// CONTEÚDO
// ============================================================

function GaleriaContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const {
    items:
      allItems,
    isLoading,
  } =
    useGaleria();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<GalleryTab>(
      "saude"
    );

  const [
    viewingItem,
    setViewingItem,
  ] =
    useState<
      GalleryItem | null
    >(null);

  const [
    isUploadOpen,
    setIsUploadOpen,
  ] =
    useState(false);

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] =
    useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  useEffect(() => {
    const tab =
      searchParams.get(
        "tab"
      );

    if (
      tab === "pessoal"
    ) {
      setActiveTab(
        "pessoal"
      );
    } else if (
      tab === "saude"
    ) {
      setActiveTab(
        "saude"
      );
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const filteredItems =
    useMemo(() => {
      if (
        !activePersonId
      ) {
        return [];
      }

      const normalizedSearch =
        searchTerm
          .trim()
          .toLocaleLowerCase(
            "pt-BR"
          );

      return allItems.filter(
        (item) => {
          if (
            item.person_id !==
            activePersonId
          ) {
            return false;
          }

          if (
            item.url.startsWith(
              "blob:"
            )
          ) {
            return false;
          }

          const matchesTab =
            activeTab ===
            "saude"
              ? item.category ===
                "saude"
              : item.category ===
                "pessoal";

          if (
            !matchesTab
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const formattedDate =
            formatGalleryDate(
              item.date,
              {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }
            );

          const haystack =
            [
              item.title,
              item.subtitle,
              getSourceLabel(
                item
              ),
              formattedDate,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLocaleLowerCase(
                "pt-BR"
              );

          return haystack.includes(
            normalizedSearch
          );
        }
      );
    }, [
      allItems,
      activePersonId,
      activeTab,
      searchTerm,
    ]);

  const groupedItems =
    useMemo(() => {
      const today =
        new Date();

      const groups =
        new Map<
          string,
          {
            dateKey: number;
            items: GalleryItem[];
          }
        >();

      filteredItems.forEach(
        (item) => {
          const parsed =
            parseGalleryDate(
              item.date
            );

          if (
            !parsed
          ) {
            return;
          }

          const label =
            getGroupLabel(
              parsed,
              today
            );

          const dateKey =
            label ===
            "Hoje"
              ? Number.MAX_SAFE_INTEGER
              : label ===
                  "Ontem"
                ? Number.MAX_SAFE_INTEGER -
                  1
                : label ===
                    "Últimos 7 dias"
                  ? Number.MAX_SAFE_INTEGER -
                    2
                  : new Date(
                      parsed.getFullYear(),
                      parsed.getMonth(),
                      1
                    ).getTime();

          const existing =
            groups.get(
              label
            );

          if (
            existing
          ) {
            existing.items.push(
              item
            );

            existing.dateKey =
              Math.max(
                existing.dateKey,
                dateKey
              );
          } else {
            groups.set(
              label,
              {
                dateKey,
                items: [
                  item,
                ],
              }
            );
          }
        }
      );

      return Array.from(
        groups.entries()
      )
        .map(
          ([
            label,
            value,
          ]) => ({
            label,
            dateKey:
              value.dateKey,
            items:
              value.items,
          })
        )
        .sort(
          (a, b) =>
            b.dateKey -
            a.dateKey
        );
    }, [filteredItems]);

  const accentColor =
    activeTab === "saude"
      ? "#34D399"
      : "#38BDF8";

  const handleShare =
    async (
      item: GalleryItem
    ) => {
      trigger(
        "vibrate"
      );

      try {
        if (
          navigator.share
        ) {
          await navigator.share(
            {
              title:
                item.title,

              text:
                item.subtitle,

              url:
                item.url,
            }
          );

          return;
        }

        window.open(
          item.url,
          "_blank",
          "noopener,noreferrer"
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "[Galeria] Erro ao compartilhar:",
          error
        );
      }
    };

  const totalInTab =
    useMemo(() => {
      if (
        !activePersonId
      ) {
        return 0;
      }

      return allItems.filter(
        (item) =>
          item.person_id ===
            activePersonId &&
          !item.url.startsWith(
            "blob:"
          ) &&
          (
            activeTab ===
            "saude"
              ? item.category ===
                "saude"
              : item.category ===
                "pessoal"
          )
      ).length;
    }, [
      allItems,
      activePersonId,
      activeTab,
    ]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-void pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 pt-safe backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={
                  17
                }
              />
            </button>

            <div className="min-w-0">
              <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink-primary">
                Galeria
              </h1>

              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                {totalInTab}{" "}
                {totalInTab ===
                1
                  ? "arquivo"
                  : "arquivos"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all active:scale-95 ${
              isSearchOpen
                ? "border-ice/30 bg-ice/10 text-ice"
                : "border-surface-border/50 bg-surface-raised text-ink-primary"
            }`}
            aria-label={
              isSearchOpen
                ? "Fechar busca"
                : "Buscar"
            }
            onClick={() => {
              trigger(
                "vibrate"
              );

              setIsSearchOpen(
                (
                  current
                ) =>
                  !current
              );

              if (
                isSearchOpen
              ) {
                setSearchTerm(
                  ""
                );
              }
            }}
          >
            {isSearchOpen ? (
              <X
                size={
                  17
                }
              />
            ) : (
              <Search
                size={
                  17
                }
              />
            )}
          </button>
        </div>

        <AnimatePresence
          initial={
            false
          }
        >
          {isSearchOpen && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration:
                  0.18,
              }}
              className="overflow-hidden px-5"
            >
              <div className="relative pb-3">
                <Search
                  size={
                    15
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-ink-faint"
                />

                <input
                  autoFocus
                  type="search"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Buscar por nome, tipo ou data"
                  className="h-11 w-full rounded-2xl border border-surface-border/50 bg-surface pl-10 pr-10 text-[12px] text-ink-primary outline-none placeholder:text-ink-faint focus:border-ice/40"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm(
                        ""
                      )
                    }
                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-[calc(50%+6px)] items-center justify-center rounded-full bg-surface-raised text-ink-muted"
                    aria-label="Limpar busca"
                  >
                    <X
                      size={
                        12
                      }
                    />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 px-5">
          <button
            type="button"
            onClick={() => {
              trigger(
                "vibrate"
              );

              setActiveTab(
                "saude"
              );
            }}
            className={`relative flex items-center justify-center gap-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              activeTab ===
              "saude"
                ? "text-ink-primary"
                : "text-ink-muted"
            }`}
          >
            <HeartPulse
              size={
                15
              }
              style={
                activeTab ===
                "saude"
                  ? {
                      color:
                        accentColor,
                    }
                  : undefined
              }
              className={
                activeTab ===
                "saude"
                  ? ""
                  : "opacity-60"
              }
            />

            Saúde

            {activeTab ===
              "saude" && (
              <motion.div
                layoutId="gallery-tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                style={{
                  backgroundColor:
                    accentColor,
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              trigger(
                "vibrate"
              );

              setActiveTab(
                "pessoal"
              );
            }}
            className={`relative flex items-center justify-center gap-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              activeTab ===
              "pessoal"
                ? "text-ink-primary"
                : "text-ink-muted"
            }`}
          >
            <Shield
              size={
                15
              }
              style={
                activeTab ===
                "pessoal"
                  ? {
                      color:
                        accentColor,
                    }
                  : undefined
              }
              className={
                activeTab ===
                "pessoal"
                  ? ""
                  : "opacity-60"
              }
            />

            Pessoal

            {activeTab ===
              "pessoal" && (
              <motion.div
                layoutId="gallery-tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                style={{
                  backgroundColor:
                    accentColor,
                }}
              />
            )}
          </button>
        </div>
      </header>

      {!activePersonId ? (
        <div className="mx-auto mt-16 flex max-w-[300px] flex-col items-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface-raised">
            <Shield
              size={
                30
              }
              className="text-ink-muted/50"
            />
          </div>

          <p className="mt-5 font-display text-[18px] font-semibold text-ink-primary">
            Selecione uma
            pessoa
          </p>

          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            A galeria é sempre
            vinculada à pessoa
            ativa do Vault.
          </p>
        </div>
      ) : isLoading ? (
        <GallerySkeleton />
      ) : groupedItems.length ===
        0 ? (
        <GalleryEmptyState
          activeTab={
            activeTab
          }
          isSearching={Boolean(
            searchTerm.trim()
          )}
          onClearSearch={() =>
            setSearchTerm(
              ""
            )
          }
        />
      ) : (
        <section className="px-5 pt-6">
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration:
                0.25,
            }}
          >
            {groupedItems.map(
              (
                group
              ) => (
                <section
                  key={
                    group.label
                  }
                  className="mb-8"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
                    <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                      {
                        group.label
                      }
                    </h2>

                    <span className="text-[9px] text-ink-faint">
                      {
                        group
                          .items
                          .length
                      }{" "}
                      {group
                        .items
                        .length ===
                      1
                        ? "item"
                        : "itens"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {group.items.map(
                      (
                        item
                      ) => (
                        <DocumentPreview
                          key={
                            item.id
                          }
                          item={
                            item
                          }
                          accentColor={
                            accentColor
                          }
                          onClick={(
                            clickedItem
                          ) => {
                            trigger(
                              "vibrate"
                            );

                            setViewingItem(
                              clickedItem
                            );
                          }}
                        />
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </motion.div>
        </section>
      )}

      <UploadGaleriaModal
        isOpen={
          isUploadOpen
        }
        onClose={() =>
          setIsUploadOpen(
            false
          )
        }
      />

      <AnimatePresence>
        {viewingItem && (
          <DocumentViewer
            item={
              viewingItem
            }
            onClose={() =>
              setViewingItem(
                null
              )
            }
            onShare={
              handleShare
            }
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function GaleriaPage() {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <GallerySkeleton />
        }
      >
        <GaleriaContent />
      </Suspense>
    </PageTransition>
  );
}