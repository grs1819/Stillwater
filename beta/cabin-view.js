import * as THREE from 'three';
import {EXTERIORS,FINISHES,DESIGNS,SHOP} from './blueprints.js';
// Reuse the game's timber beams, cached materials, roofing finishes and details.
export function createCabinView({box,beam,material,roofingMaterial,roofDetails},preview=false){
 const group=new THREE.Group(),cache=new Map();
 const previewMaterials=new Map();let valid=true,hiddenId=null;
 const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=64;
 const ink=signCanvas.getContext('2d');ink.fillStyle='#796044';ink.fillRect(0,0,256,64);ink.fillStyle='#f0dfb7';ink.font='bold 32px Georgia';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('SUPPLIES',128,34);
 const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 const signMaterial=new THREE.MeshStandardMaterial({map:signTexture,roughness:1});
 const glassGlint=new THREE.MeshBasicMaterial({color:'#eff2df',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
 const shopGlass=new THREE.MeshStandardMaterial({color:'#b5d9d2',transparent:true,opacity:.16,roughness:.2,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
 function previewMaterial(source){
  if(!previewMaterials.has(source)){const copy=source.clone();copy.transparent=true;copy.opacity=Math.min(source.opacity,.57);copy.depthWrite=false;copy.side=THREE.DoubleSide;previewMaterials.set(source,copy);}
  return previewMaterials.get(source);
 }
 const outlineMaterial=preview?new THREE.LineBasicMaterial({color:0x507e57,transparent:true,opacity:.9}):null;
 function dispose(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 function build(b){
  const shop=b.blueprint===SHOP.id,upgraded=b.gameplay.businessLevel===1;
  const g=new THREE.Group(),{wall,frame}=EXTERIORS[b.appearance.exterior],finish=FINISHES[b.appearance.roof],design=DESIGNS[b.design],peak=design.peak,cottage=b.design==='woodland',lodge=b.design==='craftsman',half=design.wallWidth/2,lo=.5-half,hi=.5+half;
  g.userData={blueprint:b.blueprint,design:b.design,appearance:{...b.appearance}};
  box(g,1.94,.16,1.94,.5,.08,.5,'#aaa58d');
  if(shop){
   // Hollow shell with a glazed front and return, not glass laid over an opaque cube.
   box(g,design.wallWidth,.06,design.wallWidth,.5,.19,.5,'#b59972');
   box(g,design.wallWidth,1.35,.1,.5,.82,lo+.04,wall);
   box(g,.1,1.35,design.wallWidth,lo+.04,.82,.5,wall);
   box(g,.1,1.35,.65,hi-.04,.82,lo+.325,wall);
   box(g,.1,.25,design.wallWidth,hi-.04,.3,.5,wall);
   box(g,design.wallWidth,.25,.1,.5,.3,hi-.11,wall);
   box(g,design.wallWidth,.1,design.wallWidth,.5,1.43,.5,'#d5c49a');
  }else box(g,design.wallWidth,1.35,design.wallWidth,.5,.82,.5,wall);
  for(const x of [lo+.03,hi-.03])for(const z of [lo+.03,hi-.03])box(g,.12,1.5,.12,x,.88,z,frame);
  for(const z of [lo-.02,hi+.02]){
   box(g,design.wallWidth+.1,.12,.12,.5,1.5,z,frame);
   beam(g,[lo-.03,1.5,z],[.5,peak-.04,z],.1,frame);beam(g,[.5,peak-.04,z],[hi+.03,1.5,z],.1,frame);
   beam(g,[.5,1.5,z],[.5,peak-.07,z],.09,frame);
   for(const x of [lo+.03,hi-.03])beam(g,[x,1.12,z],[x+(x<0?.32:-.32),1.48,z],.075,frame);
  }
  for(let i=0;i<9;i++)for(const x of (shop?[lo-.005]:[lo-.005,hi+.005]))box(g,.025,.025,design.wallWidth,x,.28+i*.13,.5,frame);
  // Entrance faces local +Z. The reserved approach tile lies directly ahead.
  if(!shop){box(g,.49,.94,.07,0,.63,hi+.02,frame);box(g,.35,.8,.08,0,.63,hi+.06,'#a99067');
  box(g,.045,.045,.035,.11,.66,hi+.11,'#e8c16e');}
  box(g,.68,.1,.3,0,.05,1.62,'#aaa58d');
  for(const [x,z,side]of (shop?[]:[[.94,hi+.025,false],[lo-.025,.5,true],[hi+.025,.5,true]])){
   box(g,side?.065:(lodge?.72:.57),lodge?.82:.65,side?(lodge?.96:.57):.065,x,.95,z,frame);
   box(g,side?.08:(lodge?.58:.43),lodge?.67:.5,side?(lodge?.82:.43):.08,x,.95,z,'#657e79');
   box(g,side?.09:.035,lodge?.67:.5,side?.035:.09,x,.95,z,wall);
  }
  const left=-design.eave,right=1+design.eave,back=-.49,front=1.49;
  const vertices=[left,1.48,back,.5,peak,back,.5,peak,front, left,1.48,back,.5,peak,front,left,1.48,front, .5,peak,back,right,1.48,back,right,1.48,front, .5,peak,back,right,1.48,front,.5,peak,front];
  // Upward winding lets the existing moss/seam detail generator follow each roof face.
  for(let i=0;i<vertices.length;i+=9){const b=vertices.slice(i+3,i+6);vertices.splice(i+3,3,...vertices.slice(i+6,i+9));vertices.splice(i+6,3,...b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const roof=new THREE.Mesh(geo,roofingMaterial(finish.color,finish.tier));roof.castShadow=true;roof.receiveShadow=true;g.add(roof);const detailVertices=vertices.map((v,i)=>i%3===0?.5+(v-.5)*.9:i%3===2?.5+(v-.5)*.9:v);
  for(let i=0;i<detailVertices.length;i+=3)detailVertices[i+1]=peak-Math.abs(detailVertices[i]-.5)*(peak-1.48)/(.5+design.eave);
  roofDetails(g,detailVertices,finish.tier,finish.color);
  // Solid gables behind the visible trusses.
  for(const z of [lo,hi]){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([lo,1.49,z,hi,1.49,z,.5,peak-.09,z, .5,peak-.09,z,hi,1.49,z,lo,1.49,z],3));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,material(wall)));
  }
  if(cottage&&!shop){
   // All flower boxes remain inside the common footprint; the porch uses the reserved entrance.
   box(g,.58,.13,.13,.94,.57,hi+.045,frame);
   for(let i=0;i<5;i++){
    box(g,.035,.15,.035,.72+i*.1,.69,hi+.045,'#69815a');
    box(g,.075,.065,.075,.72+i*.1,.78+(i%2)*.04,hi+.045,i%2?'#e6be93':'#c58f94');
   }
   for(const x of [-.31,.31]){box(g,.07,1.12,.07,x,.62,1.69,frame);beam(g,[x,.92,1.69],[0,1.35,1.69],.065,frame);}
   const canopy=box(g,.77,.08,.48,0,1.32,1.64,finish.color);canopy.rotation.x=.13;
   for(const z of [lo-.025,hi+.025])for(const x of [lo+.1,hi-.1])beam(g,[x,1.52,z],[.5,peak-.18,z],.06,frame);
  }
  if(lodge&&!shop){
   for(const z of [lo-.045,hi+.045]){box(g,design.wallWidth+.12,.09,.07,.5,.22,z,'#e4d6b5');box(g,design.wallWidth+.12,.09,.07,.5,1.38,z,'#e4d6b5');}
   for(const x of [lo-.02,hi+.02])for(const z of [lo+.16,hi-.16])beam(g,[x,1.12,z],[x+(x<.5?-.11:.11),1.48,z],.08,frame);
   box(g,.34,2.16,.32,1.09,1.08,-.05,'#969487');
   for(let i=0;i<12;i++)box(g,.35,.025,.33,1.09,.14+i*.17,-.05,'#777d72');
   box(g,.44,.12,.42,1.09,2.21,-.05,'#747b72');
  }
  if(shop){
   const frontZ=hi-.05,windowLeft=.32,windowRight=hi-.08,windowWidth=windowRight-windowLeft,windowX=(windowRight+windowLeft)/2;
   function pane(w,h,x,y,z,side=false){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),shopGlass);m.name='shop-glass';m.position.set(x,y,z);if(side)m.rotation.y=Math.PI/2;g.add(m);
    const glint=new THREE.Mesh(new THREE.PlaneGeometry(.024,h*.45),glassGlint);glint.name='shop-glint';glint.position.set(x+(side?.004:w*.18),y+.1,z+(side?-w*.18:.004));if(side)glint.rotation.y=Math.PI/2;glint.rotateZ(-.35);g.add(glint);
   }
   // Door and approach stay in the original location.
   for(const x of [-.25,.25])box(g,.065,1.16,.09,x,.79,frontZ,frame);
   for(const y of [.24,1.34])box(g,.56,.065,.09,0,y,frontZ,frame);
   box(g,.44,.23,.08,0,.36,frontZ,wall);pane(.43,.81,0,.88,frontZ+.015);
   box(g,.035,.17,.055,.16,.77,frontZ+.06,'#dfbb76');
   for(const x of [windowLeft,windowRight])box(g,.055,1.02,.09,x,.87,frontZ,frame);
   for(const y of [.38,1.36])box(g,windowWidth+.08,.065,.11,windowX,y,frontZ,frame);
   pane(windowWidth-.045,.91,windowX,.87,frontZ+.015);
   const sideStart=lo+.7,sideEnd=frontZ,sideWidth=sideEnd-sideStart;
   for(const z of [sideStart,sideEnd])box(g,.09,1.02,.055,hi-.025,.87,z,frame);
   for(const y of [.38,1.36])box(g,.11,.065,sideWidth,hi-.025,y,(sideStart+sideEnd)/2,frame);
   pane(sideWidth-.05,.91,hi+.022,.87,(sideStart+sideEnd)/2,true);
   const display=new THREE.Group();display.name='shop-display';g.add(display);
   for(const y of [.48,.89])box(display,windowWidth-.05,.055,.36,windowX,y,frontZ-.28,frame);
   for(let row=0;row<2;row++)for(let i=0;i<3;i++){
    const x=windowLeft+.15+i*(windowWidth-.25)/3,y=.59+row*.41,z=frontZ-.22;
    box(display,.13,.16,.14,x,y,z,['#b88b67','#7b966b','#e0c995'][(i+row)%3]);
    box(display,.14,.025,.15,x,y+.09,z,'#e8d9b3');box(display,.055,.065,.006,x,y,z+.074,'#e9dfc4');
   }
   box(display,.25,.06,.6,hi-.24,.55,.55,frame);
   for(let i=0;i<3;i++){
    const roll=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.22,8),material(['#8c9f7a','#c29a77','#a5b8b1'][i]));roll.rotation.z=Math.PI/2;roll.position.set(hi-.24,.65,.35+i*.19);roll.castShadow=true;display.add(roll);
   }
   if(upgraded){
    const extra=new THREE.Group();extra.name='shop-expanded-shelves';display.add(extra);
    for(const y of [.65,1.03]){
     box(extra,.75,.05,.24,.55,y,lo+.3,frame);
     for(let i=0;i<4;i++)box(extra,.12,.18,.13,.28+i*.18,y+.12,lo+.32,i%2?'#bca47a':'#87956f');
    }
   }
   for(let i=0;i<8;i++){
    const awning=box(g,.22,.065,.34,-.27+i*.22,1.48,1.3,i%2?finish.color:'#d8c59c');awning.rotation.x=.12;
   }
   box(g,1.8,.2,.07,.5,1.43,1.46,frame);
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.18),signMaterial);sign.position.set(.5,1.43,1.497);g.add(sign);
  }else if(upgraded){
   // A small welcome lantern marks the comfort upgrade without changing clearance.
   box(g,.12,.2,.12,-.32,1.1,hi+.05,'#d9b66d');
   box(g,.16,.04,.16,-.32,1.22,hi+.05,frame);
  }
  g.traverse(o=>{if(o.isMesh&&preview){o.material=previewMaterial(o.material);o.castShadow=false;o.receiveShadow=false;}if(o.isMesh)o.userData={buildingId:b.id,position:[...b.position.slice(0,1),0,b.position[1]]};});
  if(preview){
   for(const mesh of [g.children[1],roof,g.children.find(o=>o.isMesh&&o.geometry.parameters?.height===.94)].filter(Boolean)){
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),outlineMaterial);outline.position.copy(mesh.position);outline.quaternion.copy(mesh.quaternion);g.add(outline);
   }
  }
  return g;
 }
 return {group,setHidden(id){hiddenId=id;for(const [key,entry]of cache)entry.mesh.visible=key!==id;},setValid(next){valid=next;if(preview){for(const [source,copy]of previewMaterials){copy.color.copy(source.color);if(!valid)copy.color.lerp(new THREE.Color('#d78469'),.7);}outlineMaterial.color.set(valid?'#507e57':'#b95c48');}},update(buildings,height){
  const ids=new Set(buildings.map(b=>b.id));for(const [id,entry]of cache)if(!ids.has(id)){group.remove(entry.mesh);dispose(entry.mesh);cache.delete(id);}
  for(const b of buildings){const signature=JSON.stringify([b.blueprint,b.definitionVersion,b.design,b.appearance,b.gameplay.businessLevel||0]);let entry=cache.get(b.id);if(entry?.signature!==signature){if(entry){group.remove(entry.mesh);dispose(entry.mesh);}entry={signature,mesh:build(b)};cache.set(b.id,entry);group.add(entry.mesh);}
   entry.mesh.visible=b.id!==hiddenId;entry.mesh.position.set(b.position[0],height(...b.position),b.position[1]);entry.mesh.rotation.y=b.rotation*Math.PI/2;
  }
  group.updateMatrixWorld(true);const targets=[];group.traverse(o=>{if(o.isMesh)targets.push(o);});return targets;
 }};
}
