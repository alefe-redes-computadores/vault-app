"use client";
import { useEffect, useId, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarColor, avatarLayout, avatarTapEligible } from "@/lib/health-profile/avatar";
import { avatarAdaptiveRatio, avatarConstrainedDevice, avatarZoom } from "@/lib/health-profile/avatar-preference";
import {avatarBodyVisualSignature,avatarBraceSlots,type AvatarBodyContext,type AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { SURGERY_MARKER_COLORS, type AvatarSurgeryMarker } from "@/lib/health-profile/avatar-surgery-markers";
import { watchModelByName } from "@/lib/health-profile/device-catalog";
import { avatarAttentionColor, shortestAvatarAngle } from "@/lib/health-profile/avatar-context";
import {avatarCameraFrame,avatarStyleGeometryKey,type AvatarFraming} from "@/lib/health-profile/avatar-framing";
import type { AvatarStyle } from "@/lib/health-profile/avatar-style";

type Controller = {preview:()=>void;viewport:(compact:boolean)=>void;style:(value:AvatarStyle)=>void;framing:(value:AvatarFraming)=>void; markers:(markers:AvatarSurgeryMarker[])=>void; attention: (rank:number)=>void; rotate: (angle: number) => void; zoom: (value: number) => void; nudge:(delta:number)=>void;expression:(value:AvatarBodyContext["expression"])=>void;weight:(visible:boolean)=>void };
export default function HealthAvatar3D({ framing="body",onFramingChange,skin, appearance, devices, onUnavailable, attention=0, onDeviceSelect, onBrainSelect, onEmptyTap, controlsContainer, compact=false, body, onBodySelect }: { framing?:AvatarFraming;onFramingChange?:(value:AvatarFraming)=>void;skin: string; appearance: AvatarStyle; devices: HealthDevice[]; attention?:number; onDeviceSelect?:(id:string)=>void; onBrainSelect?:()=>void; onEmptyTap?:()=>void; compact?:boolean;body?:AvatarBodyContext;onBodySelect?:(part:AvatarBodyPart,markerKey?:string)=>void; controlsContainer?:HTMLElement|null; onUnavailable: () => void }) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null);
  const compactRef = useRef(compact);
  const [zoom, setZoom] = useState(100), [direction, setDirection] = useState("front");
  const zoomId = useId();
  const appearanceRef=useRef(appearance),framingRef=useRef(framing);
  useEffect(()=>{appearanceRef.current=appearance;controller.current?.style(appearance);},[appearance]);
  useEffect(()=>{framingRef.current=framing;setZoom(100);controller.current?.framing(framing);},[framing]);
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
  const visualSignature=useMemo(()=>avatarBodyVisualSignature(skin,devices)+avatarStyleGeometryKey(appearance),[skin,devices,appearance]);
  // V202: the compact preview is its own canonical presentation, not a copy
  // of the editor camera. Reuse the WebGL renderer and never start a render loop.
  useEffect(()=>{
    compactRef.current=compact;
    controller.current?.viewport(compact);
    if(compact){
      setZoom(100);
      setDirection('front');
      controller.current?.preview();
    }
  },[compact,visualSignature]);
  useEffect(() => {
    setZoom(100); setDirection("front");
    const appearance=appearanceRef.current;
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !compactRef.current, alpha: true, powerPreference: "low-power" }); }
    catch { onUnavailable(); return; }
    const displayRatio=window.devicePixelRatio||1;
    const navigatorWithMemory=navigator as Navigator&{deviceMemory?:number};
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const constrainedDevice=avatarConstrainedDevice({hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigatorWithMemory.deviceMemory,reducedMotion});
    renderer.setPixelRatio(avatarAdaptiveRatio(displayRatio,element.clientWidth,element.clientHeight,false,compactRef.current,constrainedDevice));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    element.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";
    const scene = new THREE.Scene(), model = new THREE.Group();
    scene.add(model);
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 30);
    const cameraFrame=avatarCameraFrame(framingRef.current);
    camera.position.set(0, cameraFrame.height, cameraFrame.distance); camera.lookAt(0, cameraFrame.height, 0);
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x101820, 2.05));
    const key = new THREE.DirectionalLight(0xffffff, 3.25); key.position.set(-3,5,4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x8debd1, 1.65); rim.position.set(3,3,-3); scene.add(rim);
    const stageMaterial=new THREE.MeshStandardMaterial({color:0x16372f,transparent:true,opacity:.34,roughness:.72,metalness:.12,depthWrite:false});
    const stage=new THREE.Mesh(new THREE.BoxGeometry(1.18,.025,.68),stageMaterial);stage.position.set(0,.075,.015);scene.add(stage);
    const stageRingMaterial=new THREE.MeshBasicMaterial({color:0x89f3d4,transparent:true,opacity:.2,depthWrite:false});
    const stageRing=new THREE.LineSegments(new THREE.EdgesGeometry(stage.geometry),stageRingMaterial);stageRing.position.copy(stage.position);scene.add(stageRing);
    const materials = {
      // P8: pele e olhos menos plastificados, sem geometria, luz ou GPU extras.
      skin: new THREE.MeshStandardMaterial({ color: avatarColor(skin), roughness: .61, metalness: .008 }),
      skinShade: new THREE.MeshStandardMaterial({ color: new THREE.Color(avatarColor(skin)).multiplyScalar(.76), roughness: .72, transparent:true, opacity:.29 }),
      top: new THREE.MeshStandardMaterial({ color: appearance.topColor, roughness: .76 }),
      shirtDetail: new THREE.MeshStandardMaterial({ color: new THREE.Color(appearance.topColor).multiplyScalar(.55), roughness: .82 }),
      bottom: new THREE.MeshStandardMaterial({ color: appearance.bottomColor, roughness: .79 }),
      hair: new THREE.MeshStandardMaterial({ color: appearance.hairColor, roughness: .9 }),
      facialHair: new THREE.MeshStandardMaterial({ color: appearance.hairColor, roughness: .94, transparent:true, opacity:.88 }),
      lips: new THREE.MeshStandardMaterial({ color: appearance.lips==='berry'?'#71324d':appearance.lips==='rose'?'#a85e6d':'#6b3e35', roughness: .78, transparent:true, opacity:appearance.lips==='natural'?.4:.72 }),
      dark: new THREE.MeshStandardMaterial({ color: "#09121d", roughness: .6 }),
      white: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: .65 }),
      // V221: a esclera nao compartilha o branco intenso dos tenis/boné.
      eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .74 }),
      eyeHighlight: new THREE.MeshBasicMaterial({ color: "#e8f5f3", transparent: true, opacity: .42, depthWrite: false }),
      watchAccent: new THREE.MeshBasicMaterial({ color: 0x69bda4, transparent: true, opacity: .56, depthWrite: false }),
      glass: new THREE.MeshBasicMaterial({ color: 0xdffbf5, transparent: true, opacity: .11, depthWrite: false }),
      iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .38, metalness: .012 }),
      cap: new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: .84 }),
      capShade: new THREE.MeshStandardMaterial({ color: new THREE.Color(appearance.hatColor).multiplyScalar(.58), roughness: .9 }),
      glasses: new THREE.MeshStandardMaterial({ color: appearance.glassesColor, roughness: .38, metalness: .3 }),
      sneakers: new THREE.MeshStandardMaterial({ color: appearance.sneakersColor, roughness: .67 }),
    };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, scale?: [number,number,number]) => {
      const object = new THREE.Mesh(geometry, material); object.position.set(x,y,z); if (scale) object.scale.set(...scale); model.add(object); return object;
    };
    const softBox=(width:number,height:number,depth:number,radius=.02)=>{
      const shape=new THREE.Shape(),w=width/2,h=height/2,r=Math.min(radius,w/2,h/2);
      shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
      const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:3});geometry.translate(0,0,-depth/2);return geometry;
    };
    const taperedBox=(backWidth:number,frontWidth:number,height:number,depth:number)=>{
      // V230: Android WebGL ainda pode projetar vértices alterados manualmente
      // como faixas atravessando o rosto. A peça usa só BoxGeometry nativa;
      // não há BufferAttribute reescrito nem custo adicional por quadro.
      return new THREE.BoxGeometry(Math.max(backWidth,frontWidth),height,depth);
    };
    const sphereGeometry=new THREE.SphereGeometry(1,24,16);
    const oval = (m: THREE.Material,x:number,y:number,z:number,s:[number,number,number]) => mesh(sphereGeometry,m,x,y,z,s);
    const limb=(topRadius:number,bottomRadius:number,length:number,material:THREE.Material,x:number,y:number,z:number,rotation=0)=>{
      const part=mesh(new THREE.CylinderGeometry(topRadius,bottomRadius,length,10),material,x,y,z);part.rotation.z=rotation;return part;
    };
    // V158 continuity: narrower face with a soft jaw/chin.
    // V167: face planes preserved and refined by V177.
    // V177: the face uses a cranial volume plus a planar jaw. It stays stylized,
    // but no longer reads as a sphere stacked over a cylinder.
    // V194: o volume craniano fica mais estreito na frente e mais profundo de perfil;
    // o rosto ganha leitura humana sem aumentar a contagem de malhas.
    oval(materials.skin,0,2.825,-.016,[.188,.268,.184]);
    const jawShape=new THREE.Shape();
    jawShape.moveTo(-.153,.087);jawShape.lineTo(.153,.087);jawShape.lineTo(.128,-.045);jawShape.lineTo(.066,-.111);jawShape.lineTo(0,-.132);jawShape.lineTo(-.066,-.111);jawShape.lineTo(-.128,-.045);jawShape.closePath();
    const jawGeometry=new THREE.ExtrudeGeometry(jawShape,{depth:.166,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2});jawGeometry.translate(0,0,-.083);
    const jaw=mesh(jawGeometry,materials.skin,0,2.657,.018);jaw.rotation.x=.025;
    for(const sign of [-1,1]) {
      // V184: cheek volume follows the jaw plane instead of reading as a sphere attached to the face.
      const cheek=mesh(taperedBox(.055,.068,.074,.034),materials.skin,sign*.104,2.738,.147);cheek.rotation.z=sign*.105;cheek.rotation.x=-.08;cheek.raycast=()=>{};
      const temple=mesh(taperedBox(.051,.063,.11,.032),materials.skin,sign*.158,2.824,.124);temple.rotation.z=sign*.08;temple.raycast=()=>{};
      // V198: a orelha deixa de ser uma esfera achatada. O plano afunilado acompanha
      // têmpora e mandíbula com a mesma contagem de malhas e sem custo por quadro.
      const outerEar=mesh(taperedBox(.038,.048,.091,.044),materials.skin,sign*.202,2.77,.004);outerEar.rotation.z=-sign*.07;outerEar.raycast=()=>{};
      const earRim=mesh(taperedBox(.013,.019,.054,.021),materials.skinShade,sign*.205,2.77,.036);earRim.rotation.z=-sign*.06;earRim.raycast=()=>{};
      const cheekbone=mesh(new THREE.CapsuleGeometry(.006,.053,3,8),materials.skinShade,sign*.101,2.752,.197);cheekbone.rotation.z=sign*1.18;cheekbone.raycast=()=>{};
      const innerEar=mesh(new THREE.TorusGeometry(.020,.004,5,12,Math.PI*1.35),materials.dark,sign*.207,2.77,.046);innerEar.rotation.y=sign*Math.PI/2;innerEar.raycast=()=>{};
    }
    const chin=oval(materials.skin,0,2.548,.056,[.073,.038,.069]);chin.rotation.x=.08;chin.raycast=()=>{};
    // V208: expression controls reuse the existing brow and eyelid meshes. This
    // gives the face a readable mood without a facial animation loop.
    const expressionBrows: Array<{object:THREE.Mesh;sign:number}> = [];
    const expressionLids: Array<{object:THREE.Mesh;sign:number}> = [];
    const expressionLidScaleY = new WeakMap<THREE.Mesh,number>();
    const expressionEyes: Array<{object:THREE.Mesh;restY:number}> = [];
    const expressionHighlights: Array<{object:THREE.Mesh;restY:number}> = [];
    const expressionHighlightScale = new WeakMap<THREE.Mesh,THREE.Vector3>();
    const expressionEyeScaleY = new WeakMap<THREE.Mesh,number>();
    // V214: planos orbitais afunilados integram as sobrancelhas ao rosto.
    // O brilho do olho existe em uma única camada, evitando o olhar duplicado.
    for(const sign of [-1,1]) {
      // V193: refina volumes existentes, sem novos draw calls ou acessórios flutuantes.
      const browWidth=appearance.brows==='full'?.078:appearance.brows==='defined'?.069:.061;
      const browHeight=appearance.brows==='full'?.017:appearance.brows==='defined'?.013:.009;
      const brow=mesh(softBox(browWidth,browHeight,.012,.005),materials.hair,sign*.084,2.861,.205);brow.rotation.z=-sign*(appearance.brows==='defined'?.15:.10);brow.raycast=()=>{};
      expressionBrows.push({object:brow,sign});
      // V192: planos supraorbitais conectam sobrancelha, têmpora e ponte nasal;
      // o rosto mantém expressão e acessórios sem voltar ao aspecto circular.
      const browPlane=mesh(taperedBox(.041,.061,.016,.017),materials.skinShade,sign*.083,2.875,.184);browPlane.rotation.z=sign*.08;browPlane.raycast=()=>{};
      const upperLid=oval(materials.skin,sign*.083,2.843,.224,[.041,.012,.014]);upperLid.rotation.z=sign*.025;upperLid.raycast=()=>{};
      expressionLids.push({object:upperLid,sign}); expressionLidScaleY.set(upperLid,upperLid.scale.y);
      const lowerLid=mesh(new THREE.CapsuleGeometry(.003,.051,2,7),materials.skinShade,sign*.083,2.807,.226);lowerLid.rotation.z=Math.PI/2;lowerLid.raycast=()=>{};
    }
    const noseBridge=mesh(taperedBox(.022,.029,.074,.025),materials.skin,0,2.778,.208);noseBridge.rotation.x=.08;noseBridge.raycast=()=>{};
    const nosePlane=mesh(taperedBox(.025,.036,.078,.026),materials.skinShade,0,2.779,.198);nosePlane.rotation.x=-.05;nosePlane.raycast=()=>{};
    const noseTip=oval(materials.skin,0,2.727,.231,[.027,.018,.023]);noseTip.raycast=()=>{};
    for(const sign of [-1,1]){
      oval(materials.skin,sign*.027,2.716,.229,[.019,.012,.019]).raycast=()=>{};
      oval(materials.skinShade,sign*.018,2.711,.259,[.006,.004,.003]).raycast=()=>{};
    }
    const hairHeight=appearance.hat==="none"?2.99:2.945;
    if(appearance.hair==='short')oval(materials.hair,0,hairHeight,-.035,[.232,appearance.hat==="none"?.145:.095,.215]);
    if(appearance.hair==='fade'){
      oval(materials.hair,0,hairHeight+.018,-.045,[.205,appearance.hat==="none"?.115:.075,.195]);
      for(const sign of [-1,1])oval(materials.hair,sign*.176,2.886,-.035,[.043,.092,.165]);
    }
    if(appearance.hair==='curly'){
      const curls:[number,number,number][]=[[-.15,3.015,-.02],[-.08,3.045,-.035],[0,3.055,-.04],[.08,3.045,-.035],[.15,3.015,-.02],[-.18,2.96,-.02],[.18,2.96,-.02]];
      for(const [x,y,z] of curls)oval(materials.hair,x,appearance.hat==='none'?y:y-.055,z,[.075,.072,.075]);
    }
    // V239: cabelos diversos usam volumes estáticos de baixo custo. Nenhum estilo
    // implica gênero ou condição clínica e todos continuam compatíveis com boné.
    if(appearance.hair==='coily'){
      const coils:[number,number,number][]=[[-.17,2.99,-.03],[-.11,3.045,-.04],[-.04,3.065,-.045],[.04,3.065,-.045],[.11,3.045,-.04],[.17,2.99,-.03],[-.19,2.925,-.025],[.19,2.925,-.025]];
      for(const [x,y,z] of coils)oval(materials.hair,x,appearance.hat==='none'?y:y-.065,z,[.063,.066,.065]);
    }
    if(appearance.hair==='wavy'||appearance.hair==='long'||appearance.hair==='bob'){
      const length=appearance.hair==='long'?.47:appearance.hair==='bob'?.27:.34;
      const topY=appearance.hat==='none'?2.982:2.925;
      oval(materials.hair,0,topY,-.055,[.235,.135,.22]);
      for(const sign of [-1,1]){
        const side=mesh(new THREE.CapsuleGeometry(.068,length,5,10),materials.hair,sign*.19,2.79-length*.28,-.055);
        side.rotation.z=sign*(appearance.hair==='wavy'?.12:.035);side.raycast=()=>{};
        if(appearance.hair==='wavy') oval(materials.hair,sign*.205,2.66,-.045,[.072,.105,.075]).raycast=()=>{};
      }
      if(appearance.hair==='long'){const back=mesh(softBox(.34,.42,.075,.11),materials.hair,0,2.68,-.19);back.raycast=()=>{};}
    }
    if(appearance.hair==='bun'){
      oval(materials.hair,0,appearance.hat==='none'?2.995:2.94,-.045,[.225,.13,.205]);
      // Com boné, o coque desce para a nuca em vez de atravessar a copa.
      oval(materials.hair,0,appearance.hat==='none'?3.13:2.82,appearance.hat==='none'?-.09:-.205,[.105,.10,.10]).raycast=()=>{};
    }
    if(appearance.hair==='ponytail'){
      oval(materials.hair,0,appearance.hat==='none'?2.99:2.93,-.045,[.225,.13,.205]);
      const tail=mesh(new THREE.CapsuleGeometry(.065,.34,5,10),materials.hair,.16,appearance.hat==='none'?2.73:2.67,-.205);tail.rotation.z=-.22;tail.raycast=()=>{};
    }
    if(appearance.hair==='braids'){
      oval(materials.hair,0,appearance.hat==='none'?2.985:2.925,-.05,[.225,.125,.205]);
      for(const sign of [-1,1])for(let segment=0;segment<3;segment+=1){const braid=mesh(new THREE.CapsuleGeometry(.025,.13,3,7),materials.hair,sign*(.155+segment*.016),2.76-segment*.13,-.13);braid.rotation.z=-sign*.10;braid.raycast=()=>{};}
    }
    // V201: linha frontal suave e estática (sem RAF, geometria criada uma só vez por cena).
    // Sob boné, a aba já define o contorno, portanto não duplicar a borda.
    if (appearance.hat === 'none' && (appearance.hair === 'short' || appearance.hair === 'fade')) {
      const hairlineShape = new THREE.Shape();
      hairlineShape.moveTo(-.155, 2.946);
      hairlineShape.quadraticCurveTo(-.078, 2.985, 0, 2.965);
      hairlineShape.quadraticCurveTo(.078, 2.985, .155, 2.946);
      hairlineShape.lineTo(.141, 2.925);
      hairlineShape.quadraticCurveTo(0, 2.95, -.141, 2.925);
      hairlineShape.closePath();
      const frontalHairline = mesh(new THREE.ShapeGeometry(hairlineShape), materials.hair, 0, 0, .202);
      frontalHairline.raycast = () => {};
    }
    if(appearance.facialHair==='stubble'){
      const stubble=mesh(new THREE.CylinderGeometry(.124,.072,.10,12),materials.facialHair,0,2.62,.042);stubble.scale.set(1.01,1,.92);stubble.raycast=()=>{};
    }else if(appearance.facialHair==='goatee'){
      oval(materials.facialHair,0,2.603,.197,[.055,.065,.018]).raycast=()=>{};
      const moustache=mesh(new THREE.CapsuleGeometry(.011,.075,3,8),materials.facialHair,0,2.686,.209);moustache.rotation.z=Math.PI/2;moustache.raycast=()=>{};
    }else if(appearance.facialHair==='beard'){
      const beard=mesh(new THREE.CylinderGeometry(.128,.077,.12,12),materials.facialHair,0,2.61,.045);beard.raycast=()=>{};
      oval(materials.facialHair,0,2.574,.085,[.078,.042,.054]).raycast=()=>{};
      const moustache=mesh(new THREE.CapsuleGeometry(.012,.09,3,8),materials.facialHair,0,2.688,.21);moustache.rotation.z=Math.PI/2;moustache.raycast=()=>{};
    }
    if(appearance.earrings!=='none'){
      for(const sign of [-1,1]){
        if(appearance.earrings==='stud') oval(materials.white,sign*.211,2.735,.055,[.012,.012,.009]).raycast=()=>{};
        else if(appearance.earrings==='hoop'){const hoop=mesh(new THREE.TorusGeometry(.025,.005,5,12),materials.white,sign*.215,2.71,.055);hoop.rotation.y=sign*.18;hoop.raycast=()=>{};}
      }
    }
    const neck=limb(.082,.108,.22,materials.skin,0,2.45,-.006);neck.scale.z=.9;
    const shirtShape=new THREE.Shape();shirtShape.moveTo(-.26,0);shirtShape.lineTo(.26,0);shirtShape.lineTo(.29,.5);shirtShape.lineTo(.33,.67);shirtShape.lineTo(.26,.77);shirtShape.lineTo(-.26,.77);shirtShape.lineTo(-.33,.67);shirtShape.lineTo(-.29,.5);shirtShape.closePath();
    const shirtGeometry=new THREE.ExtrudeGeometry(shirtShape,{depth:.34,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1});shirtGeometry.translate(0,0,-.17);
    mesh(shirtGeometry,materials.top,0,1.665,0);
    if(appearance.topStyle==='hoodie'){
      const hood=mesh(new THREE.TorusGeometry(.145,.035,7,20,Math.PI*1.45),materials.top,0,2.43,-.08);hood.rotation.x=Math.PI/2;hood.rotation.z=-Math.PI*.225;hood.raycast=()=>{};
      for(const sign of [-1,1]){const cord=mesh(new THREE.CapsuleGeometry(.004,.18,2,6),materials.shirtDetail,sign*.055,2.27,.19);cord.raycast=()=>{};}
    }
    mesh(softBox(.54,.25,.35),materials.bottom,0,1.535,0);
    // V186: a transição pélvica acompanha o tronco e os shorts; o corpo deixa de parecer
    // dois blocos apoiados um sobre o outro quando observado de lado ou pelas costas.
    const waist=mesh(taperedBox(.49,.535,.145,.34),materials.bottom,0,1.505,.002);waist.raycast=()=>{};
    const waistSeam=mesh(new THREE.BoxGeometry(.515,.018,.355),materials.shirtDetail,0,1.565,.004);waistSeam.raycast=()=>{};
    // V189: planos peitorais, costuras laterais e eixo dorsal dão leitura anatômica ao tronco
    // sem uma malha densa, rig ou loop adicional de renderização.
    for(const sign of [-1,1]){
      const chestPlane=mesh(taperedBox(.185,.21,.175,.016),materials.shirtDetail,sign*.132,2.18,.184);chestPlane.rotation.z=sign*.075;chestPlane.raycast=()=>{};
      const sideSeam=mesh(new THREE.CapsuleGeometry(.004,.32,2,7),materials.shirtDetail,sign*.281,1.98,.008);sideSeam.rotation.z=sign*.025;sideSeam.raycast=()=>{};
    }
    const backSpineSeam=mesh(new THREE.CapsuleGeometry(.004,.39,2,7),materials.shirtDetail,0,2.075,-.184);backSpineSeam.raycast=()=>{};
    const lowerBackPlane=mesh(softBox(.31,.105,.012,.024),materials.shirtDetail,0,1.72,-.181);lowerBackPlane.raycast=()=>{};
    // Collar bones and shoulder caps soften the torso-to-arm transition in every view.
    // V188: the shoulder girdle follows the torso plane instead of two spherical pads.
    const clavicleBridge=mesh(new THREE.CapsuleGeometry(.007,.19,3,9),materials.shirtDetail,0,2.385,.176);clavicleBridge.rotation.z=Math.PI/2;clavicleBridge.raycast=()=>{};
    for(const sign of [-1,1]){
      const collar=mesh(new THREE.CapsuleGeometry(.006,.082,3,8),materials.shirtDetail,sign*.067,2.389,.174);collar.rotation.z=sign*1.02;collar.raycast=()=>{};
      // V207: trapezius planes bridge neck and shoulder so the silhouette reads
      // as one body instead of a head resting on independent shoulder blocks.
      const trapezius=mesh(taperedBox(.064,.092,.135,.026),materials.top,sign*.112,2.405,-.035);trapezius.rotation.z=-sign*.72;trapezius.rotation.x=-.08;trapezius.raycast=()=>{};
      const shoulderCap=mesh(softBox(.235,.205,.27,.072),materials.top,sign*.303,2.315,0);shoulderCap.rotation.z=sign*.16;shoulderCap.raycast=()=>{};
      const deltoidSeam=mesh(new THREE.CapsuleGeometry(.004,.078,2,7),materials.shirtDetail,sign*.305,2.327,.142);deltoidSeam.rotation.z=sign*.42;deltoidSeam.raycast=()=>{};
      const scapulaPlane=mesh(taperedBox(.10,.14,.105,.018),materials.shirtDetail,sign*.178,2.322,-.184);scapulaPlane.rotation.z=sign*.24;scapulaPlane.raycast=()=>{};
    }
    mesh(new THREE.TorusGeometry(.108,.012,6,24),materials.dark,0,2.43,0).rotation.x=Math.PI/2;
    mesh(new THREE.BoxGeometry(.014,.31,.009),materials.dark,0,1.44,.19);
    for(const sign of [-1,1]) {
      mesh(new THREE.BoxGeometry(.11,.012,.014),materials.white,sign*.15,.20,.28);
      mesh(new THREE.BoxGeometry(.10,.012,.014),materials.white,sign*.15,.235,.26);
    }
    const layout=avatarLayout(devices);
    const phoneArmSign=layout.phoneSide==="right"?-1:1;
    for (const sign of [-1,1]) {
      const holdsPhone=sign===phoneArmSign;
      // V195: postura assimétrica discreta integra ombro, antebraço e pegada sem
      // adicionar malhas, rig ou animação contínua ao renderer sob demanda.
      const sleeveMaterial=appearance.topStyle==='tank'?materials.skin:materials.top;
      const sleeve=limb(appearance.topStyle==='tank'?.095:.112,appearance.topStyle==='tank'?.09:.1,appearance.topStyle==='tank'?.16:.27,sleeveMaterial,sign*.337,appearance.topStyle==='tank'?2.29:2.25,0,sign*(holdsPhone?.10:.14));sleeve.scale.z=1.08;
      const upperArm=limb(.09,.082,.36,materials.skin,sign*(holdsPhone?.382:.39),2.005,holdsPhone?.012:0,sign*(holdsPhone?.09:.13));upperArm.raycast=()=>{};
      // V185: articulações facetadas preservam mobilidade visual sem o efeito de “bolinhas” entre os membros.
      const elbow=mesh(softBox(.137,.126,.13,.047),materials.skin,sign*.418,1.815,.002);elbow.rotation.z=sign*.08;elbow.raycast=()=>{};
      const elbowContour=mesh(new THREE.CapsuleGeometry(.005,.045,2,7),materials.skinShade,sign*.418,1.81,.071);elbowContour.rotation.z=Math.PI/2;elbowContour.raycast=()=>{};
      const forearm=limb(.081,.068,.35,materials.skin,sign*(holdsPhone?.438:.454),1.64,holdsPhone?.035:.008,sign*(holdsPhone?.11:.08));forearm.raycast=()=>{};
      // V187: punho facetado e transição dorsal unem antebraço e mão sem a antiga esfera solta.
      const wrist=mesh(softBox(.126,.105,.12,.032),materials.skin,sign*(holdsPhone?.458:.469),1.475,holdsPhone?.026:.014);wrist.rotation.z=sign*(holdsPhone?.105:.055);wrist.raycast=()=>{};
      const wristContour=mesh(new THREE.CapsuleGeometry(.004,.052,2,7),materials.skinShade,sign*(holdsPhone?.458:.469),1.469,holdsPhone?.09:.078);wristContour.rotation.z=Math.PI/2;wristContour.raycast=()=>{};
      // A mão do celular usa uma única palma atrás do aparelho; a outra mantém os dedos relaxados.
      const palm=mesh(softBox(holdsPhone?.138:.145,holdsPhone?.205:.19,.13,.035),materials.skin,sign*(holdsPhone?.478:.49),1.395,holdsPhone?.052:.018);
      palm.rotation.z=holdsPhone?sign*.115:0;
      const palmContour=mesh(new THREE.CapsuleGeometry(.004,.052,2,7),materials.skinShade,sign*.49,1.398,holdsPhone?.121:.088);palmContour.rotation.z=Math.PI/2;palmContour.raycast=()=>{};
      if(!holdsPhone){const thumb=mesh(new THREE.CapsuleGeometry(.026,.075,3,7),materials.skin,sign*.445,1.49,.075);thumb.rotation.z=sign*.78;thumb.raycast=()=>{};}
      // Four articulated silhouettes make both hands readable from the front
      // without multiplying draw calls into a realistic hand rig.
      for(let fingerIndex=0;!holdsPhone&&fingerIndex<4;fingerIndex+=1){
        const finger=mesh(new THREE.CapsuleGeometry(.015,.071-fingerIndex*.004,3,6),materials.skin,sign*(.456+fingerIndex*.023),1.318,.067);
        finger.rotation.z=sign*(.03+fingerIndex*.025);finger.raycast=()=>{};
        const nail=mesh(new THREE.CapsuleGeometry(.0045,.018-fingerIndex*.001,2,6),materials.white,sign*(.456+fingerIndex*.023),1.287+fingerIndex*.001,.079);
        nail.rotation.z=sign*(.03+fingerIndex*.025);nail.scale.x=.62;nail.raycast=()=>{};
      }
      for(let knuckleIndex=0;!holdsPhone&&knuckleIndex<3;knuckleIndex+=1)oval(materials.skin,sign*(.462+knuckleIndex*.027),1.356,.087,[.017,.014,.016]).raycast=()=>{};
      const stance=sign*.008;
      const shorts=mesh(softBox(.275,.34,.315,.028),materials.bottom,sign*.15,1.305,0);shorts.rotation.z=-stance;shorts.raycast=()=>{};
      const thigh=limb(.116,.102,.43,materials.skin,sign*.153,1.02,0,-stance);thigh.raycast=()=>{};
      const knee=mesh(taperedBox(.162,.178,.155,.145),materials.skin,sign*.155,.79,.012);knee.rotation.z=stance;knee.raycast=()=>{};
      const patella=mesh(softBox(.086,.098,.018,.032),materials.skinShade,sign*.155,.79,.092);patella.rotation.z=stance;patella.raycast=()=>{};
      const calf=limb(.102,.079,.43,materials.skin,sign*.158,.55,.004,stance);calf.raycast=()=>{};
      // V190: coxa, joelho e panturrilha passam a ter planos contínuos em vez de cilindros
      // isolados; são detalhes estáticos e preservam o renderer sob demanda.
      const thighPlane=mesh(taperedBox(.105,.128,.255,.018),materials.skinShade,sign*.153,1.025,.108);thighPlane.rotation.z=-sign*.026;thighPlane.raycast=()=>{};
      const kneeBridge=mesh(new THREE.CapsuleGeometry(.005,.055,2,7),materials.skinShade,sign*.155,.777,.098);kneeBridge.rotation.z=Math.PI/2+stance;kneeBridge.raycast=()=>{};
      const calfPlane=mesh(taperedBox(.072,.092,.245,.015),materials.skinShade,sign*.158,.565,.083);calfPlane.rotation.z=sign*.026;calfPlane.raycast=()=>{};
      oval(materials.skin,sign*.16,.37,.01,[.083,.105,.081]).raycast=()=>{};
      const ankle=limb(.076,.086,.14,materials.skin,sign*.16,.285,.018,stance);ankle.raycast=()=>{};
      const ankleContour=mesh(taperedBox(.135,.16,.075,.145),materials.skin,sign*.16,.245,.026);ankleContour.rotation.z=stance;ankleContour.raycast=()=>{};
      // V221: olhos de baixo relevo, integrados às pálpebras. Nenhuma esfera salta
      // da frente do rosto. Íris/pupila reutilizam a expressividade V208.
      const sclera=oval(materials.eyeWhite,sign*.083,2.82,.215,[.036,.012,.009]);sclera.raycast=()=>{};
      oval(materials.iris,sign*.083,2.819,.224,[.012,.011,.004]).raycast=()=>{};
      const pupil=oval(materials.dark,sign*.083,2.819,.229,[.005,.006,.0025]);pupil.raycast=()=>{};
      expressionEyes.push({object:pupil,restY:pupil.position.y}); expressionEyeScaleY.set(pupil,pupil.scale.y);
      // V245: ambos os reflexos recebem a mesma direção de luz do key light.
      // Espelhar o ponto dentro de cada olho deixava o olhar sintético; manter o
      // deslocamento global também conserva a escala microscópica segura da V243.
      const highlight=oval(materials.eyeHighlight,sign*.083-.003,2.824,.232,[.0016,.0016,.0011]);highlight.raycast=()=>{};expressionHighlights.push({object:highlight,restY:highlight.position.y});expressionHighlightScale.set(highlight,highlight.scale.clone());
    }
    // V204: o plano central continua o dorso já existente sem sobrepor outro oval.
    // Isso reduz o nariz bulboso visto de frente e ainda economiza segmentos esféricos.
    const noseContour=mesh(taperedBox(.018,.027,.061,.017),materials.skin,0,2.758,.216);noseContour.rotation.x=.04;noseContour.raycast=()=>{};
    // V155: cosmetic accessories follow head/body geometry, not medical-device records.
    // They do not receive raycast actions and never alter clinical markers.
    if (appearance.hat !== "none") {
      const crown=mesh(new THREE.SphereGeometry(.246,28,16,0,Math.PI*2,0,Math.PI/2),materials.cap,0,2.98,-.01,[1,.75,.93]);
      crown.raycast=()=>{};
      const crownFront=mesh(softBox(.266,.09,.016,.029),materials.cap,0,3.031,.174);crownFront.rotation.x=-.11;crownFront.raycast=()=>{};
      const capButton=mesh(new THREE.SphereGeometry(.018,10,6),materials.white,0,3.165,-.012);capButton.raycast=()=>{};
      const crownSide=mesh(new THREE.CylinderGeometry(.225,.244,.12,18,1,true),materials.cap,0,3.012,-.008);crownSide.raycast=()=>{};
      // V205: a faixa inferior assenta a copa sobre a cabeça e os painéis frontais
      // quebram a leitura de meia esfera. São peças estáticas, sem custo por quadro.
      const capBand=mesh(new THREE.CylinderGeometry(.232,.238,.034,22,1,true),materials.capShade,0,2.967,-.006);capBand.raycast=()=>{};
      // V232 FACE SAFETY: retira duas placas frontais finas que podem projetar
      // artefatos verticais no rosto no WebGL móvel; copa/aba são preservadas.
      // V197: copa e aba continuam legíveis de frente, mas ficam contidas na largura
      // do rosto para não formar as antigas faixas flutuantes sobre os óculos.
      const brim=mesh(taperedBox(appearance.hat==="flat"?.258:.246,appearance.hat==="flat"?.292:.278,.017,.158),materials.cap,0,2.987,.198);
      brim.rotation.x=appearance.hat==="baseball"?-.19:-.085;
      brim.raycast=()=>{};
      const underBrim=mesh(taperedBox(.232,appearance.hat==="flat"?.272:.258,.004,.143),materials.dark,0,2.975,.2);underBrim.rotation.x=brim.rotation.x;underBrim.raycast=()=>{};
      // A costura acompanha a aba acima dos óculos, sem duas barras de alto contraste diante dos olhos.
      const brimEdge=mesh(new THREE.BoxGeometry(appearance.hat==="flat"?.24:.23,.003,.006),materials.capShade,0,3.002,.253);brimEdge.rotation.x=brim.rotation.x;brimEdge.raycast=()=>{};
      const brimStitch=mesh(new THREE.TorusGeometry(.085,.0014,4,24,Math.PI),materials.capShade,0,3.016,.204);brimStitch.rotation.x=Math.PI/2;brimStitch.rotation.z=Math.PI;brimStitch.raycast=()=>{};
      const seam=mesh(new THREE.TorusGeometry(.239,.003,4,30,Math.PI),materials.white,0,2.984,-.012);
      seam.rotation.x=Math.PI/2;seam.raycast=()=>{};
      if(appearance.hatBrand==="nike" || appearance.hatBrand==="new-era") {
        const badge=mesh(appearance.hatBrand==="nike"?new THREE.CapsuleGeometry(.008,.07,3,8):new THREE.BoxGeometry(.091,.034,.008),materials.white,0,3.075,.202);
        if(appearance.hatBrand==="nike")badge.rotation.z=-1.18;
        badge.raycast=()=>{};
        if(appearance.hatBrand==="new-era"){
          const line=mesh(new THREE.BoxGeometry(.047,.008,.01),materials.cap,0,3.075,.209);line.raycast=()=>{};
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
        // V232 FACE SAFETY: aro plano com recorte, sem extrusão de alta razão de aspecto.
        const frameGeometry = rectangular ? new THREE.ShapeGeometry(outline,4) : new THREE.TorusGeometry(.070,.009,7,24);
        const ring=mesh(frameGeometry,materials.glasses,x,y,z);
        ring.raycast=()=>{};
        // V199: hastes afuniladas acompanham a lateral do crânio e chegam à nova
        // orelha planar; continuam sendo uma malha estática por lado.
        const temple=mesh(taperedBox(.011,.008,.012,.148),materials.glasses,side*.166,y-.003,.19);
        temple.rotation.y=side*.075;temple.rotation.x=-.035;temple.raycast=()=>{};
        const earHook=mesh(new THREE.CapsuleGeometry(.0045,.035,2,6),materials.glasses,side*.199,y-.018,.113);earHook.rotation.x=.38;earHook.rotation.z=side*.08;earHook.raycast=()=>{};
        const nosePad=mesh(softBox(.008,.016,.006,.003),materials.glasses,side*.026,y-.018,.268);nosePad.rotation.z=side*.18;nosePad.raycast=()=>{};
      }
      const bridge=mesh(taperedBox(.022,.018,.01,.014),materials.glasses,0,2.831,.263);bridge.raycast=()=>{};
      const lensMaterial=new THREE.MeshPhysicalMaterial({color:0xb7e6fa,transparent:true,opacity:.075,roughness:.2,metalness:.02,depthWrite:false});
      for(const side of [-1,1]){
        const lens=appearance.glasses==="rectangular"
          ? mesh(softBox(.116,.058,.004,.008),lensMaterial,side*.082,2.825,.254)
          : oval(lensMaterial,side*.082,2.825,.254,[.055,.055,.003]);
        lens.raycast=()=>{};
      }
    }
    for(const side of [-1,1]) {
      const x=side*.16;
      // V196: o mesmo orçamento de meshes agora forma um tênis mais estreito no
      // calcanhar e mais orgânico na ponta, reduzindo a antiga silhueta de bloco.
      const sole=mesh(taperedBox(.218,.286,.034,.445),materials.white,x,.127,.075);sole.raycast=()=>{};
      const outsole=mesh(taperedBox(.224,.292,.014,.458),materials.dark,x,.106,.073);outsole.raycast=()=>{};
      const shoe=mesh(taperedBox(.205,.264,.108,.398),materials.sneakers,x,.192,.088);shoe.raycast=()=>{};
      shoe.rotation.x=-.035;shoe.rotation.y=-side*.035;
      const vamp=mesh(softBox(.19,.043,.215,.019),materials.sneakers,x,.238,.22);vamp.rotation.x=-.16;vamp.raycast=()=>{};
      const toe=oval(materials.sneakers,x,.187,.28,[.128,.057,.14]);toe.raycast=()=>{};
      const toeTop=mesh(taperedBox(.10,.165,.019,.16),materials.white,x,.235,.258);toeTop.rotation.x=-.16;toeTop.raycast=()=>{};
      const toeGuard=mesh(new THREE.CapsuleGeometry(.014,.19,3,10),materials.white,x,.153,.423);toeGuard.rotation.z=Math.PI/2;toeGuard.raycast=()=>{};
      // V191: linhas de construção suavizam a leitura frontal, lateral e traseira do tênis
      // sem animação contínua ou geometria de alta densidade.
      const toeSeam=mesh(new THREE.TorusGeometry(.095,.003,4,18,Math.PI),materials.dark,x,.205,.337);toeSeam.rotation.x=Math.PI/2;toeSeam.rotation.z=Math.PI;toeSeam.raycast=()=>{};
      const tongue=mesh(softBox(.13,.12,.025,.012),materials.sneakers,x,.245,.275);tongue.rotation.x=-.22;tongue.raycast=()=>{};
      const heel=mesh(softBox(.205,.105,.055,.024),materials.dark,x,.205,-.145);heel.raycast=()=>{};
      const heelCounter=mesh(softBox(.185,.105,.095,.026),materials.sneakers,x,.245,-.105);heelCounter.rotation.x=.04;heelCounter.raycast=()=>{};
      const heelStabilizer=mesh(new THREE.CapsuleGeometry(.005,.115,2,7),materials.white,x,.214,-.158);heelStabilizer.rotation.z=Math.PI/2;heelStabilizer.raycast=()=>{};
      const quarter=mesh(taperedBox(.15,.205,.075,.19),materials.dark,x,.205,.12);quarter.rotation.x=-.18;quarter.raycast=()=>{};
      const sidePanel=mesh(taperedBox(.052,.145,.055,.012),materials.white,x+side*.077,.224,.105);sidePanel.rotation.z=-side*.24;sidePanel.raycast=()=>{};
      const collar=mesh(new THREE.TorusGeometry(.078,.012,6,18,Math.PI),materials.dark,x,.282,.12);collar.rotation.x=Math.PI/2;collar.rotation.z=Math.PI;collar.raycast=()=>{};
      for(let j=0;j<4;j++){const lace=mesh(new THREE.BoxGeometry(.082-j*.006,.006,.009),materials.white,x,.237-j*.017,.326);lace.rotation.z=(j%2?1:-1)*.12;lace.raycast=()=>{};for(const eyeletSide of [-1,1])oval(materials.white,x+eyeletSide*.052,.237-j*.017,.322,[.007,.007,.004]).raycast=()=>{};}
      if(appearance.sneakers==="high-top"){
        const high=mesh(taperedBox(.17,.19,.135,.205),materials.sneakers,x,.285,.055);high.rotation.x=-.025;high.raycast=()=>{};
        const highCollar=mesh(new THREE.TorusGeometry(.066,.009,6,16,Math.PI),materials.dark,x,.352,.055);highCollar.rotation.x=Math.PI/2;highCollar.rotation.z=Math.PI;highCollar.raycast=()=>{};
      }
      if(appearance.sneakers==="runner"){
        const stripe=mesh(new THREE.BoxGeometry(.099,.017,.009),materials.white,x,.22,.327);stripe.raycast=()=>{};
      }
    }
    // V200: o centro facial ganha filtro labial e lábio inferior afunilado. A expressão
    // continua alterando malhas estáticas, sem introduzir animação ou trabalho por quadro.
    const philtrum=mesh(taperedBox(.011,.019,.026,.006),materials.skinShade,0,2.68,.235);philtrum.raycast=()=>{};
    const mouth=mesh(new THREE.TorusGeometry(.042,.0045,5,18,Math.PI),materials.dark,0,2.647,.242);mouth.rotation.z=Math.PI;mouth.scale.y=.62;
    const neutralMouth=mesh(softBox(.061,.006,.004,.003),materials.dark,0,2.647,.247);
    const lowerLip=mesh(taperedBox(.023,.052,.008,.006),materials.skinShade,0,2.63,.242);lowerLip.raycast=()=>{};
    // V242: volume labial curto acompanha a expressão sem parecer uma barra colada
    // ao rosto. O arco escuro continua sendo a boca; o tom é apenas profundidade.
    const lipTint=oval(materials.lips,0,2.642,.247,[.041,.006,.004]);lipTint.raycast=()=>{};
    const setExpression=(value:AvatarBodyContext['expression'])=>{
      // Postura sutil e estática, derivada apenas do humor explicitamente
      // registrado. Não cria animação contínua nem traduz prioridade clínica.
      model.rotation.z=value==="reflective"?.006:value==="happy"?-.003:0;
      model.position.y=value==="reflective"?-.008:value==="happy"?.005:0;
      mouth.visible=value!=="neutral";neutralMouth.visible=value==="neutral";
      mouth.rotation.z=value==="reflective"?0:Math.PI;mouth.position.y=value==="reflective"?2.61:2.647;
      lowerLip.visible=value==="neutral";
      for(const {object,sign} of expressionBrows){
        object.rotation.z=value==="happy"?-sign*.17:value==="reflective"?sign*.04:-sign*.10;
        object.position.y=value==="happy"?2.868:value==="reflective"?2.854:2.861;
      }
      // V234: a escala é relativa à malha original (.012). Substituir por 1
      // criava duas hastes gigantes atravessando olhos, boné e tronco.
      for(const {object,sign} of expressionLids){
        object.rotation.z=sign*(value==="happy"?.045:.025);
        object.scale.y=(expressionLidScaleY.get(object) ?? object.scale.y)*(value==="reflective"?.72:value==="happy"?.84:1);
      }
      // V234: preserva o tamanho microscópico da pupila (.006) em todas as expressões.
      for(const {object,restY} of expressionEyes){
        object.position.y=restY+(value==="happy"?.002:value==="reflective"?-.004:0);
        object.scale.y=(expressionEyeScaleY.get(object) ?? object.scale.y)*(value==="reflective"?.88:1);
      }
      // V272: a expressão é relativa à escala microscópica original.
      // Substituí-la por 1 transformava a esfera-base numa bolha gigante no PWA.
      for(const {object,restY} of expressionHighlights){
        object.position.y=restY+(value==="happy"?.0015:value==="reflective"?-.001:0);
        const base=expressionHighlightScale.get(object);
        if(base)object.scale.copy(base).multiplyScalar(value==="reflective"?.82:1);
      }
    };
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
    // Phone texture is local. The Brain is geometry so it remains crisp and legible
    // without a circular badge or a downloaded asset.
    const textures: THREE.Texture[]=[];
    const label=(title:string,subtitle:string)=>{
      const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
      const c=canvas.getContext("2d");
      if(c){c.fillStyle="#0b1520";c.fillRect(0,0,256,256);c.strokeStyle="#c4b5fd";c.lineWidth=5;c.strokeRect(12,12,232,232);c.fillStyle="#c4b5fd";c.font="bold 90px sans-serif";c.textAlign="center";c.lineCap="round";c.lineJoin="round";c.beginPath();c.moveTo(128,42);c.bezierCurveTo(96,26,78,47,83,63);c.bezierCurveTo(52,70,66,106,84,110);c.bezierCurveTo(94,137,118,119,128,109);c.moveTo(128,42);c.bezierCurveTo(160,26,178,47,173,63);c.bezierCurveTo(204,70,190,106,172,110);c.bezierCurveTo(162,137,138,119,128,109);c.moveTo(128,42);c.lineTo(128,109);c.moveTo(96,62);c.bezierCurveTo(107,70,106,87,90,92);c.moveTo(160,62);c.bezierCurveTo(149,70,150,87,166,92);c.stroke();c.fillStyle="#f1f5f9";c.font="bold 36px sans-serif";c.fillText(title,128,172);c.font="20px sans-serif";c.fillStyle="#c4b5fd";c.fillText(subtitle,128,212);}
      const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return new THREE.MeshBasicMaterial({map:t});
    };
    const brainPanelMaterial=new THREE.MeshStandardMaterial({color:0x0b1520,metalness:.36,roughness:.42});
    const brainPanel=mesh(softBox(.27,.24,.025,.018),brainPanelMaterial,0,2.14,.229);brainPanel.userData.action="brain";
    const signalMaterial=new THREE.MeshStandardMaterial({color:avatarAttentionColor(attentionRef.current),emissive:avatarAttentionColor(attentionRef.current),emissiveIntensity:.35,metalness:.3,roughness:.4});
    const signalRing=new THREE.Group();model.add(signalRing);
    const brainLeds:THREE.Mesh[]=[];
    // V232 FACE SAFETY: sem rails adicionais. Painel, LEDs e glifo preservados.
    // Três LEDs geométricos discretos: indicador abstrato, nunca dado clínico inventado.
    const brainLedGeometry=new THREE.SphereGeometry(.008,8,6);
    for(const x of [-.042,0,.042]){
      const led=mesh(brainLedGeometry,signalMaterial,x,2.265,.261);
      led.userData.action="brain";
      brainLeds.push(led);
      signalRing.add(led);
    }
    // V223: sinais circulares discretos no painel Brain. A cor continua
    // vindo da prioridade real dos registros; nenhuma leitura é inventada.
    for(const x of [-.102,.102]){
      const dot=mesh(new THREE.SphereGeometry(.011,8,6),signalMaterial,x,2.14,.255);
      dot.userData.action="brain";signalRing.add(dot);
    }
    const brainGlyph=new THREE.Group();model.add(brainGlyph);
    for(const [x,y,w,h] of [[-.052,2.198,.073,.018],[.052,2.198,.073,.018],[-.069,2.145,.052,.018],[.069,2.145,.052,.018],[-.052,2.092,.073,.018],[.052,2.092,.073,.018],[0,2.145,.014,.146]]){
      const segment=mesh(softBox(w,h,.014,.004),signalMaterial,x,y,.249);segment.userData.action="brain";brainGlyph.add(segment);
    }

    // V225: bounded attention brightness; lower idle emission, no new geometry
    // or animation loop. Context changes still trigger only the existing draw().
    const setAttention=(rank:number)=>{const level=Number.isFinite(rank)?Math.max(0,Math.min(4,Math.floor(rank))):0;const color=avatarAttentionColor(level);signalMaterial.color.set(color);signalMaterial.emissive.set(color);signalMaterial.emissiveIntensity=level===0?.14:Math.min(.61,.25+.09*level);signalRing.visible=level>0;const visibleLeds=Math.min(3,Math.max(1,level));brainLeds.forEach((led,index)=>{led.visible=index<visibleLeds;});};
    setAttention(attentionRef.current);
    const backBadge=mesh(softBox(.22,.18,.018,.015),brainPanelMaterial,0,2.16,-.229);backBadge.rotation.y=Math.PI;backBadge.userData.action="brain";
    const braces=avatarBraceSlots(devices);
    for(const device of braces){const x=device.side==="right"?-.50:.50;const fabric=new THREE.MeshStandardMaterial({color:avatarColor(device.color,"#7dd3fc"),roughness:.9});const brace=mesh(new THREE.CylinderGeometry(.122,.118,.26,16),fabric,x,1.65,.012);brace.rotation.z=device.side==="right"?-.17:.17;for(const y of [1.57,1.72])mesh(new THREE.BoxGeometry(.23,.018,.018),materials.dark,x,y,.131);const pick=mesh(new THREE.BoxGeometry(.28,.26,.36),hitMaterial,x,1.65,.025);pick.userData.action="device";pick.userData.deviceId=device.id;}
    for (const slot of layout.slots) {
      const watchY=braces.some(d=>d.side===slot.side)?1.99:1.61;
      const x=(slot.side==='right'?-1:1)*(watchY>1.61&&slot.kind==='watch'?.43:.50);
      const targetMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
      const target=mesh(new THREE.BoxGeometry(slot.kind==="watch"?.32:.16,slot.kind==="watch"?.26:.14,.08),targetMaterial,x,slot.kind==="watch"?watchY:1.43,.15);target.userData.action="device";target.userData.deviceId=slot.device.id;
      const metal=new THREE.MeshStandardMaterial({color:avatarColor(slot.device.color,"#94a3b8"),metalness:.45,roughness:.32});
      if(slot.kind==="watch"){
        const reference=watchModelByName(slot.device.name), shape=reference?.shape || 'round';
        const width=shape==='band'?.105:shape==='ultra'?.185:.16, height=shape==='band'?.21:.17;
        const titanium=new THREE.MeshStandardMaterial({color:shape==='ultra'?'#b9b8b3':avatarColor(slot.device.color,'#94a3b8'),metalness:.65,roughness:.3});
        // Strap follows the front of the arm. The display sits on the case,
        // instead of floating ahead of a strap buried inside the forearm.
        const strapWidth=shape==='band'?.078:shape==='ultra'?.14:.115;
        const strap=mesh(softBox(strapWidth,.285,.025,.016),metal,x,watchY,.112);strap.raycast=()=>{};
        // Two recessed strap channels keep the accessory attached to the wrist
        // without the old appearance of a flat plate floating over the arm.
        for(const offset of [-.09,.09]){const strapChannel=mesh(softBox(strapWidth*.72,.018,.006,.004),materials.dark,x,watchY+offset,.128);strapChannel.raycast=()=>{};}
        // V343: lugs visually connect case and strap; no animation or extra listener.
        for(const side of [-1,1])for(const vertical of [-1,1]){const lug=mesh(softBox(.026,.038,.025,.008),titanium,x+side*(width*.42),watchY+vertical*(height*.43),.137);lug.raycast=()=>{};}
        if(shape==='round'){
          const caseMesh=mesh(new THREE.CylinderGeometry(.086,.086,.055,24),titanium,x,watchY,.15);caseMesh.rotation.x=Math.PI/2;
        }else{
          const outline=new THREE.Shape(),w=width/2,h=height/2,r=.026;
          outline.moveTo(-w+r,-h);outline.lineTo(w-r,-h);outline.quadraticCurveTo(w,-h,w,-h+r);outline.lineTo(w,h-r);outline.quadraticCurveTo(w,h,w-r,h);outline.lineTo(-w+r,h);outline.quadraticCurveTo(-w,h,-w,h-r);outline.lineTo(-w,-h+r);outline.quadraticCurveTo(-w,-h,-w+r,-h);
          mesh(new THREE.ExtrudeGeometry(outline,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.004}),titanium,x,watchY,.137);
        }
        // Ultra has a rectangular display; only round cases receive a dial.
        const roundFace=shape==='round';
        const faceDepth=roundFace?.181:.177;
        mesh(roundFace?new THREE.CircleGeometry(.068,24):new THREE.PlaneGeometry(width*.75,height*.75),materials.dark,x,watchY,faceDepth);
        // V238: mostrador neutro com proporção de relógio real. Os ponteiros
        // são apenas representação visual e não afirmam horário ou medida.
        if(roundFace){
          const dial=mesh(new THREE.RingGeometry(.052,.057,28),materials.watchAccent,x,watchY,faceDepth+.006);dial.raycast=()=>{};
          const hour=mesh(new THREE.BoxGeometry(.006,.034,.003),materials.white,x-.008,watchY+.009,faceDepth+.009);hour.rotation.z=-.52;hour.raycast=()=>{};
          const minute=mesh(new THREE.BoxGeometry(.005,.047,.003),materials.watchAccent,x+.011,watchY+.012,faceDepth+.01);minute.rotation.z=.68;minute.raycast=()=>{};
          oval(materials.white,x,watchY,faceDepth+.012,[.006,.006,.002]).raycast=()=>{};
        }else{
          const hour=mesh(new THREE.BoxGeometry(.005,.032,.003),materials.white,x-.007,watchY+.007,faceDepth+.008);hour.rotation.z=-.45;hour.raycast=()=>{};
          const minute=mesh(new THREE.BoxGeometry(.004,.043,.003),materials.watchAccent,x+.009,watchY+.011,faceDepth+.009);minute.rotation.z=.62;minute.raycast=()=>{};
          const statusDot=mesh(new THREE.CircleGeometry(.0045,12),materials.watchAccent,x+.028,watchY-.029,faceDepth+.008);statusDot.raycast=()=>{};
        }
        // V342: reflexo estático sugere vidro sem manter renderização contínua.
        const watchGlass=mesh(roundFace?new THREE.CircleGeometry(.064,24):new THREE.PlaneGeometry(width*.68,height*.68),materials.glass,x-.016,watchY+.024,faceDepth+.014);watchGlass.rotation.z=-.28;watchGlass.scale.y=.22;watchGlass.raycast=()=>{};
        const crown=new THREE.MeshStandardMaterial({color:shape==='ultra'?'#fb923c':'#94a3b8',metalness:.45,roughness:.3});
        const crownMesh=mesh(new THREE.CylinderGeometry(.014,.014,.028,12),crown,x+width/2+.006,watchY,.155);crownMesh.rotation.x=Math.PI/2;
      }else{
        const ring=mesh(new THREE.TorusGeometry(.042,.012,8,24),metal,x,1.43,.008);ring.rotation.x=Math.PI/2;
      }
    }
    const phoneX=layout.phoneSide==="right"?-.486:.486;
    const gripSign=Math.sign(phoneX)||1;
    const phoneAngle=layout.phoneSide==="right"?-.10:.10;
    const phone=mesh(softBox(.17,.3,.035,.015),materials.dark,phoneX,1.39,.095);phone.rotation.z=phoneAngle;
    // A moldura acompanha a face do aparelho. Atrás da caixa ela desaparecia;
    // o visor fica à frente e a palma continua atrás, sem dedos sobre a tela.
    const phoneRim=mesh(softBox(.181,.311,.012,.019),materials.white,phoneX,1.39,.119);phoneRim.rotation.z=phoneAngle;phoneRim.raycast=()=>{};
    const phoneSideButton=mesh(softBox(.008,.058,.012,.004),materials.white,phoneX+gripSign*.094,1.425,.111);phoneSideButton.rotation.z=phoneAngle;phoneSideButton.raycast=()=>{};
    const screen=mesh(new THREE.PlaneGeometry(.14,.24),label("VAULT",""),phoneX,1.39,.128);screen.rotation.z=phoneAngle;screen.userData.action="brain";
    const phoneGlass=mesh(new THREE.PlaneGeometry(.125,.218),materials.glass,phoneX-.018,1.414,.132);phoneGlass.rotation.z=phoneAngle-.08;phoneGlass.scale.x=.24;phoneGlass.raycast=()=>{};
    const speaker=mesh(new THREE.CapsuleGeometry(.003,.025,2,6),materials.white,phoneX,1.493,.132);speaker.rotation.z=Math.PI/2+phoneAngle;speaker.raycast=()=>{};
    const screenDot=mesh(new THREE.CircleGeometry(.004,10),materials.watchAccent,phoneX+.035,1.493,.133);screenDot.raycast=()=>{};
    // The thenar pad and side contact make the device rest inside the hand instead of floating beside it.
    const phoneGripPad=mesh(taperedBox(.075,.095,.145,.052),materials.skin,phoneX-gripSign*.054,1.376,.065);phoneGripPad.rotation.z=phoneAngle+gripSign*.08;phoneGripPad.raycast=()=>{};
    const phoneSideContact=mesh(new THREE.CapsuleGeometry(.014,.13,3,7),materials.skin,phoneX+gripSign*.095,1.382,.084);phoneSideContact.rotation.z=phoneAngle;phoneSideContact.raycast=()=>{};
    const phonePalmFold=mesh(new THREE.CapsuleGeometry(.0035,.052,2,7),materials.skinShade,phoneX-gripSign*.073,1.365,.088);phonePalmFold.rotation.z=gripSign*.36+phoneAngle;phonePalmFold.raycast=()=>{};
    // V183: the dedicated grip replaces the generic fingers on this hand, avoiding an eight-finger overlap.
    for(let fingerIndex=0;fingerIndex<4;fingerIndex+=1){
      // A ponta fica atrás da moldura: a mão segura o aparelho sem cobrir o visor.
      const finger=mesh(new THREE.CapsuleGeometry(.009,.030-fingerIndex*.0015,3,6),materials.skin,phoneX+gripSign*.104,1.326+fingerIndex*.041,.066);
      finger.rotation.z=Math.PI/2+phoneAngle;finger.rotation.y=gripSign*.12;finger.raycast=()=>{};
    }
    const phoneThumb=mesh(new THREE.CapsuleGeometry(.012,.050,3,7),materials.skin,phoneX-gripSign*.099,1.408,.07);phoneThumb.rotation.z=gripSign*.48+phoneAngle;phoneThumb.rotation.y=-gripSign*.08;phoneThumb.raycast=()=>{};
    const thumbNail=mesh(new THREE.CapsuleGeometry(.004,.017,2,6),materials.white,phoneX-gripSign*.105,1.421,.079);thumbNail.rotation.z=gripSign*.48+phoneAngle;thumbNail.scale.x=.58;thumbNail.raycast=()=>{};
    const gripKnuckle=mesh(new THREE.CapsuleGeometry(.004,.098,2,7),materials.skinShade,phoneX+gripSign*.101,1.388,.092);gripKnuckle.rotation.z=phoneAngle;gripKnuckle.raycast=()=>{};
    const phoneCamera=mesh(new THREE.CylinderGeometry(.017,.017,.008,12),materials.dark,phoneX-gripSign*.048,1.485,.073);phoneCamera.rotation.x=Math.PI/2;phoneCamera.raycast=()=>{};
    const shadowCanvas=document.createElement("canvas");shadowCanvas.width=128;shadowCanvas.height=128;
    const shadowContext=shadowCanvas.getContext("2d");
    if(shadowContext){const gradient=shadowContext.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,"rgba(0,0,0,.4)");gradient.addColorStop(1,"rgba(0,0,0,0)");shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);}
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas);textures.push(shadowTexture);
    mesh(new THREE.PlaneGeometry(1.25,.85),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}),0,.035,.06).rotation.x=-Math.PI/2;
    let disposed=false, visible=true, frame=0;
    let transition:{from:number;to:number;start:number}|null=null;
    let cameraTransition:{fromY:number;fromDistance:number;toY:number;toDistance:number;start:number}|null=null;
    const draw=()=>{if(disposed||!visible||document.hidden||frame)return;frame=requestAnimationFrame(now=>{
      frame=0;if(disposed||!visible||document.hidden)return;
      if(transition){const progress=Math.min(1,(now-transition.start)/220),ease=1-Math.pow(1-progress,3);model.rotation.y=transition.from+(transition.to-transition.from)*ease;if(progress>=1)transition=null;}
      if(cameraTransition){const progress=Math.min(1,(now-cameraTransition.start)/260),ease=1-Math.pow(1-progress,3);camera.position.y=cameraTransition.fromY+(cameraTransition.toY-cameraTransition.fromY)*ease;camera.position.z=cameraTransition.fromDistance+(cameraTransition.toDistance-cameraTransition.fromDistance)*ease;camera.lookAt(0,camera.position.y,0);if(progress>=1)cameraTransition=null;}
      renderer.render(scene,camera);if(transition||cameraTransition)draw();
    });};
    const setDragging=(dragging:boolean)=>{const ratio=avatarAdaptiveRatio(displayRatio,element.clientWidth,element.clientHeight,dragging,compactRef.current,constrainedDevice);if(renderer.getPixelRatio()!==ratio){renderer.setPixelRatio(ratio);renderer.setSize(element.clientWidth,element.clientHeight||340);}};
    const resize=()=>{const width=element.clientWidth;if(!width)return;const height=element.clientHeight||340;const ratio=avatarAdaptiveRatio(displayRatio,width,height,false,compactRef.current,constrainedDevice);if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();draw();};
    setMarkers(markersRef.current);
    controller.current={preview:()=>{
      // Snap back to the full-body/front presentation before revealing the card.
      // Do not animate a face/shoes camera transition underneath compact UI.
      transition=null;cameraTransition=null;model.rotation.y=0;camera.zoom=1;
      camera.updateProjectionMatrix();const standard=avatarCameraFrame('body');
      camera.position.set(0,standard.height,standard.distance);
      camera.lookAt(0,standard.height,0);draw();
    },viewport:small=>{
      const ratio=avatarAdaptiveRatio(displayRatio,element.clientWidth,element.clientHeight,false,small,constrainedDevice);
      if(renderer.getPixelRatio()!==ratio){renderer.setPixelRatio(ratio);renderer.setSize(element.clientWidth,element.clientHeight||340);}
      draw();
    },style:value=>{materials.top.color.set(value.topColor);materials.shirtDetail.color.set(value.topColor).multiplyScalar(.55);materials.bottom.color.set(value.bottomColor);materials.hair.color.set(value.hairColor);materials.facialHair.color.set(value.hairColor);materials.lips.color.set(value.lips==='berry'?'#71324d':value.lips==='rose'?'#a85e6d':'#6b3e35');materials.lips.opacity=value.lips==='natural'?.4:.72;materials.cap.color.set(value.hatColor);materials.capShade.color.set(value.hatColor).multiplyScalar(.58);materials.glasses.color.set(value.glassesColor);materials.sneakers.color.set(value.sneakersColor);draw();},framing:value=>{const next=avatarCameraFrame(value);camera.zoom=1;camera.updateProjectionMatrix();if(reducedMotion){camera.position.set(0,next.height,next.distance);camera.lookAt(0,next.height,0);cameraTransition=null;}else cameraTransition={fromY:camera.position.y,fromDistance:camera.position.z,toY:next.height,toDistance:next.distance,start:performance.now()};draw();},markers:value=>{setMarkers(value);draw();},weight:value=>{weightMarker.visible=value;draw();},expression:value=>{setExpression(value);draw();},attention:rank=>{setAttention(rank);draw();},rotate:angle=>{
      const target=shortestAvatarAngle(model.rotation.y,angle);
      if(reducedMotion){model.rotation.y=target;transition=null;}else transition={from:model.rotation.y,to:target,start:performance.now()};draw();
    },nudge:delta=>{transition=null;model.rotation.y+=delta;setDirection("custom");draw();},zoom:value=>{camera.zoom=avatarZoom(value)/100;camera.updateProjectionMatrix();draw();}};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);
    // V223: cancel pending GPU work as soon as the avatar leaves the viewport.
    const visibilityObserver=new IntersectionObserver(entries=>{
      visible=entries[0]?.isIntersecting??false;
      if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}
      if(visible)draw();
    });visibilityObserver.observe(element);
    const visibility=()=>{if(!document.hidden)draw();};document.addEventListener("visibilitychange",visibility);
    let pointer:{id:number;x:number;y:number;angle:number;moved:boolean;rotating:boolean}|null=null;
    const raycaster=new THREE.Raycaster();
    const down=(e:PointerEvent)=>{if(!e.isPrimary || (e.pointerType==='mouse' && e.button!==0))return;transition=null;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,angle:model.rotation.y,moved:false,rotating:false};};
    // V209: the compact card is an identity portrait, so it remains front-facing.
    // Rotation is reserved for the explicit inspection view where controls are visible.
    const move=(e:PointerEvent)=>{if(!pointer||pointer.id!==e.pointerId||compactRef.current)return;const dx=e.clientX-pointer.x;pointer.moved ||= Math.hypot(dx,e.clientY-pointer.y)>6;if(Math.abs(dx)<=6||Math.abs(dx)<Math.abs(e.clientY-pointer.y))return;try{renderer.domElement.setPointerCapture(e.pointerId);}catch{}model.rotation.y=pointer.angle+dx*.012;if(!pointer.rotating){pointer.rotating=true;setDragging(true);setDirection("custom");}draw();};
    const up=(e:PointerEvent)=>{if(pointer?.id!==e.pointerId)return;const tap=avatarTapEligible(e.type,pointer.moved,pointer,{x:e.clientX,y:e.clientY});if(pointer.rotating){setDragging(false);draw();}pointer=null;if(tap){const rect=renderer.domElement.getBoundingClientRect();if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){model.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const target=raycaster.intersectObject(model,true).map(hit=>hit.object.userData).find(data=>data?.action);if(target?.action==="device")actions.current.onDeviceSelect?.(target.deviceId);else if(target?.action==="brain")actions.current.onBrainSelect?.();else if(target?.action==="surgery")actions.current.onBodySelect?.("surgery",target.markerKey);else if(target?.action==="mood"||target?.action==="weight")actions.current.onBodySelect?.(target.action);else actions.current.onEmptyTap?.();}}try{if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);}catch{}pointer=null;};
    const lost=(event:Event)=>{event.preventDefault();onUnavailable();};
    element.addEventListener("pointerdown",down);element.addEventListener("pointermove",move);window.addEventListener("pointerup",up);window.addEventListener("pointercancel",up);element.addEventListener("lostpointercapture",up);renderer.domElement.addEventListener("webglcontextlost",lost);
    resize();
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);transition=null;cameraTransition=null;controller.current=null;resizeObserver.disconnect();visibilityObserver.disconnect();document.removeEventListener("visibilitychange",visibility);element.removeEventListener("pointerdown",down);element.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",up);element.removeEventListener("lostpointercapture",up);renderer.domElement.removeEventListener("webglcontextlost",lost);
      const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();model.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])mats.add(m);}});[stage,stageRing].forEach(object=>{geometries.add(object.geometry);mats.add(object.material);});Object.values(materials).forEach(m=>mats.add(m));[markerGeometry,markerRingGeometry,markerHitGeometry].forEach(g=>geometries.add(g));Object.values(markerMaterials).forEach(m=>mats.add(m));markerLines.forEach(g=>geometries.add(g));Object.values(markerLineMaterials).forEach(m=>mats.add(m));mats.add(hitMaterial);geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
    // Signature includes every appearance field used by this scene; metadata updates keep the canvas.
  },[visualSignature,onUnavailable]);
  const keyboard=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();controller.current?.nudge(event.key==='ArrowLeft'?-Math.PI/12:Math.PI/12);}
    else if(event.key==='Home'){event.preventDefault();controller.current?.rotate(0);controller.current?.zoom(100);setDirection('front');setZoom(100);onFramingChange?.('body');}
    else if(event.key==='+'||event.key==='-'||event.key==='='){event.preventDefault();const value=avatarZoom(zoom+(event.key==='-'?-5:5));setZoom(value);controller.current?.zoom(value);}
  };
  const controls=<div className="pt-1">{attention>0&&<p className="rounded-lg bg-violet-400/[0.05] px-2 py-2 text-center text-[10px] leading-relaxed text-ink-muted">O núcleo Brain acompanha a prioridade dos registros; não representa diagnóstico.</p>}
    <p className="sr-only">No teclado, as setas giram, mais e menos ajustam o zoom e Home restaura a frente.</p>
    <div aria-label="Vista do avatar 3D" className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-black/15 p-1">{([['front','Frente',0],['left','Esquerda',-Math.PI/2],['back','Costas',Math.PI],['right','Direita',Math.PI/2]] as const).map(([id,title,angle])=><button type="button" key={id} aria-pressed={direction===id} onClick={()=>{controller.current?.rotate(angle);setDirection(id);}} className={`min-h-11 rounded-lg border px-1 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${direction===id?'border-violet-300/45 bg-violet-400/15 font-semibold text-violet-200':'border-transparent text-ink-muted'}`}>{title}</button>)}</div>
    <label htmlFor={zoomId} className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[11px] text-ink-secondary"><span>Zoom</span><input id={zoomId} aria-label="Zoom do avatar" type="range" min="80" max="130" value={zoom} onChange={e=>{const value=avatarZoom(Number(e.target.value));setZoom(value);controller.current?.zoom(value);}} className="min-h-8 w-full accent-violet-400"/><span className="w-9 text-right tabular-nums">{zoom}%</span></label>
    {slots.length>0?<details className="mt-2 rounded-xl border border-surface-border px-2"><summary className="flex min-h-11 cursor-pointer items-center text-[10px] font-semibold text-ink-secondary">Aparelhos representados · {slots.length}<span className="ml-auto">›</span></summary><ul aria-label="Aparelhos representados" className="space-y-1 border-t border-surface-border py-2">{slots.map(({kind,side,device,count})=><li key={`${side}-${kind}`} className="rounded-lg bg-surface-raised px-2 text-xs text-ink-primary">{onDeviceSelect?<button type="button" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)} className="min-h-11 w-full text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">{device.name} <span aria-hidden="true">›</span><span className="mt-0.5 block text-[9px] font-normal text-ink-muted">{kind==='watch'?'Relógio':'Anel'} · lado {side==='right'?'direito':'esquerdo'}{count>1?` · +${count-1} nesta posição`:''}</span></button>:<strong>{device.name}</strong>}</li>)}</ul></details>:null}</div>;
  return <div className="mx-auto w-full max-w-[440px]">
    {!compact&&onFramingChange?<div className="mb-2 grid grid-cols-3 gap-2" role="group" aria-label="Enquadramento do avatar">{([['body','Corpo inteiro'],['face','Rosto'],['shoes','Tênis']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={framing===id} onClick={()=>onFramingChange(id)} className={`min-h-11 rounded-xl border px-2 text-[11px] font-semibold ${framing===id?'border-emerald-300/30 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>:null}
    <div ref={host} style={{height:compact?"clamp(210px, 29dvh, 250px)":"clamp(330px, 52dvh, 470px)"}} tabIndex={0} onKeyDown={keyboard} role="group" aria-label={`Avatar 3D estilizado. ${description}. Acessórios pessoais são cosméticos, separados dos aparelhos de saúde. Celular ilustrativo.`} className="w-full cursor-grab overflow-hidden rounded-2xl border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_18%,rgba(110,231,183,.09),transparent_44%),linear-gradient(180deg,rgba(110,231,183,.035),rgba(2,6,12,.2)_65%)] shadow-[inset_0_-32px_70px_rgba(0,0,0,.28)] active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" />
    {compact?null:<p className="py-1.5 text-center text-[10px] text-ink-muted">Arraste para girar · selecione Frente/Costas · toque nas regiões para explorar · use Voltar para fechar</p>}
    {controlsContainer===undefined?controls:controlsContainer?createPortal(controls,controlsContainer):null}
  </div>;
}
