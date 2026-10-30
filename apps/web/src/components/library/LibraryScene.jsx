import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';

const damp=(a,b,l,d)=>THREE.MathUtils.damp(a,b,l,d);

function coverTexture(book){
  const canvas=document.createElement('canvas'); canvas.width=640;canvas.height=960;
  const c=canvas.getContext('2d'); const w=640,h=960;
  c.fillStyle=book.color;c.fillRect(0,0,w,h);
  // subtle cloth variation, seeded so texture remains stable between renders
  let seed=book.id.length*999; const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(let i=0;i<21000;i++){let x=random()*w,y=random()*h; c.fillStyle=random()>.5?'rgba(255,241,208,.025)':'rgba(15,10,8,.035)'; c.fillRect(x,y,random()*2+.5,random()*5+.5)}
  c.strokeStyle=book.accent;c.globalAlpha=.65;c.lineWidth=2;c.strokeRect(27,27,w-54,h-54);c.lineWidth=1;c.strokeRect(37,37,w-74,h-74);
  // restrained embossed motif, unique to each publication
  c.save(); c.translate(320,510); c.strokeStyle=book.accent;c.fillStyle=book.accent;c.lineWidth=2;c.globalAlpha=.85;
  const circle=(x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke()};
  if(book.motif==='botanical'){
    c.beginPath();c.moveTo(-5,155);c.bezierCurveTo(-20,70,25,-45,0,-155);c.stroke();
    for(let i=0;i<7;i++){let y=115-i*39, side=i%2?1:-1;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(side*40,y-56,side*100,y-48,side*95,y-72);c.bezierCurveTo(side*55,y-75,side*15,y-55,0,y);c.stroke()}
    circle(0,0,175);
  } else if(book.motif==='sun') {circle(0,0,75);circle(0,0,138); for(let i=0;i<24;i++){let a=i*Math.PI/12;c.beginPath();c.moveTo(Math.cos(a)*95,Math.sin(a)*95);c.lineTo(Math.cos(a)*125,Math.sin(a)*125);c.stroke()}circle(0,0,165)}
  else if(book.motif==='stars'){circle(0,0,158);circle(0,0,120); c.beginPath();[[-90,35],[-45,-45],[10,-12],[65,-92],[101,28],[25,78],[-45,65],[-90,35]].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();[[-90,35],[-45,-45],[10,-12],[65,-92],[101,28],[25,78],[-45,65]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,4,0,7);c.fill()})}
  else if(book.motif==='arch'){for(let i=0;i<4;i++){let x=-125+i*83;c.beginPath();c.moveTo(x,125);c.lineTo(x,-5);c.arc(x+40,-5,40,Math.PI,0);c.lineTo(x+80,125);c.stroke()}c.beginPath();c.moveTo(-150,126);c.lineTo(150,126);c.moveTo(-150,140);c.lineTo(150,140);c.stroke()}
  else if(book.motif==='forms'){circle(-45,-38,88);c.strokeRect(-10,-90,150,150);c.beginPath();c.moveTo(-140,110);c.lineTo(0,-130);c.lineTo(140,110);c.closePath();c.stroke()}
  else {for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/6);c.strokeRect(-90,-90,180,180);c.restore()}circle(0,0,165);circle(0,0,65)}
  c.restore();c.globalAlpha=1;c.textAlign='center';c.fillStyle=book.accent;
  c.font='500 20px Georgia';c.letterSpacing='4px';c.fillText(book.category,320,115);c.letterSpacing='0px';
  c.font='500 53px Georgia'; const words=book.title.split(' '); let lines=[],line=''; words.forEach(word=>{let test=line?line+' '+word:word;if(c.measureText(test).width>500&&line){lines.push(line);line=word}else line=test});lines.push(line); lines.forEach((l,i)=>c.fillText(l,320,192+i*59));
  c.globalAlpha=.8;c.font='italic 22px Georgia';c.fillText(book.subtitle,320,820);c.font='18px Georgia';c.letterSpacing='3px';c.fillText('THE READING ROOM',320,878);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  if(book.coverImage){const image=new Image(); image.crossOrigin='anonymous'; image.onload=()=>{c.globalAlpha=1;c.drawImage(image,0,0,w,h);texture.needsUpdate=true};image.src=book.coverImage;}
  return texture;
}
function spineTexture(book){const c=document.createElement('canvas');c.width=160;c.height=960;const x=c.getContext('2d');x.fillStyle=book.color;x.fillRect(0,0,160,960);x.strokeStyle=book.accent;x.globalAlpha=.8;x.lineWidth=2;x.strokeRect(16,20,128,920);[80,115,840,875].forEach(y=>{x.beginPath();x.moveTo(20,y);x.lineTo(140,y);x.stroke()});x.fillStyle=book.accent;x.textAlign='center';x.translate(80,480);x.rotate(-Math.PI/2);x.font='32px Georgia';x.fillText(book.title.toUpperCase(),0,10);let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function Box({position,scale,color='#2b1c15',metalness=0,roughness=.8, ...props}){return <mesh position={position} receiveShadow castShadow {...props}><boxGeometry args={scale}/><meshStandardMaterial color={color} roughness={roughness} metalness={metalness}/></mesh>}
function Library({mobile}){
 const shelfYs=[-1.1,1.85,4.8,-4.05];
 return <group>
   <Box position={[0,0,-1.35]} scale={[30,20,.8]} color="#1b100b"/>
   {/* recessed dark panels and architectural uprights */}
   {[-8.3,-4.2,0,4.2,8.3].map((x,i)=><group key={i}><Box position={[x,1,-.75]} scale={[.22,13,.7]} color="#352116"/><Box position={[x-.13,1,-.34]} scale={[.035,13,.06]} color="#a17c47" metalness={.55}/><Box position={[x+.13,1,-.34]} scale={[.035,13,.06]} color="#a17c47" metalness={.55}/></group>)}
   {shelfYs.map((y,i)=><group key={y}><Box position={[0,y,-.05]} scale={[20,.18,2.2]} color="#4b3021"/><Box position={[0,y+.105,.86]} scale={[20,.035,.06]} color="#b08a50" metalness={.65}/><Box position={[0,y-.14,.9]} scale={[20,.12,.15]} color="#2a190f"/><Box position={[0,y-.26,.86]} scale={[20,.07,.23]} color="#6a4629"/></group>)}
   <Box position={[0,5.55,-.2]} scale={[20,.33,1.8]} color="#422919"/><Box position={[0,5.37,.7]} scale={[20,.06,.12]} color="#b38f56" metalness={.6}/>
   {/* Books on the upper and lower shelves are deliberately secondary to the collection. */}
   {[2.03,-3.9].map((base,row)=><group key={row}>{Array.from({length:54},(_,i)=>{let x=-9.65+i*.36;let height=1.35+((i*17%7)/10); let colors=['#3c2920','#58402f','#30362d','#4c3530','#554934','#292b2a','#68513b'];return <group key={i}><Box position={[x,base+height/2,-.65]} scale={[.29,height,.7]} color={colors[(i*3+row)%colors.length]}/><Box position={[x,base+height*.76,-.285]} scale={[.24,.018,.012]} color="#a08660" metalness={.3}/><Box position={[x,base+height*.23,-.285]} scale={[.24,.018,.012]} color="#a08660" metalness={.3}/></group>})}</group>)}
   {/* side pilasters */}
   {[-10,10].map(x=><group key={x}><Box position={[x,0,.05]} scale={[.68,14,1.5]} color="#3a2417"/><Box position={[x,0,.84]} scale={[.48,14,.08]} color="#50311e"/>{[-.16,0,.16].map(a=><Box key={a} position={[x+a,0,.9]} scale={[.025,13,.035]} color="#24150e"/>)}<Box position={[x,4.7,.7]} scale={[1,.3,1.8]} color="#654328"/><Box position={[x,-4,.7]} scale={[1,.3,1.8]} color="#654328"/></group>)}
   <ambientLight intensity={.7} color="#ffe4bc"/><hemisphereLight args={['#ffe2b1','#24140b',.8]}/>
   <directionalLight position={[-4,7,8]} intensity={2.1} color="#ffe0b0"/>
   <pointLight position={[0,3,4]} intensity={55} distance={18} color="#ffc87c"/>
   <pointLight position={[-7,1,3]} intensity={20} distance={12} color="#e7a45e"/>
   <pointLight position={[7,1,3]} intensity={18} distance={12} color="#e7a45e"/>
 </group>
}
function Book({book,index,selected,anySelected,onSelect,mobile,resetSignal,reduced}){
 const group=useRef(), drag=useRef(null), rot=useRef({x:0,y:0,vx:0,vy:0}); const hovered=useRef(false);const [hover,setHover]=useState(false);
 const cover=useMemo(()=>coverTexture(book),[book]); const spine=useMemo(()=>spineTexture(book),[book]);
 useEffect(()=>()=>{cover.dispose();spine.dispose()},[cover,spine]);
 useEffect(()=>{rot.current={x:0,y:0,vx:0,vy:0}},[resetSignal,selected]);
 const width=1.22, height=1.91, depth=.23+(index%3)*.035;
 const x=mobile ? (index%3-1)*1.5 : (index-2.5)*1.52;
 const y=mobile ? (index<3?.04:-2.91) : .04;
 useFrame((state,dt)=>{if(!group.current)return; dt=Math.min(dt,.05); const g=group.current; const focus=selected; let tx=focus?(mobile?0:-2.55):x;let ty=focus?(mobile?1.65:.35):y;let tz=focus?(mobile?7.5:5.5):(hovered.current&&!anySelected?.2:0);
 const speed=reduced?20:3.9;g.position.x=damp(g.position.x,tx,speed,dt);g.position.y=damp(g.position.y,ty,speed,dt);g.position.z=damp(g.position.z,tz,speed,dt);
 if(focus&&!drag.current){rot.current.x=THREE.MathUtils.clamp(rot.current.x+rot.current.vx*dt,-.45,.45);rot.current.y=THREE.MathUtils.clamp(rot.current.y+rot.current.vy*dt,-1.25,1.25);rot.current.vx*=Math.pow(.08,dt);rot.current.vy*=Math.pow(.08,dt)}
 g.rotation.x=damp(g.rotation.x,focus?rot.current.x:0,6,dt);g.rotation.y=damp(g.rotation.y,focus?(-.14+rot.current.y):0,6,dt);g.rotation.z=damp(g.rotation.z,focus?0:(hovered.current&&!anySelected?.012:0),6,dt);
 });
 const down=e=>{e.stopPropagation();if(selected){e.target.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY};rot.current.vx=0;rot.current.vy=0}else if(!anySelected){onSelect(book.id)}};
 const move=e=>{if(!selected||!drag.current)return;e.stopPropagation();let dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};rot.current.y=THREE.MathUtils.clamp(rot.current.y+dx*.008,-1.25,1.25);rot.current.x=THREE.MathUtils.clamp(rot.current.x+dy*.006,-.45,.45);rot.current.vy=dx*.045;rot.current.vx=dy*.035};
 return <group ref={group} position={[x,y,0]} onPointerOver={e=>{e.stopPropagation();hovered.current=true;setHover(true);document.body.style.cursor=selected?'grab':anySelected?'default':'pointer'}} onPointerOut={()=>{hovered.current=false;setHover(false);document.body.style.cursor='auto'}} onPointerDown={down} onPointerMove={move} onPointerUp={e=>{if(drag.current){e.stopPropagation();drag.current=null;try{e.target.releasePointerCapture(e.pointerId)}catch{}}}}>
  {/* Individual meshes give the book a real page block, cover boards and spine. */}
  <Box position={[0,0,0]} scale={[width-.045,height-.065,depth-.015]} color="#d3c5a6" roughness={.95}/>
  {Array.from({length:8},(_,i)=><Box key={i} position={[width/2-.018,-.01,-depth/2+.035+i*(depth-.05)/7]} scale={[.008,height-.08,.005]} color="#a99b7e"/>)}
  <Box position={[0,0,-depth/2]} scale={[width,height,.035]} color={book.color}/>
  <mesh position={[0,0,depth/2+.01]} castShadow><boxGeometry args={[width,height,.04]}/><meshStandardMaterial color={hover&&!anySelected?'#fff9ea':'#ffffff'} map={cover} roughness={.87}/></mesh>
  <mesh position={[-width/2,0,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[depth,height]}/><meshStandardMaterial map={spine} roughness={.9}/></mesh>
  <Box position={[-width/2+.025,0,depth/2+.035]} scale={[.012,height-.04,.006]} color={book.accent} metalness={.4}/>
 </group>
}
function CameraRig({selected,mobile,reduced}){const {camera}=useThree();useFrame((state,dt)=>{let targetZ=mobile?17:13;camera.position.z=damp(camera.position.z,targetZ-(selected?.2:0),reduced?20:2,dt);camera.position.x=damp(camera.position.x,selected&&!mobile?-.18:0,2,dt);camera.position.y=damp(camera.position.y,mobile?.2:.4,2,dt);camera.lookAt(0,mobile?0:.35,0)});return null}
export default function LibraryScene({books,selected,onSelect,mobile,resetSignal,reduced}){return <><color attach="background" args={['#18100b']}/><fog attach="fog" args={['#18100b',16,35]}/><Library mobile={mobile}/><CameraRig selected={selected} mobile={mobile} reduced={reduced}/>{books.map((b,i)=><Book key={b.id} book={b} index={i} selected={selected===b.id} anySelected={!!selected} onSelect={onSelect} mobile={mobile} resetSignal={resetSignal} reduced={reduced}/>)}</>}
