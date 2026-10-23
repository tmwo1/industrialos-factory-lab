import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { snapshotAt, stationIds } from '../engine/simulation';
import type { SimulationResult, StationId } from '../engine/simulation';

type Props={base:SimulationResult;candidate:SimulationResult;timeMs:number;clockRef:MutableRefObject<{timeMs:number;playing:boolean;speed:number}>;playing:boolean;quality:'high'|'low';compact:boolean;activeLine:'base'|'candidate';selectedStation:StationId|null;onSelect:(id:StationId,line:'base'|'candidate')=>void;fallbackView:ReactNode;resetKey:number;reducedMotion:boolean;onStats?:(stats:{drawCalls:number;triangles:number;fps:number})=>void};
type Palette=Record<string,THREE.MeshStandardMaterial>;
const POS=[-5.2,0,5.2];
const tmp=new THREE.Object3D();
function texture(kind:'floor'|'paint'){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;let seed=47;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const im=ctx.createImageData(256,256);for(let i=0;i<im.data.length;i+=4){const value=(kind==='floor'?180:231)+random()*(kind==='floor'?35:13);im.data[i]=im.data[i+1]=im.data[i+2]=value;im.data[i+3]=255;}ctx.putImageData(im,0,0);
 if(kind==='floor'){ctx.strokeStyle='#b8bcb5';ctx.lineWidth=1;ctx.strokeRect(0,0,256,256);for(let i=0;i<18;i++){ctx.strokeStyle='rgba(91,104,88,.025)';ctx.beginPath();ctx.moveTo(random()*256,random()*256);ctx.lineTo(random()*256,random()*256);ctx.stroke();}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='floor'?14:2,kind==='floor'?10:2);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function palette():Palette{return{
 body:new THREE.MeshStandardMaterial({color:'#d8ded5',metalness:.58,roughness:.33,map:texture('paint')}),
 green:new THREE.MeshStandardMaterial({color:'#2a5849',metalness:.6,roughness:.32}),
 dark:new THREE.MeshStandardMaterial({color:'#29332f',metalness:.6,roughness:.36}),
 steel:new THREE.MeshStandardMaterial({color:'#a9b5ad',metalness:.88,roughness:.24}),
 black:new THREE.MeshStandardMaterial({color:'#19211e',metalness:.15,roughness:.64}),
 rubber:new THREE.MeshStandardMaterial({color:'#38423a',roughness:.94}),
 glass:new THREE.MeshStandardMaterial({color:'#a9c5ba',metalness:.2,roughness:.14,transparent:true,opacity:.25,depthWrite:false}),
 yellow:new THREE.MeshStandardMaterial({color:'#d8ab47',metalness:.25,roughness:.6}),
 blue:new THREE.MeshStandardMaterial({color:'#86bbb2',emissive:'#66b6a4',emissiveIntensity:.6,roughness:.3}),
 light:new THREE.MeshStandardMaterial({color:'#dff2d1',emissive:'#d8f5bd',emissiveIntensity:1.1}),
 amber:new THREE.MeshStandardMaterial({color:'#d7a33d',emissive:'#b9801a',emissiveIntensity:.55}),
 red:new THREE.MeshStandardMaterial({color:'#b94c39',emissive:'#8a2a17',emissiveIntensity:.25}),
 floor:new THREE.MeshStandardMaterial({color:'#e0e3d7',roughness:.89,map:texture('floor')}),
 wall:new THREE.MeshStandardMaterial({color:'#dbdfd3',roughness:.84}),
 };
}
function builder(mats:Palette){
 const buffers:Record<string,THREE.BufferGeometry[]>={};const group=new THREE.Group();
 function put(g:THREE.BufferGeometry,material:string,p:number[],r:number[]=[0,0,0]){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);if(g.index){const source=g;g=source.toNonIndexed();source.dispose();}(buffers[material]??=[]).push(g);}
 const box=(p:number[],s:number[],mat='body',r:number[]=[0,0,0],round=0)=>put(round?new RoundedBoxGeometry(s[0],s[1],s[2],2,round):new THREE.BoxGeometry(...s),mat,p,r);
 const cyl=(p:number[],radius:number,height:number,mat='steel',r:number[]=[0,0,0],segments=10)=>put(new THREE.CylinderGeometry(radius,radius,height,segments),mat,p,r);
 function tube(points:number[][],radius=.026,mat='black'){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));put(new THREE.TubeGeometry(curve,16,radius,6,false),mat,[0,0,0]);}
 function finish(){for(const [key,geoms] of Object.entries(buffers)){const geom=mergeGeometries(geoms);if(!geom)continue;const mesh=new THREE.Mesh(geom,mats[key]);mesh.castShadow=key!=='glass'&&key!=='light';mesh.receiveShadow=key!=='glass';group.add(mesh);geoms.forEach(g=>g.dispose());}return group;}
 function bolt(p:number[],r:number[]=[Math.PI/2,0,0]){cyl(p,.024,.025,'steel',r,6);}
 function feet(x:number,z:number){for(const a of [-1,1])for(const b of [-1,1]){cyl([x*a,.12,z*b],.11,.15,'black');cyl([x*a,.22,z*b],.035,.15,'steel');}}
 function panel(p:number[],s:number[]){box(p,s,'body',[0,0,0],.035);for(const x of [-1,1])for(const y of [-1,1])bolt([p[0]+x*(s[0]/2-.1),p[1]+y*(s[1]/2-.1),p[2]+s[2]/2+.015]);}
 function control(x:number,y:number,z:number){box([x,y,z],[.43,.62,.13],'dark',[0,0,0],.025);box([x,y+.09,z+.073],[.32,.27,.012],'blue');for(let i=0;i<3;i++)box([x-.1+i*.1,y-.11,z+.078],[.045,.045,.025],i===2?'red':'black');cyl([x,y-.22,z+.09],.048,.04,'red',[Math.PI/2,0,0]);box([x+.15,y+.08,z+.085],[.015,.19,.012],'light');}
 function tower(x:number,y:number,z:number){cyl([x,y,z],.035,.26,'steel');for(let i=0;i<3;i++)cyl([x,y+.18+i*.13,z],.075,.115,i===0?'light':i===1?'amber':'red');cyl([x,y+.54,z],.078,.025,'dark');}
 return{box,cyl,tube,finish,bolt,feet,panel,control,tower,group};
}
function cnc(m:Palette){const b=builder(m);b.feet(1,.7);b.box([0,.52,0],[2.65,.5,1.95],'dark',[0,0,0],.05);b.panel([0,.7,1.01],[2.6,.6,.1]);b.box([0,1.56,-.88],[2.6,1.5,.18],'body',[0,0,0],.045);b.box([0,2.37,0],[2.65,.25,1.95],'body',[0,0,0],.04);
 for(const x of [-1.23,1.23]){b.box([x,1.56,.25],[.18,1.45,1.65],'body',[0,0,0],.035);b.box([x,1.06,0],[.2,.4,1.15],'dark');}
 b.box([-.28,1.65,1.015],[1.73,1.22,.065],'dark',[0,0,0],.015);b.box([-.28,1.65,1.06],[1.58,1.07,.025],'glass');b.box([-.9,1.67,1.13],[.035,.45,.05],'steel');b.box([-.28,2.25,1.075],[1.75,.07,.065],'steel');b.box([-.28,1.05,1.075],[1.75,.07,.065],'steel');
 b.box([.99,1.65,1.01],[.4,1.22,.14],'green',[0,0,0],.035);b.control(.95,1.65,1.12);b.box([-.25,.96,0],[1.75,.12,1.2],'steel');for(let i=0;i<7;i++)b.box([-.25,.999,-.48+i*.16],[1.6,.02,.022],'black');b.box([-.25,1.72,-.55],[.5,1.05,.32],'dark');b.box([-.25,1.78,-.3],[.6,.5,.55],'body',[0,0,0],.04);b.cyl([-.25,1.45,0],.13,.23);b.cyl([-.25,1.31,0],.05,.12);b.tube([[.4,2.22,-.5],[.5,1.9,-.1],[.1,1.55,.13]],.035,'blue');
 for(let i=0;i<8;i++)b.box([.8,.64+.028*i,1.07],[.45,.009,.02],'black');b.tower(1.0,2.6,-.55);b.box([.1,2.38,1.06],[.55,.065,.02],'green');for(const y of [1.15,2.15])b.box([-1.12,y,1.11],[.05,.14,.04],'steel');b.tube([[1.3,.6,-.6],[1.5,.5,-.65],[1.5,.12,-1.05]],.045);
 return b.finish();}
