import * as THREE from 'three';
import {EXTERIORS,FINISHES,DESIGNS} from './blueprints.js';
// Reuse the game's timber beams, cached materials, roofing finishes and details.
export function createCabinView({box,beam,material,roofingMaterial,roofDetails},preview=false){
 const group=new THREE.Group(),cache=new Map();
 const previewMaterials=new Map();let valid=true,hiddenId=null;
 function previewMaterial(source){
  if(!previewMaterials.has(source)){const copy=source.clone();copy.transparent=true;copy.opacity=.57;copy.depthWrite=false;copy.side=THREE.DoubleSide;previewMaterials.set(source,copy);}
  return previewMaterials.get(source);
 }
 const outlineMaterial=preview?new THREE.LineBasicMaterial({color:0x507e57,transparent:true,opacity:.9}):null;
 function dispose(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 function build(b){
  const g=new THREE.Group(),{wall,frame}=EXTERIORS[b.appearance.exterior],finish=FINISHES[b.appearance.roof],design=DESIGNS[b.design],peak=design.peak,cottage=b.design==='woodland',lodge=b.design==='craftsman',half=design.wallWidth/2,lo=.5-half,hi=.5+half;
  g.userData={design:b.design,appearance:{...b.appearance}};
  box(g,1.94,.16,1.94,.5,.08,.5,'#aaa58d');
  box(g,design.wallWidth,1.35,design.wallWidth,.5,.82,.5,wall);
  for(const x of [lo+.03,hi-.03])for(const z of [lo+.03,hi-.03])box(g,.12,1.5,.12,x,.88,z,frame);
  for(const z of [lo-.02,hi+.02]){
   box(g,design.wallWidth+.1,.12,.12,.5,1.5,z,frame);
   beam(g,[lo-.03,1.5,z],[.5,peak-.04,z],.1,frame);beam(g,[.5,peak-.04,z],[hi+.03,1.5,z],.1,frame);
   beam(g,[.5,1.5,z],[.5,peak-.07,z],.09,frame);
   for(const x of [lo+.03,hi-.03])beam(g,[x,1.12,z],[x+(x<0?.32:-.32),1.48,z],.075,frame);
  }
  for(let i=0;i<9;i++)for(const x of [lo-.005,hi+.005])box(g,.025,.025,design.wallWidth,x,.28+i*.13,.5,frame);
  // Entrance faces local +Z. The reserved approach tile lies directly ahead.
  box(g,.49,.94,.07,0,.63,hi+.02,frame);box(g,.35,.8,.08,0,.63,hi+.06,'#a99067');
  box(g,.045,.045,.035,.11,.66,hi+.11,'#e8c16e');
  box(g,.68,.1,.3,0,.05,1.62,'#aaa58d');
  for(const [x,z,side]of [[.94,hi+.025,false],[lo-.025,.5,true],[hi+.025,.5,true]]){
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
  if(cottage){
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
  if(lodge){
   for(const z of [lo-.045,hi+.045]){box(g,design.wallWidth+.12,.09,.07,.5,.22,z,'#e4d6b5');box(g,design.wallWidth+.12,.09,.07,.5,1.38,z,'#e4d6b5');}
   for(const x of [lo-.02,hi+.02])for(const z of [lo+.16,hi-.16])beam(g,[x,1.12,z],[x+(x<.5?-.11:.11),1.48,z],.08,frame);
   box(g,.34,2.16,.32,1.09,1.08,-.05,'#969487');
   for(let i=0;i<12;i++)box(g,.35,.025,.33,1.09,.14+i*.17,-.05,'#777d72');
   box(g,.44,.12,.42,1.09,2.21,-.05,'#747b72');
  }
  g.traverse(o=>{if(o.isMesh&&preview){o.material=previewMaterial(o.material);o.castShadow=false;o.receiveShadow=false;}if(o.isMesh)o.userData={buildingId:b.id,position:[...b.position.slice(0,1),0,b.position[1]]};});
  if(preview){
   for(const mesh of [g.children[1],roof,g.children.find(o=>o.isMesh&&o.geometry.parameters?.height===.94)]){
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),outlineMaterial);outline.position.copy(mesh.position);outline.quaternion.copy(mesh.quaternion);g.add(outline);
   }
  }
  return g;
 }
 return {group,setHidden(id){hiddenId=id;for(const [key,entry]of cache)entry.mesh.visible=key!==id;},setValid(next){valid=next;if(preview){for(const [source,copy]of previewMaterials){copy.color.copy(source.color);if(!valid)copy.color.lerp(new THREE.Color('#d78469'),.7);}outlineMaterial.color.set(valid?'#507e57':'#b95c48');}},update(buildings,height){
  const ids=new Set(buildings.map(b=>b.id));for(const [id,entry]of cache)if(!ids.has(id)){group.remove(entry.mesh);dispose(entry.mesh);cache.delete(id);}
  for(const b of buildings){const signature=JSON.stringify([b.definitionVersion,b.design,b.appearance]);let entry=cache.get(b.id);if(entry?.signature!==signature){if(entry){group.remove(entry.mesh);dispose(entry.mesh);}entry={signature,mesh:build(b)};cache.set(b.id,entry);group.add(entry.mesh);}
   entry.mesh.visible=b.id!==hiddenId;entry.mesh.position.set(b.position[0],height(...b.position),b.position[1]);entry.mesh.rotation.y=b.rotation*Math.PI/2;
  }
  group.updateMatrixWorld(true);const targets=[];group.traverse(o=>{if(o.isMesh)targets.push(o);});return targets;
 }};
}
