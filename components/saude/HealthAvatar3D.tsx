"use client";
import { useEffect, useId, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import type { HealthDevice } from "@/lib/health-profile/types";
import { avatarColor, avatarLayout, avatarTapEligible } from "@/lib/health-profile/avatar";
import { avatarConstrainedDevice, avatarRenderRatio, avatarZoom } from "@/lib/health-profile/avatar-preference";
import {avatarBodyVisualSignature,avatarBraceSlots,type AvatarBodyContext,type AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { SURGERY_MARKER_COLORS, type AvatarSurgeryMarker } from "@/lib/health-profile/avatar-surgery-markers";
import { watchModelByName } from "@/lib/health-profile/device-catalog";
import { avatarAttentionColor, shortestAvatarAngle } from "@/lib/health-profile/avatar-context";
import {avatarCameraFrame,avatarStyleGeometryKey,type AvatarFraming} from "@/lib/health-profile/avatar-framing";
import type { AvatarStyle } from "@/lib/health-profile/avatar-style";

type Controller = {style:(value:AvatarStyle)=>void;framing:(value:AvatarFraming)=>void; markers:(markers:AvatarSurgeryMarker[])=>void; attention: (rank:number)=>void; rotate: (angle: number) => void; zoom: (value: number) => void; nudge:(delta:number)=>void;expression:(value:AvatarBodyContext["expression"])=>void;weight:(visible:boolean)=>void };
export default function HealthAvatar3D({ framing="body",onFramingChange,skin, appearance, devices, onUnavailable, attention=0, onDeviceSelect, onBrainSelect, onEmptyTap, controlsContainer, compact=false, body, onBodySelect }: { framing?:AvatarFraming;onFramingChange?:(value:AvatarFraming)=>void;skin: string; appearance: AvatarStyle; devices: HealthDevice[]; attention?:number; onDeviceSelect?:(id:string)=>void; onBrainSelect?:()=>void; onEmptyTap?:()=>void; compact?:boolean;body?:AvatarBodyContext;onBodySelect?:(part:AvatarBodyPart,markerKey?:string)=>void; controlsContainer?:HTMLElement|null; onUnavailable: () => void }) {
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null);
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
  useEffect(() => {
    setZoom(100); setDirection("front");
    const appearance=appearanceRef.current;
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { onUnavailable(); return; }
    const displayRatio=window.devicePixelRatio||1;
    const navigatorWithMemory=navigator as Navigator&{deviceMemory?:number};
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const constrainedDevice=avatarConstrainedDevice({hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigatorWithMemory.deviceMemory,reducedMotion});
    renderer.setPixelRatio(avatarRenderRatio(displayRatio,false,compact,constrainedDevice));
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
      skin: new THREE.MeshStandardMaterial({ color: avatarColor(skin), roughness: .58, metalness: .012 }),
      skinShade: new THREE.MeshStandardMaterial({ color: new THREE.Color(avatarColor(skin)).multiplyScalar(.76), roughness: .68, transparent:true, opacity:.34 }),
      top: new THREE.MeshStandardMaterial({ color: appearance.topColor, roughness: .76 }),
      shirtDetail: new THREE.MeshStandardMaterial({ color: new THREE.Color(appearance.topColor).multiplyScalar(.55), roughness: .82 }),
      bottom: new THREE.MeshStandardMaterial({ color: appearance.bottomColor, roughness: .79 }),
      hair: new THREE.MeshStandardMaterial({ color: appearance.hairColor, roughness: .9 }),
      facialHair: new THREE.MeshStandardMaterial({ color: appearance.hairColor, roughness: .94, transparent:true, opacity:.88 }),
      dark: new THREE.MeshStandardMaterial({ color: "#09121d", roughness: .6 }),
      white: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: .65 }),
      iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .48, metalness: .015 }),
      cap: new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: .84 }),
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
      const bw=backWidth/2,fw=frontWidth/2,h=height/2,d=depth/2;
      const vertices=new Float32Array([-bw,-h,-d,bw,-h,-d,bw,h,-d,-bw,h,-d,-fw,-h,d,fw,-h,d,fw,h,d,-fw,h,d]);
      const indices=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,0,3,7,0,7,4,1,5,6,1,6,2];
      const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
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
    oval(materials.skin,0,2.825,-.012,[.194,.272,.178]);
    const jawShape=new THREE.Shape();
    jawShape.moveTo(-.153,.087);jawShape.lineTo(.153,.087);jawShape.lineTo(.128,-.045);jawShape.lineTo(.066,-.111);jawShape.lineTo(0,-.132);jawShape.lineTo(-.066,-.111);jawShape.lineTo(-.128,-.045);jawShape.closePath();
    const jawGeometry=new THREE.ExtrudeGeometry(jawShape,{depth:.166,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2});jawGeometry.translate(0,0,-.083);
    const jaw=mesh(jawGeometry,materials.skin,0,2.657,.018);jaw.rotation.x=.025;
    for(const sign of [-1,1]) {
      // V184: cheek volume follows the jaw plane instead of reading as a sphere attached to the face.
      const cheek=mesh(taperedBox(.067,.085,.094,.042),materials.skin,sign*.108,2.738,.157);cheek.rotation.z=sign*.12;cheek.rotation.x=-.08;cheek.raycast=()=>{};
      const temple=mesh(taperedBox(.051,.063,.11,.032),materials.skin,sign*.158,2.824,.124);temple.rotation.z=sign*.08;temple.raycast=()=>{};
      oval(materials.skin,sign*.205,2.77,-.002,[.026,.058,.036]);
      oval(materials.skin,sign*.204,2.77,.024,[.011,.036,.019]);
      const cheekbone=mesh(new THREE.CapsuleGeometry(.009,.062,3,8),materials.skinShade,sign*.104,2.755,.205);cheekbone.rotation.z=sign*1.18;cheekbone.raycast=()=>{};
      const innerEar=mesh(new THREE.TorusGeometry(.020,.004,5,12,Math.PI*1.35),materials.dark,sign*.207,2.77,.046);innerEar.rotation.y=sign*Math.PI/2;innerEar.raycast=()=>{};
    }
    const chin=oval(materials.skin,0,2.548,.056,[.073,.038,.069]);chin.rotation.x=.08;chin.raycast=()=>{};
    // Brows, eye highlights and clothing seams provide depth without remote assets.
    for(const sign of [-1,1]) {
      const brow=mesh(new THREE.CapsuleGeometry(.009,.047,4,8),materials.hair,sign*.084,2.861,.205);brow.rotation.z=sign*1.42;
      oval(materials.white,sign*.081,2.826,.237,[.004,.004,.003]);
      const upperLid=oval(materials.skin,sign*.083,2.843,.224,[.041,.012,.014]);upperLid.rotation.z=sign*.025;upperLid.raycast=()=>{};
      const lowerLid=mesh(new THREE.CapsuleGeometry(.0035,.055,2,7),materials.skinShade,sign*.083,2.804,.239);lowerLid.rotation.z=Math.PI/2;lowerLid.raycast=()=>{};
    }
    const noseBridge=mesh(new THREE.CapsuleGeometry(.014,.068,4,8),materials.skin,0,2.778,.207);noseBridge.rotation.x=.08;noseBridge.raycast=()=>{};
    const noseTip=oval(materials.skin,0,2.724,.239,[.038,.027,.033]);noseTip.raycast=()=>{};
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
    if(appearance.facialHair==='stubble'){
      const stubble=mesh(new THREE.CylinderGeometry(.145,.074,.135,10),materials.facialHair,0,2.62,.035);stubble.scale.set(1.01,1,.92);stubble.raycast=()=>{};
    }else if(appearance.facialHair==='goatee'){
      oval(materials.facialHair,0,2.603,.197,[.055,.065,.018]).raycast=()=>{};
      const moustache=mesh(new THREE.CapsuleGeometry(.011,.075,3,8),materials.facialHair,0,2.686,.209);moustache.rotation.z=Math.PI/2;moustache.raycast=()=>{};
    }else if(appearance.facialHair==='beard'){
      const beard=mesh(new THREE.CylinderGeometry(.15,.082,.17,10),materials.facialHair,0,2.605,.035);beard.raycast=()=>{};
      oval(materials.facialHair,0,2.56,.085,[.09,.07,.07]).raycast=()=>{};
      const moustache=mesh(new THREE.CapsuleGeometry(.012,.09,3,8),materials.facialHair,0,2.688,.21);moustache.rotation.z=Math.PI/2;moustache.raycast=()=>{};
    }
    const neck=limb(.082,.108,.22,materials.skin,0,2.45,0);neck.scale.z=.9;
    const shirtShape=new THREE.Shape();shirtShape.moveTo(-.26,0);shirtShape.lineTo(.26,0);shirtShape.lineTo(.29,.5);shirtShape.lineTo(.33,.67);shirtShape.lineTo(.26,.77);shirtShape.lineTo(-.26,.77);shirtShape.lineTo(-.33,.67);shirtShape.lineTo(-.29,.5);shirtShape.closePath();
    const shirtGeometry=new THREE.ExtrudeGeometry(shirtShape,{depth:.34,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1});shirtGeometry.translate(0,0,-.17);
    mesh(shirtGeometry,materials.top,0,1.665,0);
    mesh(softBox(.54,.25,.35),materials.bottom,0,1.535,0);
    // V186: a transição pélvica acompanha o tronco e os shorts; o corpo deixa de parecer
    // dois blocos apoiados um sobre o outro quando observado de lado ou pelas costas.
    const waist=mesh(taperedBox(.49,.535,.145,.34),materials.bottom,0,1.505,.002);waist.raycast=()=>{};
    const waistSeam=mesh(new THREE.BoxGeometry(.515,.018,.355),materials.shirtDetail,0,1.565,.004);waistSeam.raycast=()=>{};
    // Collar bones and shoulder caps soften the torso-to-arm transition in every view.
    for(const sign of [-1,1]){
      const collar=mesh(new THREE.CapsuleGeometry(.006,.082,3,8),materials.shirtDetail,sign*.067,2.389,.174);collar.rotation.z=sign*1.02;collar.raycast=()=>{};
      oval(materials.top,sign*.303,2.323,0,[.135,.142,.157]);
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
      const sleeve=limb(.112,.1,.27,materials.top,sign*.337,2.25,0,sign*.13);sleeve.scale.z=1.08;
      const upperArm=limb(.09,.082,.36,materials.skin,sign*.39,2.005,0,sign*.13);upperArm.raycast=()=>{};
      // V185: articulações facetadas preservam mobilidade visual sem o efeito de “bolinhas” entre os membros.
      const elbow=mesh(softBox(.137,.126,.13,.047),materials.skin,sign*.418,1.815,.002);elbow.rotation.z=sign*.08;elbow.raycast=()=>{};
      const elbowContour=mesh(new THREE.CapsuleGeometry(.005,.045,2,7),materials.skinShade,sign*.418,1.81,.071);elbowContour.rotation.z=Math.PI/2;elbowContour.raycast=()=>{};
      const forearm=limb(.081,.068,.35,materials.skin,sign*(holdsPhone?.45:.454),1.64,holdsPhone?.028:.008,sign*(holdsPhone?.045:.08));forearm.raycast=()=>{};
      // V187: punho facetado e transição dorsal unem antebraço e mão sem a antiga esfera solta.
      const wrist=mesh(softBox(.126,.105,.12,.032),materials.skin,sign*.469,1.475,.014);wrist.rotation.z=sign*.055;wrist.raycast=()=>{};
      const wristContour=mesh(new THREE.CapsuleGeometry(.004,.052,2,7),materials.skinShade,sign*.469,1.469,.078);wristContour.rotation.z=Math.PI/2;wristContour.raycast=()=>{};
      // A mão do celular usa uma única palma atrás do aparelho; a outra mantém os dedos relaxados.
      const palm=mesh(softBox(holdsPhone?.138:.145,holdsPhone?.205:.19,.13,.035),materials.skin,sign*.49,1.395,holdsPhone?.052:.018);
      palm.rotation.z=holdsPhone?sign*.10:0;
      const palmContour=mesh(new THREE.CapsuleGeometry(.004,.052,2,7),materials.skinShade,sign*.49,1.398,holdsPhone?.121:.088);palmContour.rotation.z=Math.PI/2;palmContour.raycast=()=>{};
      if(!holdsPhone){const thumb=mesh(new THREE.CapsuleGeometry(.026,.075,3,7),materials.skin,sign*.445,1.49,.075);thumb.rotation.z=sign*.78;thumb.raycast=()=>{};}
      // Four articulated silhouettes make both hands readable from the front
      // without multiplying draw calls into a realistic hand rig.
      for(let fingerIndex=0;!holdsPhone&&fingerIndex<4;fingerIndex+=1){
        const finger=mesh(new THREE.CapsuleGeometry(.015,.071-fingerIndex*.004,3,6),materials.skin,sign*(.456+fingerIndex*.023),1.318,.067);
        finger.rotation.z=sign*(.03+fingerIndex*.025);finger.raycast=()=>{};
      }
      for(let knuckleIndex=0;!holdsPhone&&knuckleIndex<3;knuckleIndex+=1)oval(materials.skin,sign*(.462+knuckleIndex*.027),1.356,.087,[.017,.014,.016]).raycast=()=>{};
      const shorts=mesh(softBox(.275,.34,.315,.028),materials.bottom,sign*.15,1.305,0);shorts.raycast=()=>{};
      const thigh=limb(.116,.102,.43,materials.skin,sign*.15,1.02,0);thigh.raycast=()=>{};
      const knee=mesh(taperedBox(.162,.178,.155,.145),materials.skin,sign*.15,.79,.012);knee.raycast=()=>{};
      const patella=mesh(softBox(.086,.098,.018,.032),materials.skinShade,sign*.15,.79,.092);patella.raycast=()=>{};
      const calf=limb(.102,.079,.43,materials.skin,sign*.15,.55,.004);calf.raycast=()=>{};
      oval(materials.skin,sign*.15,.37,.01,[.083,.105,.081]).raycast=()=>{};
      const ankle=limb(.076,.086,.14,materials.skin,sign*.15,.285,.018);ankle.raycast=()=>{};
      const ankleContour=mesh(taperedBox(.135,.16,.075,.145),materials.skin,sign*.15,.245,.026);ankleContour.raycast=()=>{};
      // Olhos em três planos: esclera baixa, íris e pupila. O formato horizontal evita a leitura de “olhos redondos colados”.
      oval(materials.white,sign*.083,2.82,.214,[.042,.019,.014]);
      oval(materials.iris,sign*.083,2.82,.228,[.017,.016,.007]);
      oval(materials.dark,sign*.083,2.82,.235,[.007,.009,.004]);
      oval(materials.white,sign*.079,2.827,.239,[.0025,.0025,.002]);
    }
    oval(materials.skin,0,2.76,.23,[.035,.055,.04]);
    // V155: cosmetic accessories follow head/body geometry, not medical-device records.
    // They do not receive raycast actions and never alter clinical markers.
    if (appearance.hat !== "none") {
      const crown=mesh(new THREE.SphereGeometry(.246,28,16,0,Math.PI*2,0,Math.PI/2),materials.cap,0,2.98,-.01,[1,.75,.93]);
      crown.raycast=()=>{};
      const crownFront=mesh(softBox(.31,.13,.018,.04),materials.cap,0,3.035,.178);crownFront.rotation.x=-.11;crownFront.raycast=()=>{};
      const capButton=mesh(new THREE.SphereGeometry(.018,10,6),materials.white,0,3.165,-.012);capButton.raycast=()=>{};
      const crownSide=mesh(new THREE.CylinderGeometry(.225,.244,.12,18,1,true),materials.cap,0,3.012,-.008);crownSide.raycast=()=>{};
      // A aba acompanha a largura real da cabeça: nas vistas frontais ela não vira uma faixa flutuante.
      const brim=mesh(taperedBox(appearance.hat==="flat"?.285:.27,appearance.hat==="flat"?.32:.30,.019,.18),materials.cap,0,2.984,.205);
      brim.rotation.x=appearance.hat==="baseball"?-.19:-.085;
      brim.raycast=()=>{};
      const underBrim=mesh(taperedBox(.255,appearance.hat==="flat"?.30:.28,.004,.165),materials.dark,0,2.971,.207);underBrim.rotation.x=brim.rotation.x;underBrim.raycast=()=>{};
      const brimEdge=mesh(new THREE.BoxGeometry(appearance.hat==="flat"?.292:.277,.003,.007),materials.shirtDetail,0,2.963,.276);brimEdge.rotation.x=brim.rotation.x;brimEdge.raycast=()=>{};
      const brimStitch=mesh(new THREE.TorusGeometry(.118,.0014,4,24,Math.PI),materials.white,0,2.982,.238);brimStitch.rotation.x=Math.PI/2;brimStitch.rotation.z=Math.PI;brimStitch.raycast=()=>{};
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
        const frameGeometry = rectangular ? new THREE.ExtrudeGeometry(outline,{depth:.009,bevelEnabled:false,curveSegments:3}) : new THREE.TorusGeometry(.070,.009,7,24);
        const ring=mesh(frameGeometry,materials.glasses,x,y,z);
        ring.raycast=()=>{};
        const temple=mesh(new THREE.BoxGeometry(.009,.009,.14),materials.glasses,side*.166,y,.193);
        temple.raycast=()=>{};
      }
      const bridge=mesh(new THREE.BoxGeometry(.044,.01,.012),materials.glasses,0,2.831,.263);bridge.raycast=()=>{};
      const lensMaterial=new THREE.MeshPhysicalMaterial({color:0xb7e6fa,transparent:true,opacity:.12,roughness:.12,metalness:.05,depthWrite:false});
      for(const side of [-1,1]){
        const lens=appearance.glasses==="rectangular"
          ? mesh(softBox(.116,.058,.004,.008),lensMaterial,side*.082,2.825,.254)
          : oval(lensMaterial,side*.082,2.825,.254,[.055,.055,.003]);
        lens.raycast=()=>{};
      }
    }
    for(const side of [-1,1]) {
      const x=side*.15;
      const sole=mesh(taperedBox(.225,.30,.038,.46),materials.white,x,.127,.075);sole.raycast=()=>{};
      const outsole=mesh(taperedBox(.23,.305,.015,.475),materials.dark,x,.106,.073);outsole.raycast=()=>{};
      const shoe=mesh(taperedBox(.215,.278,.115,.415),materials.sneakers,x,.192,.088);shoe.raycast=()=>{};
      shoe.rotation.x=-.035;
      const vamp=mesh(taperedBox(.145,.235,.046,.225),materials.sneakers,x,.238,.225);vamp.rotation.x=-.16;vamp.raycast=()=>{};
      const toe=oval(materials.sneakers,x,.187,.29,[.14,.062,.148]);toe.raycast=()=>{};
      const toeTop=mesh(taperedBox(.11,.18,.021,.17),materials.white,x,.235,.268);toeTop.rotation.x=-.16;toeTop.raycast=()=>{};
      const toeGuard=mesh(new THREE.CapsuleGeometry(.014,.19,3,10),materials.white,x,.153,.423);toeGuard.rotation.z=Math.PI/2;toeGuard.raycast=()=>{};
      const tongue=mesh(softBox(.13,.12,.025,.012),materials.sneakers,x,.245,.275);tongue.rotation.x=-.22;tongue.raycast=()=>{};
      const heel=mesh(softBox(.235,.12,.055,.018),materials.dark,x,.205,-.145);heel.raycast=()=>{};
      const heelCounter=mesh(taperedBox(.185,.215,.105,.095),materials.sneakers,x,.245,-.105);heelCounter.rotation.x=.04;heelCounter.raycast=()=>{};
      const quarter=mesh(taperedBox(.15,.205,.075,.19),materials.dark,x,.205,.12);quarter.rotation.x=-.18;quarter.raycast=()=>{};
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
    const mouth=mesh(new THREE.TorusGeometry(.044,.006,6,18,Math.PI),materials.dark,0,2.647,.228);mouth.rotation.z=Math.PI;
    const neutralMouth=mesh(new THREE.BoxGeometry(.064,.007,.004),materials.dark,0,2.647,.246);
    const lowerLip=mesh(new THREE.CapsuleGeometry(.004,.041,3,8),materials.skin,0,2.631,.244);lowerLip.rotation.z=Math.PI/2;lowerLip.raycast=()=>{};
    const setExpression=(value:AvatarBodyContext['expression'])=>{mouth.visible=value!=="neutral";neutralMouth.visible=value==="neutral";mouth.rotation.z=value==="reflective"?0:Math.PI;mouth.position.y=value==="reflective"?2.61:2.647;lowerLip.visible=value==="neutral";};
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
    for(const [x,y,w,h] of [[0,2.278,.31,.01],[0,2.002,.31,.01],[-.15,2.14,.01,.266],[.15,2.14,.01,.266]]){const rail=mesh(softBox(w,h,.012,.002),signalMaterial,x,y,.249);rail.userData.action="brain";signalRing.add(rail);}
    const brainGlyph=new THREE.Group();model.add(brainGlyph);
    for(const [x,y,w,h] of [[-.052,2.198,.073,.018],[.052,2.198,.073,.018],[-.069,2.145,.052,.018],[.069,2.145,.052,.018],[-.052,2.092,.073,.018],[.052,2.092,.073,.018],[0,2.145,.014,.146]]){
      const segment=mesh(softBox(w,h,.014,.004),signalMaterial,x,y,.249);segment.userData.action="brain";brainGlyph.add(segment);
    }

    const setAttention=(rank:number)=>{const color=avatarAttentionColor(rank);signalMaterial.color.set(color);signalMaterial.emissive.set(color);signalRing.visible=rank>0;};
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
    const phoneX=layout.phoneSide==="right"?-.486:.486;
    const gripSign=Math.sign(phoneX)||1;
    const phoneAngle=layout.phoneSide==="right"?-.10:.10;
    const phone=mesh(softBox(.17,.3,.035,.015),materials.dark,phoneX,1.39,.095);phone.rotation.z=phoneAngle;
    const phoneRim=mesh(softBox(.181,.311,.012,.019),materials.white,phoneX,1.39,.089);phoneRim.rotation.z=phoneAngle;phoneRim.raycast=()=>{};
    const screen=mesh(new THREE.PlaneGeometry(.14,.24),label("VAULT",""),phoneX,1.39,.114);screen.rotation.z=phoneAngle;screen.userData.action="brain";
    // The thenar pad and side contact make the device rest inside the hand instead of floating beside it.
    const phoneGripPad=mesh(taperedBox(.075,.095,.145,.052),materials.skin,phoneX-gripSign*.054,1.376,.079);phoneGripPad.rotation.z=phoneAngle+gripSign*.08;phoneGripPad.raycast=()=>{};
    const phoneSideContact=mesh(new THREE.CapsuleGeometry(.014,.13,3,7),materials.skin,phoneX+gripSign*.083,1.382,.105);phoneSideContact.rotation.z=phoneAngle;phoneSideContact.raycast=()=>{};
    // V183: the dedicated grip replaces the generic fingers on this hand, avoiding an eight-finger overlap.
    for(let fingerIndex=0;fingerIndex<4;fingerIndex+=1){
      const finger=mesh(new THREE.CapsuleGeometry(.0125,.073-fingerIndex*.003,3,6),materials.skin,phoneX+gripSign*.071,1.323+fingerIndex*.042,.119);
      finger.rotation.z=Math.PI/2+phoneAngle;finger.rotation.y=gripSign*.12;finger.raycast=()=>{};
    }
    const phoneThumb=mesh(new THREE.CapsuleGeometry(.017,.092,3,7),materials.skin,phoneX-gripSign*.043,1.406,.126);phoneThumb.rotation.z=gripSign*.55+phoneAngle;phoneThumb.rotation.y=-gripSign*.08;phoneThumb.raycast=()=>{};
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
    const setDragging=(dragging:boolean)=>{const ratio=avatarRenderRatio(displayRatio,dragging,compact,constrainedDevice);if(renderer.getPixelRatio()!==ratio){renderer.setPixelRatio(ratio);renderer.setSize(element.clientWidth,element.clientHeight||340);}};
    const resize=()=>{const width=element.clientWidth;if(!width)return;const height=element.clientHeight||340;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();draw();};
    setMarkers(markersRef.current);
    controller.current={style:value=>{materials.top.color.set(value.topColor);materials.shirtDetail.color.set(value.topColor).multiplyScalar(.55);materials.bottom.color.set(value.bottomColor);materials.hair.color.set(value.hairColor);materials.facialHair.color.set(value.hairColor);materials.cap.color.set(value.hatColor);materials.glasses.color.set(value.glassesColor);materials.sneakers.color.set(value.sneakersColor);draw();},framing:value=>{const next=avatarCameraFrame(value);camera.zoom=1;camera.updateProjectionMatrix();if(reducedMotion){camera.position.set(0,next.height,next.distance);camera.lookAt(0,next.height,0);cameraTransition=null;}else cameraTransition={fromY:camera.position.y,fromDistance:camera.position.z,toY:next.height,toDistance:next.distance,start:performance.now()};draw();},markers:value=>{setMarkers(value);draw();},weight:value=>{weightMarker.visible=value;draw();},expression:value=>{setExpression(value);draw();},attention:rank=>{setAttention(rank);draw();},rotate:angle=>{
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
  const controls=<div className="pt-1">{attention>0&&<p className="rounded-lg bg-violet-400/[0.05] px-2 py-2 text-center text-[10px] leading-relaxed text-slate-400">O núcleo Brain acompanha a prioridade dos registros; não representa diagnóstico.</p>}
    <p className="sr-only">No teclado, as setas giram, mais e menos ajustam o zoom e Home restaura a frente.</p>
    <div aria-label="Vista do avatar 3D" className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-black/15 p-1">{([['front','Frente',0],['left','Esquerda',-Math.PI/2],['back','Costas',Math.PI],['right','Direita',Math.PI/2]] as const).map(([id,title,angle])=><button type="button" key={id} aria-pressed={direction===id} onClick={()=>{controller.current?.rotate(angle);setDirection(id);}} className={`min-h-11 rounded-lg border px-1 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${direction===id?'border-violet-300/45 bg-violet-400/15 font-semibold text-violet-200':'border-transparent text-slate-400'}`}>{title}</button>)}</div>
    <label htmlFor={zoomId} className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[11px] text-slate-300"><span>Zoom</span><input id={zoomId} aria-label="Zoom do avatar" type="range" min="80" max="130" value={zoom} onChange={e=>{const value=avatarZoom(Number(e.target.value));setZoom(value);controller.current?.zoom(value);}} className="min-h-8 w-full accent-violet-400"/><span className="w-9 text-right tabular-nums">{zoom}%</span></label>
    {slots.length>0?<details className="mt-2 rounded-xl border border-slate-400/15 px-2"><summary className="flex min-h-11 cursor-pointer items-center text-[10px] font-semibold text-slate-300">Aparelhos representados · {slots.length}<span className="ml-auto">›</span></summary><ul aria-label="Aparelhos representados" className="space-y-1 border-t border-slate-400/10 py-2">{slots.map(({kind,side,device,count})=><li key={`${side}-${kind}`} className="rounded-lg bg-slate-900/30 px-2 text-xs text-slate-200">{onDeviceSelect?<button type="button" aria-label={`Abrir aparelho ${device.name}`} onClick={()=>onDeviceSelect(device.id)} className="min-h-11 w-full text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">{device.name} <span aria-hidden="true">›</span><span className="mt-0.5 block text-[9px] font-normal text-slate-400">{kind==='watch'?'Relógio':'Anel'} · lado {side==='right'?'direito':'esquerdo'}{count>1?` · +${count-1} nesta posição`:''}</span></button>:<strong>{device.name}</strong>}</li>)}</ul></details>:null}</div>;
  return <div className="mx-auto w-full max-w-[440px]">
    {!compact&&onFramingChange?<div className="mb-2 grid grid-cols-3 gap-2" role="group" aria-label="Enquadramento do avatar">{([['body','Corpo inteiro'],['face','Rosto'],['shoes','Tênis']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={framing===id} onClick={()=>onFramingChange(id)} className={`min-h-11 rounded-xl border px-2 text-[11px] font-semibold ${framing===id?'border-emerald-300/30 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>:null}
    <div ref={host} style={{height:compact?"clamp(210px, 29dvh, 250px)":"clamp(330px, 52dvh, 470px)"}} tabIndex={0} onKeyDown={keyboard} role="group" aria-label={`Avatar 3D estilizado. ${description}. Acessórios pessoais são cosméticos, separados dos aparelhos de saúde. Celular ilustrativo.`} className="w-full cursor-grab overflow-hidden rounded-2xl border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_18%,rgba(110,231,183,.09),transparent_44%),linear-gradient(180deg,rgba(110,231,183,.035),rgba(2,6,12,.2)_65%)] shadow-[inset_0_-32px_70px_rgba(0,0,0,.28)] active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" />
    {compact?null:<p className="py-1.5 text-center text-[10px] text-slate-400">Arraste para girar · toque no corpo, Brain ou aparelho para explorar</p>}
    {controlsContainer===undefined?controls:controlsContainer?createPortal(controls,controlsContainer):null}
  </div>;
}