function press(m:Palette){const b=builder(m);b.feet(.86,.7);b.box([0,.47,0],[2.25,.45,1.9],'dark',[0,0,0],.04);b.box([0,.82,0],[2.3,.19,1.85],'steel');
 for(const x of [-.88,.88]){b.box([x,1.75,-.25],[.27,1.85,.75],'green',[0,0,0],.035);b.box([x,2.61,-.25],[.42,.2,.9],'dark');for(const y of [1.1,2.25])b.bolt([x,y,.145]);}
 b.box([0,2.56,-.25],[2.16,.38,1.05],'green',[0,0,0],.055);b.cyl([0,2.9,-.25],.28,.42,'body');b.cyl([0,2.27,-.25],.16,.37);b.box([0,1.05,0],[.82,.17,.67],'steel');b.box([0,1.16,0],[.45,.07,.43],'black');
 for(const x of [-1.1,1.1]){b.box([x,1.4,.87],[.045,1.14,.05],'yellow');b.box([x,1.4,.9],[.015,1.05,.02],'black');for(let i=0;i<9;i++)b.cyl([x,1+i*.1,.93],.01,.01,'light',[Math.PI/2,0,0]);}b.box([0,2.0,.87],[2.24,.04,.05],'yellow');b.box([0,1.45,.9],[2.14,1.05,.012],'glass');b.control(1.38,1.56,.45);b.box([1.21,1.5,.15],[.22,.1,.42],'steel');b.tower(.88,2.93,-.5);b.tube([[0,3.1,-.35],[.5,3.15,-.55],[1.18,2.6,-.6],[1.2,1,-.65]],.037);b.tube([[-.3,2.6,-.5],[-1.12,2.4,-.65],[-1.18,.3,-.8]],.035,'blue');
 const group=b.finish();const ram=new THREE.Group();ram.name='ram';const plate=new THREE.Mesh(new RoundedBoxGeometry(.85,.2,.7,2,.035),m.steel);plate.position.set(0,1.86,0);plate.castShadow=true;ram.add(plate);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.5,14),m.steel);shaft.position.set(0,2.1,-.25);ram.add(shaft);group.add(ram);return group;}
