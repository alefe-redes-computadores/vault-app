"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Maximize2, Minus, Plus } from "lucide-react";

type Props = {
  url: string;
  fileType?: "image" | "pdf";
};

export function PrescriptionAttachmentViewerM143({
  url,
  fileType,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const pinch = useRef<{distance:number;zoom:number}|null>(null);
  const pan = useRef<{
    x:number;y:number;left:number;top:number
  }|null>(null);

  useEffect(() => {
    setZoom(1);
    setFailed(false);
    pinch.current = null;
    pan.current = null;
  }, [url]);

  const adjust = (value:number) => {
    setZoom(Math.min(4, Math.max(1, Math.round(value*10)/10)));
  };

  if (fileType !== "image") {
    return (
      <section className="space-y-2" aria-label="Visualizador PDF da receita">
        <div className="h-[min(60dvh,560px)] overflow-hidden rounded-2xl border border-surface-border bg-black/20">
          <iframe
            src={url}
            title="Documento PDF da receita"
            className="h-full w-full"
          />
        </div>
        <p className="text-[11px] text-ink-muted">
          Se o PDF não abrir no visualizador do aparelho,
          utilize Abrir externamente.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2.5" aria-label="Visualizador da imagem da receita">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
          <FileText size={15}/> Receita anexada
        </span>
        <span role="status" className="text-xs tabular-nums text-ink-muted">
          {Math.round(zoom*100)}%
        </span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Zoom da receita">
        <button type="button" disabled={zoom<=1}
          onClick={()=>adjust(zoom-.5)}
          className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs text-ink-primary disabled:opacity-40">
          <Minus size={15}/> Reduzir
        </button>
        <button type="button" disabled={zoom>=4}
          onClick={()=>adjust(zoom+.5)}
          className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs text-ink-primary disabled:opacity-40">
          <Plus size={15}/> Ampliar
        </button>
        <button type="button" onClick={()=>adjust(1)}
          className="flex min-h-11 items-center gap-1 rounded-xl border border-emerald-300/25 bg-emerald-300/[.07] px-3 text-xs font-semibold text-emerald-200">
          <Maximize2 size={15}/> Ajustar à tela
        </button>
      </div>

      <div ref={viewport}
        className="h-[min(60dvh,560px)] w-full overflow-auto overscroll-contain rounded-2xl border border-surface-border bg-black/25"
        style={{touchAction:"none"}}
        onTouchStart={event=>{
          if(event.touches.length===2){
            const a=event.touches[0],b=event.touches[1];
            pinch.current={
              distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),
              zoom
            };
            pan.current=null;
          }else if(event.touches.length===1 && zoom>1 && viewport.current){
            const a=event.touches[0];
            pan.current={
              x:a.clientX,y:a.clientY,
              left:viewport.current.scrollLeft,
              top:viewport.current.scrollTop
            };
          }
        }}
        onTouchMove={event=>{
          if(event.touches.length===2 && pinch.current){
            const a=event.touches[0],b=event.touches[1];
            const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
            if(pinch.current.distance>0)
              adjust(pinch.current.zoom*distance/pinch.current.distance);
          }else if(event.touches.length===1 && pan.current && viewport.current){
            const a=event.touches[0];
            viewport.current.scrollLeft=pan.current.left+pan.current.x-a.clientX;
            viewport.current.scrollTop=pan.current.top+pan.current.y-a.clientY;
          }
        }}
        onTouchEnd={()=>{pinch.current=null;pan.current=null;}}
        onTouchCancel={()=>{pinch.current=null;pan.current=null;}}
      >
        {failed ? (
          <div role="alert" className="flex h-full items-center justify-center p-4 text-center text-xs text-amber-200">
            Imagem indisponível neste visualizador. Use Abrir externamente.
          </div>
        ) : (
          <div className={zoom===1
            ? "flex h-full w-full items-center justify-center"
            : "min-h-full min-w-full"}>
            <img src={url}
              alt="Imagem completa da receita"
              draggable={false}
              onError={()=>setFailed(true)}
              className="mx-auto block select-none object-contain"
              style={zoom===1
                ? {maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto"}
                : {width:`${Math.round(zoom*100)}%`,maxWidth:"none",height:"auto"}}/>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-muted">
        A imagem começa ajustada à tela. Amplie ou use dois dedos
        para conferir detalhes. O anexo original não é modificado.
      </p>
    </section>
  );
}
