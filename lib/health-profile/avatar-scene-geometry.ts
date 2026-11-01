// VAULT M4 — fábricas de geometria Three.js extraídas sem mudar vértices.
// Criação feita apenas no ciclo de montagem da cena; não existe loop extra.
import * as THREE from "three";

export const avatarSoftBoxGeometry=(width:number,height:number,depth:number,radius=.02)=>{
      const shape=new THREE.Shape(),w=width/2,h=height/2,r=Math.min(radius,w/2,h/2);
      shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
      const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:3});geometry.translate(0,0,-depth/2);return geometry;
    };
export const avatarSafeTaperedBoxGeometry=(backWidth:number,frontWidth:number,height:number,depth:number)=>{
      // V230: Android WebGL ainda pode projetar vértices alterados manualmente
      // como faixas atravessando o rosto. A peça usa só BoxGeometry nativa;
      // não há BufferAttribute reescrito nem custo adicional por quadro.
      return new THREE.BoxGeometry(Math.max(backWidth,frontWidth),height,depth);
    };

/** Sombra estática original, 128x128. Quem monta a cena conserva o dispose. */
export function createAvatarGroundShadowTexture(): THREE.CanvasTexture {
    const shadowCanvas=document.createElement("canvas");shadowCanvas.width=128;shadowCanvas.height=128;
    const shadowContext=shadowCanvas.getContext("2d");
    if(shadowContext){const gradient=shadowContext.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,"rgba(0,0,0,.37)");gradient.addColorStop(1,"rgba(0,0,0,0)");shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);}
    return new THREE.CanvasTexture(shadowCanvas);
}