function inspect(m:Palette){const b=builder(m);b.feet(.9,.65);for(const x of [-.95,.95])for(const z of [-.7,.7])b.box([x,.61,z],[.09,.85,.09],'steel');b.box([0,.93,0],[2.3,.12,1.75],'steel');b.box([0,.99,0],[1.6,.04,1.15],'black');
 for(const x of [-.94,.94])b.box([x,1.79,-.48],[.11,1.65,.13],'steel');b.box([0,2.59,-.48],[2,.13,.17],'steel');b.box([0,2.37,-.28],[.42,.3,.5],'dark',[0,0,0],.045);b.cyl([0,2.12,0],.135,.21,'black');b.cyl([0,2.005,0],.11,.025,'blue');b.cyl([0,1.94,0],.34,.04,'light');b.cyl([0,1.943,0],.21,.05,'dark');
 for(const x of [-1.12,1.12]){b.box([x,1.7,0],[.04,1.4,1.75],'glass');b.box([x,2.4,0],[.055,.055,1.8],'steel');}b.box([0,1.7,-.88],[2.25,1.4,.035],'glass');b.box([0,.62,-.63],[1.25,.46,.2],'body',[0,0,0],.03);b.control(.79,1.5,.95);b.tower(-.94,2.77,-.48);b.tube([[0,2.5,-.49],[-.55,2.52,-.58],[-.98,2.35,-.58],[-.99,.55,-.58]],.025);b.box([-.82,1.07,.62],[.16,.1,.16],'blue');return b.finish();}
