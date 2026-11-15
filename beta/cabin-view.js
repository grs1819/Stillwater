import * as THREE from 'three';
import {EXTERIORS,FINISHES} from './blueprints.js';
// Reuse the game's timber beams, cached materials, roofing finishes and details.
export function createCabinView({box,beam,material,roofingMaterial,roofDetails}){
 const group=new THREE.Group(),cache=new Map();
 function dispose(g){g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 function build(b){
  const g=new THREE.Group(),{wall,frame}=EXTERIORS[b.appearance.exterior],finish=FINISHES[b.appearance.roof];
  box(g,1.94,.16,1.94,.5,.08,.5,'#aaa58d');
  box(g,1.82,1.35,1.82,.5,.82,.5,wall);
  for(const x of [-.38,1.38])for(const z of [-.38,1.38])box(g,.12,1.5,.12,x,.88,z,frame);
  for(const z of [-.43,1.43]){
   box(g,1.94,.12,.12,.5,1.5,z,frame);
   beam(g,[-.48,1.5,z],[.5,2.18,z],.1,frame);beam(g,[.5,2.18,z],[1.48,1.5,z],.1,frame);
   beam(g,[.5,1.5,z],[.5,2.15,z],.09,frame);
   for(const x of [-.38,1.38])beam(g,[x,1.12,z],[x+(x<0?.32:-.32),1.48,z],.075,frame);
  }
  for(let i=0;i<9;i++)for(const x of [-.415,1.415])box(g,.025,.025,1.8,x,.28+i*.13,.5,frame);
  // Entrance faces local +Z. The reserved approach tile lies directly ahead.
  box(g,.49,.94,.07,0,.63,1.44,frame);box(g,.35,.8,.08,0,.63,1.49,'#a99067');
  box(g,.045,.045,.035,.11,.66,1.54,'#e8c16e');
  box(g,.68,.1,.3,0,.05,1.62,'#aaa58d');
  for(const [x,z,side]of [[.94,1.44,false],[-.44,.5,true],[1.44,.5,true]]){
   box(g,side?.065:.57,.65,side?.57:.065,x,.95,z,frame);
   box(g,side?.08:.43,.5,side?.43:.08,x,.95,z,'#657e79');
   box(g,side?.09:.035,.5,side?.035:.09,x,.95,z,wall);
  }
  const vertices=[-.55,1.48,-.55,.5,2.22,-.55,.5,2.22,1.55, -.55,1.48,-.55,.5,2.22,1.55,-.55,1.48,1.55, .5,2.22,-.55,1.55,1.48,-.55,1.55,1.48,1.55, .5,2.22,-.55,1.55,1.48,1.55,.5,2.22,1.55];
  // Upward winding lets the existing moss/seam detail generator follow each roof face.
  for(let i=0;i<vertices.length;i+=9){const b=vertices.slice(i+3,i+6);vertices.splice(i+3,3,...vertices.slice(i+6,i+9));vertices.splice(i+6,3,...b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const roof=new THREE.Mesh(geo,roofingMaterial(finish.color,finish.tier));roof.castShadow=true;roof.receiveShadow=true;g.add(roof);roofDetails(g,vertices,finish.tier,finish.color);
  // Solid gables behind the visible trusses.
  for(const z of [-.41,1.41]){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.4,1.49,z,1.4,1.49,z,.5,2.13,z, .5,2.13,z,1.4,1.49,z,-.4,1.49,z],3));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,material(wall)));
  }
  g.traverse(o=>{if(o.isMesh)o.userData={buildingId:b.id,position:[...b.position.slice(0,1),0,b.position[1]]};});
  return g;
 }
 return {group,update(buildings,height){
  const ids=new Set(buildings.map(b=>b.id));for(const [id,entry]of cache)if(!ids.has(id)){group.remove(entry.mesh);dispose(entry.mesh);cache.delete(id);}
  for(const b of buildings){const signature=JSON.stringify(b.appearance);let entry=cache.get(b.id);if(entry?.signature!==signature){if(entry){group.remove(entry.mesh);dispose(entry.mesh);}entry={signature,mesh:build(b)};cache.set(b.id,entry);group.add(entry.mesh);}
   entry.mesh.position.set(b.position[0],height(...b.position),b.position[1]);entry.mesh.rotation.y=b.rotation*Math.PI/2;
  }
  group.updateMatrixWorld(true);const targets=[];group.traverse(o=>{if(o.isMesh)targets.push(o);});return targets;
 }};
}
