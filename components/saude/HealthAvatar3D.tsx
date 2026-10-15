"use client";
import { useEffect, useId, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarColor, avatarLayout, avatarTapEligible } from "@/lib/health-profile/avatar";
import { avatarRenderRatio, avatarZoom } from "@/lib/health-profile/avatar-preference";
import {avatarBodyVisualSignature,avatarBraceSlots,type AvatarBodyContext,type AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { SURGERY_MARKER_COLORS, type AvatarSurgeryMarker } from "@/lib/health-profile/avatar-surgery-markers";
import { watchModelByName } from "@/lib/health-profile/device-catalog";
import { BRAIN_BRAND } from "@/lib/health-intelligence/version";

import { avatarAttentionColor, shortestAvatarAngle } from "@/lib/health-profile/avatar-context";
import type { AvatarStyle } from "@/lib/health-profile/avatar-style";

type Controller = { markers:(markers:AvatarSurgeryMarker[])=>void; attention: (rank:number)=>void; rotate: (angle: number) => void; zoom: (value: number) => void; nudge:(delta:number)=>void;expression:(value:AvatarBodyContext["expression"])=>void;weight:(visible:boolean)=>void };
export default function HealthAvatar3D({ skin, appearance, devices, onUnavailable, attention=0, onDeviceSelect, onBrainSelect, onEmptyTap, controlsContainer, compact=false, body, onBodySelect }: { skin: string; appearance: AvatarStyle; devices: HealthDevice[]; attention?:number; onDeviceSelect?:(id:string)=>void; onBrainSelect?:()=>void; onEmptyTap?:()=>void; compact?:boolean;body?:AvatarBodyContext;onBodySelect?:(part:AvatarBodyPart,markerKey?:string)=>void; controlsContainer?:HTMLElement|null; onUnavailable: () => void }) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null);
  const [zoom, setZoom] = useState(100), [direction, setDirection] = useState("front");
  const zoomId = useId();
  const markersRef=useRef(body?.surgeryMarkers||[]);
  useEffect(()=>{markersRef.current=body?.surgeryMarkers||[];controller.current?.markers(markersRef.current);},[body?.surgeryMarkers]);
  const weightRef=useRef(!!body?.weight);
  useEffect(()=>{weightRef.current=!!body?.weight;controller.current?.weight(weightRef.current);},[!!body?.weight]);
  const expressionRef=useRef(body?.expression||"neutral");
  useEffect(()=>{expressionRef.current=body?.expression||"neutral";controller.current?.expression(expressionRef.current);},[body?.expression]);
  const actions=useRef({onDeviceSelect,onBrainSelect,onBodySelect,onEmptyTap});
  useEffect(()=>{actions.current={onDeviceSelect,onBrainSelect,onBodySelect,onEmptyTap};},[onDeviceSelect,onBrainSelect,onBodySelect,onEmptyTap]);
  const attentionRef=useRef(attention);
  useEffect(()=>{attentionRef.current=attention;controller.current?.attention(attention);},[attention]);
  const layoutForView=useMemo(()=>avatarLayout(devices),[devices]);
  const { description, slots } = layoutForView;
  const visualSignature=useMemo(()=>avatarBodyVisualSignature(skin,devices)+JSON.stringify(appearance),[skin,devices,appearance]);
  useEffect(() => {
    setZoom(100); setDirection("front");
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { onUnavailable(); return; }
    const displayRatio=window.devicePixelRatio||1;
    renderer.setPixelRatio(avatarRenderRatio(displayRatio,false));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    element.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";
    const scene = new THREE.Scene(), model = new THREE.Group();
    scene.add(model);
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 30);
    camera.position.set(0, 1.55, 6); camera.lookAt(0, 1.55, 0);
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x17212b, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-3,5,4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xc3e5dc, 1.4); rim.position.set(3,3,-3); scene.add(rim);
    const materials = {
      skin: new THREE.MeshStandardMaterial({ color: avatarColor(skin), roughness: .72 }),
      cloth: new THREE.MeshStandardMaterial({ color: "#31465b", roughness: .8 }),
      hair: new THREE.MeshStandardMaterial({ color: "#17212b", roughness: .9 }),
      dark: new THREE.MeshStandardMaterial({ color: "#09121d", roughness: .6 }),
      white: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: .65 }),
      cap: new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: .84 }),
      glasses: new THREE.MeshStandardMaterial({ color: appearance.glassesColor, roughness: .38, metalness: .3 }),
      sneakers: new THREE.MeshStandardMaterial({ color: appearance.sneakersColor, roughness: .67 }),
    };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, scale?: [number,number,number]) => {
      const object = new THREE.Mesh(geometry, material); object.position.set(x,y,z); if (scale) object.scale.set(...scale); model.add(object); return object;
    };
    const sphereGeometry=new THREE.SphereGeometry(1,24,16);
    const oval = (m: THREE.Material,x:number,y:number,z:number,s:[number,number,number]) => mesh(sphereGeometry,m,x,y,z,s);
    // V158: narrower face with a soft jaw/chin; stylized, not derived from clinical metrics.
    oval(materials.skin,0,2.80,0,[.222,.307,.208]);
    oval(materials.skin,0,2.627,.025,[.145,.075,.11]);
    // Brows, eye highlights and clothing seams provide depth without remote assets.
    for(const sign of [-1,1]) {
      const brow=mesh(new THREE.CapsuleGeometry(.009,.047,4,8),materials.hair,sign*.084,2.861,.205);brow.rotation.z=sign*1.42;
      oval(materials.white,sign*.081,2.826,.237,[.004,.004,.003]);
    }
    oval(materials.hair,0,2.98,-.035,[.247,.17,.23]);
    oval(materials.skin,-.224,2.77,0,[.031,.064,.041]); oval(materials.skin,.224,2.77,0,[.031,.064,.041]);
    mesh(new THREE.CylinderGeometry(.095,.11,.22,16),materials.skin,0,2.45,0);
    const shirtProfile=[[.265,0],[.27,.08],[.28,.35],[.31,.58],[.335,.70],[.32,.75],[.15,.80]].map(([radius,y])=>new THREE.Vector2(radius,y));
    mesh(new THREE.LatheGeometry(shirtProfile,24),materials.cloth,0,1.665,0,[1,1,.67]);
    mesh(new THREE.CylinderGeometry(.27,.275,.28,24),materials.cloth,0,1.535,0,[1,1,.72]);
    mesh(new THREE.TorusGeometry(.108,.012,6,24),materials.dark,0,2.43,0).rotation.x=Math.PI/2;
    mesh(new THREE.BoxGeometry(.014,.31,.009),materials.dark,0,1.44,.19);
    for(const sign of [-1,1]) {
      mesh(new THREE.BoxGeometry(.11,.012,.014),materials.white,sign*.15,.20,.28);
      mesh(new THREE.BoxGeometry(.10,.012,.014),materials.white,sign*.15,.235,.26);
    }
    for (const sign of [-1,1]) {
      oval(materials.cloth,sign*.32,2.34,0,[.142,.14,.125]);
      const arm = mesh(new THREE.CapsuleGeometry(.105,.65,6,16),materials.skin,sign*.43,1.98,0); arm.rotation.z=sign*.17;
      oval(materials.skin,sign*.51,1.48,.015,[.1,.14,.08]);
      mesh(new THREE.CapsuleGeometry(.13,.8,6,16),materials.skin,sign*.15,.77,0);
      mesh(new THREE.CylinderGeometry(.145,.145,.35,20),materials.cloth,sign*.15,1.28,0,[1,1,1]);
      oval(materials.dark,sign*.15,.17,.07,[.15,.09,.27]);
      oval(materials.white,sign*.083,2.82,.214,[.036,.022,.017]);
      oval(materials.dark,sign*.083,2.82,.23,[.013,.015,.008]);
    }
    oval(materials.skin,0,2.76,.23,[.035,.055,.04]);
    // V155: cosmetic accessories follow head/body geometry, not medical-device records.
    // They do not receive raycast actions and never alter clinical markers.
    if (appearance.hat !== "none") {
      const crown=mesh(new THREE.SphereGeometry(.246,28,16,0,Math.PI*2,0,Math.PI/2),materials.cap,0,3.038,-.01,[1,.75,.93]);
      crown.raycast=()=>{};
      const brimShape=new THREE.Shape();
      const width=appearance.hat==="flat"?.225:.196;
      brimShape.moveTo(-width,0);brimShape.lineTo(width,0);
      brimShape.bezierCurveTo(width+.015,.19,width*.6,.24,0,.245);
      brimShape.bezierCurveTo(-width*.6,.24,-width-.015,.19,-width,0);
      const brim=mesh(new THREE.ExtrudeGeometry(brimShape,{depth:.018,bevelEnabled:false,curveSegments:8}),materials.cap,0,3.043,.11);
      brim.rotation.x=appearance.hat==="baseball"?-Math.PI/2-.12:-Math.PI/2;
      brim.raycast=()=>{};
      const seam=mesh(new THREE.TorusGeometry(.239,.003,4,30,Math.PI),materials.white,0,3.042,-.012);
      seam.rotation.x=Math.PI/2;seam.raycast=()=>{};
      if(appearance.hatBrand==="nike" || appearance.hatBrand==="new-era") {
        const badge=mesh(new THREE.BoxGeometry(appearance.hatBrand==="new-era"?.091:.065,.034,.008),materials.white,0,3.133,.202);
        badge.raycast=()=>{};
        if(appearance.hatBrand==="new-era"){
          const line=mesh(new THREE.BoxGeometry(.047,.008,.01),materials.cap,0,3.133,.209);line.raycast=()=>{};
        }
      }
    }
    if (appearance.glasses !== "none") {
      for(const side of [-1,1]) {
        const x=side*.082,y=2.825,z=.256;
        const rectangular = appearance.glasses === "rectangular";
        const outline = new THREE.Shape();
        outline.moveTo(-.065,-.041); outline.lineTo(.065,-.041); outline.quadraticCurveTo(.073,-.041,.073,-.033);
        outline.lineTo(.073,.033); outline.quadraticCurveTo(.073,.041,.065,.041);
        outline.lineTo(-.065,.041); outline.quadraticCurveTo(-.073,.041,-.073,.033);
        outline.lineTo(-.073,-.033); outline.quadraticCurveTo(-.073,-.041,-.065,-.041);
        const hole = new THREE.Path();
        hole.moveTo(-.058,-.029); hole.lineTo(-.058,.029); hole.lineTo(.058,.029); hole.lineTo(.058,-.029); hole.closePath();
        outline.holes.push(hole);
        const frameGeometry = rectangular ? new THREE.ExtrudeGeometry(outline,{depth:.009,bevelEnabled:false,curveSegments:3}) : new THREE.TorusGeometry(.070,.009,7,24);
        const ring=mesh(frameGeometry,materials.glasses,x,y,z);
        ring.raycast=()=>{};
        const temple=mesh(new THREE.BoxGeometry(.009,.009,.14),materials.glasses,side*.166,y,.193);
        temple.raycast=()=>{};
      }
      const bridge=mesh(new THREE.BoxGeometry(.044,.01,.012),materials.glasses,0,2.831,.263);bridge.raycast=()=>{};
      for(const side of [-1,1]){const lens=oval(new THREE.MeshPhysicalMaterial({color:0xb7e6fa,transparent:true,opacity:.12,roughness:.12,metalness:.05,depthWrite:false}),side*.082,2.825,.254,[.055,appearance.glasses==="round"?.055:.029,.003]);lens.raycast=()=>{};}
    }
    for(const side of [-1,1]) {
      const x=side*.15;
      const sole=oval(materials.white,x,.125,.085,[.151,.026,.259]);sole.raycast=()=>{};
      const shoe=oval(materials.sneakers,x,.175,.095,[.150,.065,.248]);shoe.raycast=()=>{};
      for(let j=0;j<3;j++){const lace=mesh(new THREE.BoxGeometry(.075,.005,.008),materials.white,x,.204-j*.014,.309);lace.raycast=()=>{};}
      if(appearance.sneakers==="high-top"){
        const high=mesh(new THREE.CylinderGeometry(.12,.137,.19,14),materials.sneakers,x,.26,.043);high.raycast=()=>{};
      }
      if(appearance.sneakers==="runner"){
        const stripe=mesh(new THREE.BoxGeometry(.099,.017,.009),materials.white,x,.22,.327);stripe.raycast=()=>{};
      }
    }
    const mouth=mesh(new THREE.TorusGeometry(.047,.007,6,18,Math.PI),materials.dark,0,2.68,.213);mouth.rotation.z=Math.PI;
    const neutralMouth=mesh(new THREE.BoxGeometry(.068,.009,.005),materials.dark,0,2.68,.238);
    const setExpression=(value:AvatarBodyContext['expression'])=>{mouth.visible=value!=="neutral";neutralMouth.visible=value==="neutral";mouth.rotation.z=value==="reflective"?0:Math.PI;mouth.position.y=value==="reflective"?2.63:2.68;};
    setExpression(expressionRef.current);
    const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
    const faceTarget=mesh(new THREE.BoxGeometry(.56,.68,.66),hitMaterial,0,2.8,0);faceTarget.userData.action="mood";
    const weightMarker=mesh(new THREE.TorusGeometry(.032,.006,6,18),materials.white,0,1.84,.216);weightMarker.visible=weightRef.current;
    const weightTarget=mesh(new THREE.BoxGeometry(.36,.14,.12),hitMaterial,0,1.84,.26);weightTarget.userData.action="weight";
    const markerGroup=new THREE.Group();model.add(markerGroup);
    const markerGeometry=new THREE.SphereGeometry(.036,12,8),markerRingGeometry=new THREE.TorusGeometry(.057,.008,6,18),markerHitGeometry=new THREE.SphereGeometry(.10,10,8);
    const markerMaterials={upcoming:new THREE.MeshBasicMaterial({color:SURGERY_MARKER_COLORS.upcoming}),unconfirmed:new THREE.MeshBasicMaterial({color:SURGERY_MARKER_COLORS.unconfirmed}),completed:new THREE.MeshBasicMaterial({color:SURGERY_MARKER_COLORS.completed})};
    const markerLines=new Map<string,THREE.BufferGeometry>();
    const markerLineMaterials={upcoming:new THREE.LineBasicMaterial({color:SURGERY_MARKER_COLORS.upcoming,transparent:true,opacity:.55}),unconfirmed:new THREE.LineBasicMaterial({color:SURGERY_MARKER_COLORS.unconfirmed,transparent:true,opacity:.55}),completed:new THREE.LineBasicMaterial({color:SURGERY_MARKER_COLORS.completed,transparent:true,opacity:.55})};
    let markerSignature='';
    const setMarkers=(markers:AvatarSurgeryMarker[])=>{
      const signature=JSON.stringify(markers.map(marker=>[marker.key,marker.tone]));
      if(signature===markerSignature)return;markerSignature=signature;markerGroup.clear();
      for(const marker of markers){
        const material=markerMaterials[marker.tone];
        if(marker.position[0]!==0){
          let geometry=markerLines.get(marker.key);
          if(!geometry){const [x,y,z]=marker.position;geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x*.78,y,z),new THREE.Vector3(x,y,z)]);markerLines.set(marker.key,geometry);}
          const line=new THREE.Line(geometry,markerLineMaterials[marker.tone]);line.raycast=()=>{};markerGroup.add(line);
        }

        for(const geometry of [markerGeometry,markerRingGeometry,markerHitGeometry]){
          const object=new THREE.Mesh(geometry,geometry===markerHitGeometry?hitMaterial:material);
          object.position.set(...marker.position);object.userData.action='surgery';object.userData.markerKey=marker.key;markerGroup.add(object);
        }
      }
    };
    // Badge and phone are local canvas textures, not downloads or personal data.
    const textures: THREE.Texture[]=[];
    const label=(title:string,subtitle:string)=>{
      const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
      const c=canvas.getContext("2d");
      if(c){c.fillStyle="#0b1520";c.fillRect(0,0,256,256);c.strokeStyle="#c4b5fd";c.lineWidth=5;c.strokeRect(12,12,232,232);c.fillStyle="#c4b5fd";c.font="bold 90px sans-serif";c.textAlign="center";c.lineCap="round";c.lineJoin="round";c.beginPath();c.moveTo(128,42);c.bezierCurveTo(96,26,78,47,83,63);c.bezierCurveTo(52,70,66,106,84,110);c.bezierCurveTo(94,137,118,119,128,109);c.moveTo(128,42);c.bezierCurveTo(160,26,178,47,173,63);c.bezierCurveTo(204,70,190,106,172,110);c.bezierCurveTo(162,137,138,119,128,109);c.moveTo(128,42);c.lineTo(128,109);c.moveTo(96,62);c.bezierCurveTo(107,70,106,87,90,92);c.moveTo(160,62);c.bezierCurveTo(149,70,150,87,166,92);c.stroke();c.fillStyle="#f1f5f9";c.font="bold 36px sans-serif";c.fillText(title,128,172);c.font="20px sans-serif";c.fillStyle="#c4b5fd";c.fillText(subtitle,128,212);}
      const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return new THREE.MeshBasicMaterial({map:t});
    };
    const brainBadge=mesh(new THREE.PlaneGeometry(.255,.255),label("VAULT",BRAIN_BRAND),0,2.14,.239);brainBadge.userData.action="brain";
    const signalMaterial=new THREE.MeshStandardMaterial({color:avatarAttentionColor(attentionRef.current),emissive:avatarAttentionColor(attentionRef.current),emissiveIntensity:.35,metalness:.3,roughness:.4});
    const signalRing=mesh(new THREE.TorusGeometry(.245,.008,8,48),signalMaterial,0,2.1,.248,[1,.86,1]);
    const setAttention=(rank:number)=>{const color=avatarAttentionColor(rank);signalMaterial.color.set(color);signalMaterial.emissive.set(color);signalRing.visible=rank>0;};
    setAttention(attentionRef.current);
    const backBadge=mesh(new THREE.PlaneGeometry(.22,.22),label("VAULT",BRAIN_BRAND),0,2.16,-.237);backBadge.rotation.y=Math.PI;backBadge.userData.action="brain";
    const braces=avatarBraceSlots(devices);
    for(const device of braces){const x=device.side==="right"?-.50:.50;const fabric=new THREE.MeshStandardMaterial({color:avatarColor(device.color,"#7dd3fc"),roughness:.9});const brace=mesh(new THREE.CylinderGeometry(.122,.118,.26,16),fabric,x,1.65,.012);brace.rotation.z=device.side==="right"?-.17:.17;for(const y of [1.57,1.72])mesh(new THREE.BoxGeometry(.23,.018,.018),materials.dark,x,y,.131);const pick=mesh(new THREE.BoxGeometry(.28,.26,.36),hitMaterial,x,1.65,.025);pick.userData.action="device";pick.userData.deviceId=device.id;}
    const layout=avatarLayout(devices);
    for (const slot of layout.slots) {
      const watchY=braces.some(d=>d.side===slot.side)?1.99:1.61;
      const x=(slot.side==='right'?-1:1)*(watchY>1.61&&slot.kind==='watch'?.43:.50);
      const targetMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
      const target=mesh(new THREE.BoxGeometry(slot.kind==="watch"?.32:.16,slot.kind==="watch"?.26:.14,.08),targetMaterial,x,slot.kind==="watch"?watchY:1.43,.15);target.userData.action="device";target.userData.deviceId=slot.device.id;
      const metal=new THREE.MeshStandardMaterial({color:avatarColor(slot.device.color,"#94a3b8"),metalness:.45,roughness:.32});
      const ring=mesh(new THREE.TorusGeometry(slot.kind==="watch"?.108:.042,slot.kind==="watch"?.026:.012,8,24),metal,x,slot.kind==="watch"?watchY:1.43,.008);ring.rotation.x=Math.PI/2;
      if(slot.kind==="watch"){
        const reference=watchModelByName(slot.device.name), shape=reference?.shape || 'round';
        const width=shape==='band'?.105:shape==='ultra'?.185:.16, height=shape==='band'?.21:.17;
        const titanium=new THREE.MeshStandardMaterial({color:shape==='ultra'?'#b9b8b3':avatarColor(slot.device.color,'#94a3b8'),metalness:.65,roughness:.3});
        if(shape==='round'){
          const caseMesh=mesh(new THREE.CylinderGeometry(.086,.086,.055,24),titanium,x,watchY,.098);caseMesh.rotation.x=Math.PI/2;
        }else{
          const outline=new THREE.Shape(),w=width/2,h=height/2,r=.026;
          outline.moveTo(-w+r,-h);outline.lineTo(w-r,-h);outline.quadraticCurveTo(w,-h,w,-h+r);outline.lineTo(w,h-r);outline.quadraticCurveTo(w,h,w-r,h);outline.lineTo(-w+r,h);outline.quadraticCurveTo(-w,h,-w,h-r);outline.lineTo(-w,-h+r);outline.quadraticCurveTo(-w,-h,-w+r,-h);
          mesh(new THREE.ExtrudeGeometry(outline,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.004}),titanium,x,watchY,.075);
        }
        const roundFace=shape==='round'||shape==='ultra';
        mesh(roundFace?new THREE.CircleGeometry(.068,24):new THREE.PlaneGeometry(width*.75,height*.75),materials.dark,x,watchY,.133);
        mesh(new THREE.BoxGeometry(.009,.046,.006),materials.white,x,watchY+.02,.139);
        const hand=mesh(new THREE.BoxGeometry(.038,.009,.006),materials.white,x+.016,watchY,.139);hand.rotation.z=-.4;
        const crown=new THREE.MeshStandardMaterial({color:shape==='ultra'?'#fb923c':'#94a3b8',metalness:.45,roughness:.3});
        mesh(new THREE.BoxGeometry(.022,.036,.028),crown,x+width/2+.006,watchY,.103);
      }
    }
    const phoneX=layout.phoneSide==="right"?-.55:.55;
    const phone=mesh(new THREE.BoxGeometry(.17,.3,.035),materials.dark,phoneX,1.30,.09);phone.rotation.z=layout.phoneSide==="right"?-.12:.12;
    const screen=mesh(new THREE.PlaneGeometry(.14,.24),label("VAULT",""),phoneX,1.30,.109);screen.rotation.z=phone.rotation.z;screen.userData.action="brain";
    const shadowCanvas=document.createElement("canvas");shadowCanvas.width=128;shadowCanvas.height=128;
    const shadowContext=shadowCanvas.getContext("2d");
    if(shadowContext){const gradient=shadowContext.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,"rgba(0,0,0,.4)");gradient.addColorStop(1,"rgba(0,0,0,0)");shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);}
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas);textures.push(shadowTexture);
    mesh(new THREE.PlaneGeometry(1.25,.85),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}),0,.035,.06).rotation.x=-Math.PI/2;
    let disposed=false, visible=true, frame=0;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let transition:{from:number;to:number;start:number}|null=null;
    const draw=()=>{if(disposed||!visible||document.hidden||frame)return;frame=requestAnimationFrame(now=>{
      frame=0;if(disposed||!visible||document.hidden)return;
      if(transition){const progress=Math.min(1,(now-transition.start)/220),ease=1-Math.pow(1-progress,3);model.rotation.y=transition.from+(transition.to-transition.from)*ease;if(progress>=1)transition=null;}
      renderer.render(scene,camera);if(transition)draw();
    });};
    const setDragging=(dragging:boolean)=>{const ratio=avatarRenderRatio(displayRatio,dragging);if(renderer.getPixelRatio()!==ratio){renderer.setPixelRatio(ratio);renderer.setSize(element.clientWidth,element.clientHeight||340);}};
    const resize=()=>{const width=element.clientWidth;if(!width)return;const height=element.clientHeight||340;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();draw();};
    setMarkers(markersRef.current);
    controller.current={markers:value=>{setMarkers(value);draw();},weight:value=>{weightMarker.visible=value;draw();},expression:value=>{setExpression(value);draw();},attention:rank=>{setAttention(rank);draw();},rotate:angle=>{
      const target=shortestAvatarAngle(model.rotation.y,angle);
      if(reducedMotion){model.rotation.y=target;transition=null;}else transition={from:model.rotation.y,to:target,start:performance.now()};draw();
    },nudge:delta=>{transition=null;model.rotation.y+=delta;setDirection("custom");draw();},zoom:value=>{camera.zoom=avatarZoom(value)/100;camera.updateProjectionMatrix();draw();}};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);
    const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(visible)draw();});visibilityObserver.observe(element);
    const visibility=()=>{if(!document.hidden)draw();};document.addEventListener("visibilitychange",visibility);
    let pointer:{id:number;x:number;y:number;angle:number;moved:boolean;rotating:boolean}|null=null;
    const raycaster=new THREE.Raycaster();
    const down=(e:PointerEvent)=>{if(!e.isPrimary || (e.pointerType==='mouse' && e.button!==0))return;transition=null;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,angle:model.rotation.y,moved:false,rotating:false};};
    const move=(e:PointerEvent)=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x;pointer.moved ||= Math.hypot(dx,e.clientY-pointer.y)>6;if(Math.abs(dx)<=6||Math.abs(dx)<Math.abs(e.clientY-pointer.y))return;try{renderer.domElement.setPointerCapture(e.pointerId);}catch{}model.rotation.y=pointer.angle+dx*.012;if(!pointer.rotating){pointer.rotating=true;setDragging(true);setDirection("custom");}draw();};
    const up=(e:PointerEvent)=>{if(pointer?.id!==e.pointerId)return;const tap=avatarTapEligible(e.type,pointer.moved,pointer,{x:e.clientX,y:e.clientY});if(pointer.rotating){setDragging(false);draw();}pointer=null;if(tap){const rect=renderer.domElement.getBoundingClientRect();if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){model.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const target=raycaster.intersectObject(model,true)[0]?.object.userData;if(target?.action==="device")actions.current.onDeviceSelect?.(target.deviceId);else if(target?.action==="brain")actions.current.onBrainSelect?.();else if(target?.action==="surgery")actions.current.onBodySelect?.("surgery",target.markerKey);else if(target?.action==="mood"||target?.action==="weight")actions.current.onBodySelect?.(target.action);else actions.current.onEmptyTap?.();}}try{if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);}catch{}pointer=null;};
    const lost=(event:Event)=>{event.preventDefault();onUnavailable();};
    element.addEventListener("pointerdown",down);element.addEventListener("pointermove",move);window.addEventListener("pointerup",up);window.addEventListener("pointercancel",up);element.addEventListener("lostpointercapture",up);renderer.domElement.addEventListener("webglcontextlost",lost);
    resize();
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);controller.current=null;resizeObserver.disconnect();visibilityObserver.disconnect();document.removeEventListener("visibilitychange",visibility);element.removeEventListener("pointerdown",down);element.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",up);element.removeEventListener("lostpointercapture",up);renderer.domElement.removeEventListener("webglcontextlost",lost);
      const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();model.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])mats.add(m);}});Object.values(materials).forEach(m=>mats.add(m));[markerGeometry,markerRingGeometry,markerHitGeometry].forEach(g=>geometries.add(g));Object.values(markerMaterials).forEach(m=>mats.add(m));markerLines.forEach(g=>geometries.add(g));Object.values(markerLineMaterials).forEach(m=>mats.add(m));mats.add(hitMaterial);geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
    // Signature includes every appearance field used by this scene; metadata updates keep the canvas.
  },[visualSignature,onUnavailable]);
  const keyboard=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();controller.current?.nudge(event.key==='ArrowLeft'?-Math.PI/12:Math.PI/12);}
    else if(event.key==='Home'){event.preventDefault();controller.current?.rotate(0);controller.current?.zoom(100);setDirection('front');setZoom(100);}
    else if(event.key==='+'||event.key==='-'||event.key==='='){event.preventDefault();const value=avatarZoom(zoom+(event.key==='-'?-5:5));setZoom(value);controller.current?.zoom(value);}
  };
  const controls=<>    {attention>0&&<p className="mt-1 text-center text-[10px] text-slate-400">O contorno do Brain acompanha a prioridade dos insights; não representa diagnóstico.</p>}
    <p className="mt-2 text-[10px] text-slate-400">Teclado: setas giram; + e − ajustam o zoom; Home restaura a frente.</p>
    <div aria-label="Vista do avatar 3D" className="mt-3 grid grid-cols-4 gap-1">{([['front','Frente',0],['left','Esquerda',-Math.PI/2],['back','Costas',Math.PI],['right','Direita',Math.PI/2]] as const).map(([id,title,angle])=><button type="button" key={id} aria-pressed={direction===id} onClick={()=>{controller.current?.rotate(angle);setDirection(id);}} className={`min-h-11 rounded-xl border text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${direction===id?'border-violet-300/50 bg-violet-400/15 text-violet-200':'border-slate-400/20 text-slate-300'}`}>{title}</button>)}</div>
    <label htmlFor={zoomId} className="mt-3 flex items-center justify-between text-xs text-slate-300">Zoom <span>{zoom}%</span></label><input id={zoomId} aria-label="Zoom do avatar" type="range" min="80" max="130" value={zoom} onChange={e=>{const value=avatarZoom(Number(e.target.value));setZoom(value);controller.current?.zoom(value);}} className="mt-2 min-h-8 w-full accent-violet-400" />
    {slots.length>0?<ul aria-label="Aparelhos representados" className="mt-3 space-y-2">{slots.map(({kind,side,device,count})=><li key={`${side}-${kind}`} className="rounded-xl border border-slate-400/20 bg-slate-900/40 px-3 py-2 text-xs text-slate-200">{onDeviceSelect?<button type="button" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)} className="min-h-11 w-full text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">{device.name} <span aria-hidden="true">›</span></button>:<strong>{device.name}</strong>}<span className="mt-1 block text-[10px] text-slate-400">{kind==='watch'?'Relógio':'Anel'} · lado {side==='right'?'direito':'esquerdo'}{count>1?` · +${count-1} nesta posição`:''}</span></li>)}</ul>:null}</>;
  return <div className="mx-auto w-full max-w-[340px]">
    <div ref={host} style={{height:compact?200:"clamp(220px, 36dvh, 340px)"}} tabIndex={0} onKeyDown={keyboard} role="group" aria-label={`Avatar 3D estilizado. ${description}. Acessórios pessoais são cosméticos, separados dos aparelhos de saúde. Celular ilustrativo.`} className="h-[340px] w-full cursor-grab overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-300/[.04] via-transparent to-slate-900/30 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" />
    {compact?null:<p className="text-center text-[11px] text-slate-400">Arraste para girar · toque em uma região para explorar</p>}
    {controlsContainer===undefined?controls:controlsContainer?createPortal(controls,controlsContainer):null}
  </div>;
}