function conveyor(m:Palette){const b=builder(m),length=2.55;for(const z of [-.47,.47]){b.box([0,.87,z],[length,.14,.08],'steel');b.box([0,1.03,z],[length,.035,.035],'steel');for(const x of [-.98,.98])b.box([x,.48,z],[.06,.8,.06],'dark');}for(let i=0;i<18;i++){b.cyl([-1.2+i*.14,.9,0],.055,.86,'steel',[Math.PI/2,0,0],8);b.cyl([-1.2+i*.14,.9,.48],.027,.1,'black',[Math.PI/2,0,0],6);}b.box([0,.4,0],[2.2,.06,.08],'steel');b.box([.85,.69,.6],[.38,.28,.2],'green',[0,0,0],.025);b.cyl([.85,.72,.47],.07,.18,'black',[Math.PI/2,0,0]);return b.finish();}
function infrastructure(m:Palette,compact:boolean){const b=builder(m);b.box([0,-.12,0],[22,.2,14],'floor');
 for(let lane=-1;lane<=1;lane+=2){const z=lane*2.65;for(const x of POS){for(const side of [-1,1]){b.box([x,.002,z+side*1.25],[2.65,.012,.045],'yellow');b.box([x+side*1.5,.003,z],[.045,.013,2.5],'yellow');}}for(let i=0;i<30;i++)b.box([-9+i*.62,.006,z+1.65],[.35,.012,.035],'body');}
 for(const z of (compact?[0]:[-2.65,2.65]))for(const x of POS){b.box([x-.8,.78,z-1.45],[1.05,.12,1.55],'steel');for(const dx of [-.4,.4])for(const dz of [-.6,.6])b.box([x-.8+dx,.38,z-1.45+dz],[.055,.76,.055],'dark');}for(const z of (compact?[0]:[-2.65,2.65])){b.box([7.5,.78,z-1.15],[1.3,.12,1.8],'steel');for(const x of [7,8])for(const dz of [-.7,.7])b.box([x,.38,z-1.15+dz],[.06,.76,.06],'dark');}
 b.box([0,.007,0],[20,.016,.065],'yellow');for(const z of [-6.3,6.3])b.box([0,.006,z],[20,.016,.08],'yellow');
 b.box([0,1.9,-6.9],[22,4,.14],'wall');b.box([0,.35,-6.78],[22,.7,.1],'body');for(const x of [-10,-5,0,5,10]){b.box([x,2,-6.65],[.16,4,.28],'steel');b.box([x,4,-5.8],[.16,.15,2],'steel');}for(let i=0;i<8;i++){b.box([-9+i*2.55,2.8,-6.76],[1.85,1.2,.03],'glass');b.box([-9+i*2.55,3.44,-6.68],[1.95,.05,.1],'steel');}
 b.box([-9.8,.95,-4.8],[1.05,1.9,.65],'body',[0,0,0],.03);b.box([-9.8,1,-4.45],[.04,1.6,.02],'dark');for(const x of [-10.05,-9.55])b.box([x,1.1,-4.42],[.03,.2,.04],'black');for(let i=0;i<9;i++)b.box([-9.8,.25+i*.04,-4.42],[.76,.018,.02],'dark');
 for(const x of [-8.3,8.4])for(const z of [-3,3]){b.box([x,.18,z],[1.1,.18,1.05],'body');for(let i=0;i<3;i++)b.box([x,.32+i*.18,z],[.95,.14,.88],'dark');}
 return b.finish();}
function tag(label:string){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d')!;ctx.fillStyle='#dce4d4';ctx.fillRect(0,0,512,96);ctx.font='600 26px Arial';ctx.textAlign='center';ctx.fillStyle='#415a45';ctx.fillText(label,256,57);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
function Lighting(){const {gl,scene}=useThree();useEffect(()=>{const pmrem=new THREE.PMREMGenerator(gl);const room=new RoomEnvironment();const result=pmrem.fromScene(room,.04);scene.environment=result.texture;room.dispose();return()=>{scene.environment=null;result.dispose();pmrem.dispose();};},[gl,scene]);return null;}
function Machine({object,x,z,id,onSelect,selected,bottleneck}:{object:THREE.Group;x:number;z:number;id:StationId;onSelect:(id:StationId)=>void;selected:boolean;bottleneck:boolean}){
 return <group position={[x,0,z]} onClick={e=>{e.stopPropagation();onSelect(id);}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}><primitive object={object}/>{(selected||bottleneck)&&<mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.6,selected?1.65:1.62,48]}/><meshBasicMaterial color={bottleneck?'#c69e43':'#669759'} transparent opacity={.8}/></mesh>}</group>;
}
function World(props:Props){const{base,candidate,compact,activeLine,selectedStation,onSelect,quality,playing,timeMs,clockRef,reducedMotion,resetKey,onStats}=props;
 const mats=useMemo(palette,[]),models=useMemo(()=>[cnc(mats),press(mats),inspect(mats)],[mats]);const conv=useMemo(()=>conveyor(mats),[mats]);const room=useMemo(()=>infrastructure(mats,compact),[mats,compact]);
 const clones=useMemo(()=>[models.map(g=>g.clone(true)),models.map(g=>g.clone(true))],[models]);const conveyors=useMemo(()=>Array.from({length:4},()=>conv.clone(true)),[conv]);
 const partRef=useRef<THREE.InstancedMesh>(null),palletRef=useRef<THREE.InstancedMesh>(null),capRef=useRef<THREE.InstancedMesh>(null);const controls=useRef<OrbitControlsImpl|null>(null);const {invalidate,camera,gl}=useThree();
 useEffect(()=>{const orbit=new OrbitControlsImpl(camera,gl.domElement);const redraw=()=>invalidate();controls.current=orbit;orbit.enablePan=false;orbit.minDistance=10;orbit.maxDistance=32;orbit.minPolarAngle=.35;orbit.maxPolarAngle=1.18;orbit.minAzimuthAngle=-.85;orbit.maxAzimuthAngle=.85;orbit.target.set(0,.6,0);orbit.addEventListener('change',redraw);orbit.update();return()=>{orbit.removeEventListener('change',redraw);orbit.dispose();controls.current=null;document.body.style.cursor='auto';};},[camera,gl,invalidate]);
 useEffect(()=>{if(controls.current){controls.current.enableDamping=playing&&!reducedMotion;controls.current.dampingFactor=.12;}},[playing,reducedMotion]);
 const tags=useMemo(()=>[tag('01   /   BASELINE'),tag('02   /   IMPROVED LINE')],[]);const statsRef=useRef({last:performance.now(),frames:0});
 useEffect(()=>{camera.position.set(compact?15:14,compact?16:14.5,compact?22:19);camera.lookAt(0,.5,0);if(controls.current){controls.current.target.set(0,.6,0);controls.current.update();}invalidate();},[resetKey,compact,camera,invalidate]);
 useEffect(()=>{invalidate();},[timeMs,quality,activeLine,selectedStation,base,candidate,invalidate]);
 const visible=[!compact||activeLine==='base',!compact||activeLine==='candidate'];
 useFrame(()=>{if(controls.current?.enableDamping)controls.current.update();const t=clockRef.current.timeMs;let count=0;const positions:{x:number;y:number;z:number;improved:boolean}[]=[];
  for(let line=0;line<2;line++){if(!visible[line])continue;const result=line===0?base:candidate;const snap=snapshotAt(result,t);const z=compact?0:(line===0?-2.65:2.65);
   snap.stations.forEach((s,i)=>{const x=POS[i];if(s.processing!==null)positions.push({x,y:1.13,z,improved:line===1});s.queued.slice(0,8).forEach((_,q)=>positions.push({x:x-1.0+(q%2)*.4,y:.91,z:z-.95-Math.floor(q/2)*.32,improved:line===1}));
    const ram=clones[line][i].getObjectByName('ram');if(ram)ram.position.y=s.processing!==null&&!reducedMotion?-.4*(.5-.5*Math.cos(s.progress*Math.PI*2)):0;
   });
   snap.transit.forEach(p=>{const from=stationIds.indexOf(p.from);positions.push({x:POS[from]+(POS[from+1]-POS[from])*p.progress,y:1.0,z,improved:line===1});});
   snap.completedJobs.slice(-8).forEach((_,q)=>positions.push({x:7.1+(q%2)*.38,y:.92,z:z-.65-Math.floor(q/2)*.33,improved:line===1}));
  }
  for(const p of positions){tmp.position.set(p.x,p.y,p.z);tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);tmp.updateMatrix();partRef.current?.setMatrixAt(count,tmp.matrix);palletRef.current?.setMatrixAt(count,tmp.matrix);capRef.current?.setMatrixAt(count,tmp.matrix);palletRef.current?.setColorAt(count,new THREE.Color(p.improved?'#37664d':'#627260'));count++;}
  for(const ref of [partRef,palletRef,capRef])if(ref.current){ref.current.count=count;ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;}
  statsRef.current.frames++;const now=performance.now();if(now-statsRef.current.last>1200){onStats?.({drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,fps:statsRef.current.frames*1000/(now-statsRef.current.last)});statsRef.current={last:now,frames:0};}
 });
 return <><Lighting/><color attach="background" args={['#e2e7db']}/><fog attach="fog" args={['#e2e7db',36,68]}/><ambientLight intensity={.45}/><directionalLight position={[-3,15,8]} intensity={3.1} color="#fffbed" castShadow={quality==='high'} shadow-mapSize={[2048,2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={.5} shadow-camera-far={45} shadow-bias={-.0003} shadow-normalBias={.03}/><directionalLight position={[5,8,-9]} intensity={1.2} color="#c4d9d2"/><hemisphereLight args={['#f4f7ea','#7d8b75',1.0]}/>
 <primitive object={room}/>{[0,1].filter(line=>visible[line]).map(line=>{const z=compact?0:line===0?-2.65:2.65;const result=line===0?base:candidate;return <group key={line}>
 {stationIds.map((id,i)=><Machine key={id} object={clones[line][i]} x={POS[i]} z={z} id={id} onSelect={id=>onSelect(id,line===0?'base':'candidate')} selected={selectedStation===id} bottleneck={result.metrics.bottlenecks.includes(id)}/>)}
 {[0,1].map(i=><primitive key={i} object={conveyors[line*2+i]} position={[(POS[i]+POS[i+1])/2,0,z]}/>)}
 <mesh position={[-5.15,.02,z+1.72]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.85,.54]}/><meshBasicMaterial map={tags[line]} transparent opacity={.84}/></mesh>
 </group>;})}
 <instancedMesh ref={palletRef} args={[undefined,undefined,512]} castShadow><boxGeometry args={[.38,.06,.3]} /><meshStandardMaterial metalness={.35} roughness={.5}/></instancedMesh>
 <instancedMesh ref={partRef} args={[undefined,undefined,512]} castShadow><boxGeometry args={[.29,.13,.22]} /><meshStandardMaterial color="#bec9bf" metalness={.8} roughness={.26}/></instancedMesh>
 <instancedMesh ref={capRef} args={[undefined,undefined,512]}><boxGeometry args={[.15,.145,.07]}/><meshStandardMaterial color="#52665b" metalness={.75} roughness={.3}/></instancedMesh>
 </>;
}
export default function FactoryScene(props:Props){return <Canvas shadows={props.quality==='high'} dpr={props.quality==='low'?1:[1,1.5]} frameloop={props.playing?'always':'demand'} camera={{position:[14,14.5,19],fov:36,near:.1,far:90}} gl={{antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true}} fallback={props.fallbackView}><World {...props}/></Canvas>;}
