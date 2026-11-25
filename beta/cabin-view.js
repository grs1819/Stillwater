import * as THREE from 'three';
import {EXTERIORS,FINISHES,DESIGNS,SHOP,CAFE} from './blueprints.js?v=cosy-upgrades-1';
// Reuse the game's timber beams, cached materials, roofing finishes and details.
export function createCabinView({box,beam,material,roofingMaterial,roofDetails},preview=false){
 const group=new THREE.Group(),cache=new Map();
 const previewMaterials=new Map();let valid=true,hiddenId=null;
 const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=64;
 const ink=signCanvas.getContext('2d');ink.fillStyle='#796044';ink.fillRect(0,0,256,64);ink.fillStyle='#f0dfb7';ink.font='bold 32px Georgia';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('SUPPLIES',128,34);
 const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 const signMaterial=new THREE.MeshStandardMaterial({map:signTexture,roughness:1});
 const outfitterCanvas=signCanvas.cloneNode();const outfitterInk=outfitterCanvas.getContext('2d');outfitterInk.fillStyle='#47604b';outfitterInk.fillRect(0,0,256,64);outfitterInk.fillStyle='#f0dfb7';outfitterInk.font='bold 29px Georgia';outfitterInk.textAlign='center';outfitterInk.textBaseline='middle';outfitterInk.fillText('OUTFITTERS',128,34);
 const outfitterTexture=new THREE.CanvasTexture(outfitterCanvas);outfitterTexture.colorSpace=THREE.SRGBColorSpace;
 const outfitterMaterial=new THREE.MeshStandardMaterial({map:outfitterTexture,roughness:1});
 const cafeCanvas=signCanvas.cloneNode(),cafeInk=cafeCanvas.getContext('2d');cafeInk.fillStyle='#303c39';cafeInk.fillRect(0,0,256,64);cafeInk.fillStyle='#fff0cb';cafeInk.font='bold 30px Georgia';cafeInk.textAlign='center';cafeInk.textBaseline='middle';cafeInk.fillText('WOODLAND CAFÉ',128,34);
 const cafeTexture=new THREE.CanvasTexture(cafeCanvas);cafeTexture.colorSpace=THREE.SRGBColorSpace;const cafeSign=new THREE.MeshStandardMaterial({map:cafeTexture,roughness:1});
 const glassGlint=new THREE.MeshBasicMaterial({color:'#eff2df',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
 const shopGlass=new THREE.MeshStandardMaterial({color:'#b5d9d2',transparent:true,opacity:.16,roughness:.2,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
 function previewMaterial(source){
  if(!previewMaterials.has(source)){const copy=source.clone();copy.transparent=true;copy.opacity=Math.min(source.opacity,.57);copy.depthWrite=false;copy.side=THREE.DoubleSide;previewMaterials.set(source,copy);}
  return previewMaterials.get(source);
 }
 const outlineMaterial=preview?new THREE.LineBasicMaterial({color:0x507e57,transparent:true,opacity:.9}):null;
 function dispose(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 function cottagePeak(id){return id==='woodland'?2.48:id==='craftsman'?2.28:2.32;}
 function build(b){
  const cafe=b.blueprint===CAFE.id,shop=cafe||b.blueprint===SHOP.id,level=b.gameplay.businessLevel||0,suite=level===3||!!b.gameplay.premiumSuite,story=b.gameplay.secondStory?1.15:0,upgraded=level>0||!!b.gameplay.frontPorch||suite;
  const g=new THREE.Group(),{wall}=EXTERIORS[b.appearance.exterior],frame=cafe?'#343e3b':EXTERIORS[b.appearance.exterior].frame,finish=FINISHES[b.appearance.roof],design=DESIGNS[b.design],peak=(cottagePeak(b.design))-(cafe?.18:0)+((level>=2||b.gameplay.loft)?(shop?.12:.56):0)+(level===3?.12:0),cottage=b.design==='woodland',lodge=b.design==='craftsman',half=design.wallWidth/2,lo=.5-half,hi=.5+half,frontWall=hi-(upgraded&&!shop?.28:0),wallDepth=design.wallWidth-(upgraded&&!shop?.28:0);
  g.userData={blueprint:b.blueprint,design:b.design,appearance:{...b.appearance},businessLevel:level};
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
  }else box(g,design.wallWidth,1.35,wallDepth,.5,.82,.5-(upgraded?.14:0),wall);
  for(const x of [lo+.03,hi-.03])for(const z of [lo+.03,hi-.03])box(g,cafe?.075:.12,1.5,cafe?.075:.12,x,.88,z,frame);
  for(const z of [lo-.02,hi+.02]){
   box(g,design.wallWidth+.1,.12,.12,.5,1.5,z,frame);
   if(!cafe&&!(suite&&z>0)&&!story)beam(g,[.5,1.5,z],[.5,peak-.07,z],.065,frame);
   if(!cafe)for(const x of [lo+.03,hi-.03])beam(g,[x,1.23,z],[x+(x<.5?.20:-.20),1.48,z],.055,frame);
  }
  // Subtle board joints instead of heavy dark ladder-like battens.
  const boardTint='#'+new THREE.Color(wall).multiplyScalar(.90).getHexString();
  if(!cafe)for(let i=0;i<8;i++)for(const x of (shop?[lo-.005]:[lo-.005,hi+.005]))box(g,.012,.009,wallDepth,x,.28+i*.15,.5-(upgraded&&!shop?.14:0),boardTint);
  if(!shop)for(let i=0;i<8;i++)box(g,design.wallWidth-.12,.009,.012,.5,.28+i*.15,frontWall+.008,boardTint);
  // Entrance faces local +Z. The reserved approach tile lies directly ahead.
  if(!shop){box(g,.49,.94,.07,0,.63,frontWall+.02,frame);box(g,.35,.8,.08,0,.63,frontWall+.06,'#a99067');
  box(g,.045,.045,.035,.11,.66,frontWall+.11,'#e8c16e');}
  box(g,.68,.1,.3,0,.05,1.62,'#aaa58d');
  for(const [x,z,side]of (shop?[]:[[.94,frontWall+.025,false],[lo-.025,.5,true],[hi+.025,.5,true]])){
   box(g,side?.065:(lodge?.72:suite?.67:.57),lodge?.82:suite?.76:.65,side?(lodge?.96:suite?.73:.57):.065,x,.95,z,frame);
   box(g,side?.08:(lodge?.58:suite?.53:.43),lodge?.67:suite?.61:.5,side?(lodge?.82:suite?.59:.43):.08,x,.95,z,'#b9bd9f');
   box(g,side?.09:.035,lodge?.67:suite?.61:.5,side?.035:.09,x,.95,z,wall);
  }
  const roofStart=g.children.length;
  const left=-design.eave,right=1+design.eave,back=-.49,front=1.49;
  const vertices=[left,1.48,back,.5,peak,back,.5,peak,front, left,1.48,back,.5,peak,front,left,1.48,front, .5,peak,back,right,1.48,back,right,1.48,front, .5,peak,back,right,1.48,front,.5,peak,front];
  if(b.gameplay.roofLookout&&!shop){
   vertices.length=0;
   const roofY=x=>1.48+(peak-1.48)*(1-Math.abs(x-.5)/(.5-left));
   const quad=(x0,x1,z0,z1)=>{const a=[x0,roofY(x0),z0],b=[x1,roofY(x1),z0],c=[x1,roofY(x1),z1],d=[x0,roofY(x0),z1];vertices.push(...a,...b,...c,...a,...c,...d);};
   for(const [z0,z1]of [[back,.02],[.02,.98],[.98,front]])for(const [x0,x1]of (z0===.02?[[left,.05],[.95,right]]:[[left,.5],[.5,right]]))quad(x0,x1,z0,z1);
  }
  // Upward winding lets the existing moss/seam detail generator follow each roof face.
  for(let i=0;i<vertices.length;i+=9){const b=vertices.slice(i+3,i+6);vertices.splice(i+3,3,...vertices.slice(i+6,i+9));vertices.splice(i+6,3,...b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const roof=new THREE.Mesh(geo,roofingMaterial(finish.color,finish.tier));roof.castShadow=true;roof.receiveShadow=true;g.add(roof);
  // Clean continuous roof edges; quiet seams follow the planes without stone-like moss chunks.
  for(const z of [back+.035,front-.035]){
   beam(g,[left+.035,1.48,z],[.5,peak,z],.075,frame);beam(g,[.5,peak,z],[right-.035,1.48,z],.075,frame);
  }
  for(const x of [left+.025,right-.025])box(g,.045,.065,1.95,x,1.46,.5,frame);
  const roofTint='#'+new THREE.Color(finish.color).multiplyScalar(finish.tier==='estate'?.86:1.04).getHexString();
  for(let z=back+.16;z<front-.10;z+=finish.tier==='estate'?.22:.42){
   if(b.gameplay.roofLookout&&z>.02&&z<.98)continue;
   beam(g,[left+.03,1.50,z],[.5,peak+.018,z],finish.tier==='estate'?.013:.008,roofTint);
   beam(g,[.5,peak+.018,z],[right-.03,1.50,z],finish.tier==='estate'?.013:.008,roofTint);
  }
  // Solid gables behind the visible trusses.
  for(const z of [lo,hi-(!shop&&suite?.24:0)]){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([lo,1.49,z,hi,1.49,z,.5,peak-.09,z, .5,peak-.09,z,hi,1.49,z,lo,1.49,z],3));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,material(wall)));
  }
  const upperRoof=g.children.slice(roofStart);
  if(cottage&&!shop&&!upgraded){
   // All flower boxes remain inside the common footprint; the porch uses the reserved entrance.
   box(g,.58,.13,.13,.94,.57,hi+.045,frame);
   for(let i=0;i<5;i++){
    box(g,.035,.15,.035,.72+i*.1,.69,hi+.045,'#69815a');
    box(g,.075,.065,.075,.72+i*.1,.78+(i%2)*.04,hi+.045,i%2?'#e6be93':'#c58f94');
   }
   for(const x of [-.31,.31]){box(g,.07,1.12,.07,x,.62,1.69,frame);beam(g,[x,.92,1.69],[0,1.35,1.69],.065,frame);}
   const canopy=box(g,.77,.08,.48,0,1.32,1.64,finish.color);canopy.rotation.x=.13;

  }
  if(lodge&&!shop&&!suite&&!b.gameplay.fireplace){
   for(const z of [lo-.045,hi+.045]){box(g,design.wallWidth+.12,.09,.07,.5,.22,z,'#e4d6b5');box(g,design.wallWidth+.12,.09,.07,.5,1.38,z,'#e4d6b5');}
   for(const x of [lo-.02,hi+.02])for(const z of [lo+.16,hi-.16])beam(g,[x,1.12,z],[x+(x<.5?-.11:.11),1.48,z],.08,frame);
   box(g,.34,2.16+story,.32,1.09,(2.16+story)/2,-.05,'#969487');
   for(let i=0;i<12;i++)box(g,.35,.025,.33,1.09,.14+i*.17,-.05,'#777d72');
   box(g,.44,.12,.42,1.09,2.21+story,-.05,'#747b72');
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
   const display=new THREE.Group();display.name=cafe?'cafe-tearoom':'shop-display';g.add(display);
   if(!cafe){
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
   }
   if(!upgraded&&!cafe)for(let i=0;i<8;i++){
    const awning=box(g,.22,.065,.34,-.27+i*.22,1.48,1.3,finish.color);awning.rotation.x=.12;
   }
   box(g,1.8,.2,.07,.5,1.43,1.46,frame);
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.18),cafe?cafeSign:level===3?outfitterMaterial:signMaterial);sign.position.set(.5,1.43,1.497);g.add(sign);
  }
  // Functional tier geometry is shared by final, ghost and renovation views.
  // All additions stay inside the original 2x2 envelope or reserved entrance tile.
  const tierParts=[];
  function feature(name){const part=new THREE.Group();part.name=name;g.add(part);tierParts.push(part);return part;}
  function pitched(part,cx,y,cz,w,d,rise){
   const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;
   const v=[x0,y,z0,x0,y,z1,cx,y+rise,z1,x0,y,z0,cx,y+rise,z1,cx,y+rise,z0,
    cx,y+rise,z0,cx,y+rise,z1,x1,y,z1,cx,y+rise,z0,x1,y,z1,x1,y,z0];
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,roofingMaterial(finish.color,finish.tier));mesh.castShadow=true;mesh.receiveShadow=true;part.add(mesh);
   for(const z of [z0,z1]){beam(part,[x0,y,z],[cx,y+rise,z],.065,frame);beam(part,[cx,y+rise,z],[x1,y,z],.065,frame);}
   // Sparse standing seams, avoiding additional textures or per-frame work.
   if(finish.tier==='estate')for(const z of [z0+.09,cz,z1-.09]){beam(part,[x0,y+.012,z],[cx,y+rise+.012,z],.012,finish.color);beam(part,[cx,y+rise+.012,z],[x1,y+.012,z],.012,finish.color);}
  }
  function planter(part,x,y,z,w=.47){
   box(part,w,.13,.16,x,y,z,frame);box(part,w-.04,.04,.13,x,y+.08,z,'#59704a');
   for(let i=0;i<4;i++){
    const px=x-w*.32+i*w*.21,leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(Math.min(.065,w*.24),0),material('#78945a'));leaf.position.set(px,y+.14,z);leaf.castShadow=true;part.add(leaf);
    const bloom=new THREE.Mesh(new THREE.IcosahedronGeometry(.025,0),material(i%2?'#e5c68b':'#c59386'));bloom.position.set(px,y+.20,z+.015);bloom.castShadow=true;part.add(bloom);
   }
  }
  if(b.gameplay.guestWing&&!shop){
   const wing=feature('cabin-guest-wing'),width=design.wallWidth-.18,back=-1.40,join=lo+.16,depth=join-back,cz=(back+join)/2;
   box(wing,width,.16,depth,.5,.08,cz,'#aaa58d');
   box(wing,width,1.12,depth,.5,.72,cz,wall);
   for(const x of [.5-width/2+.03,.5+width/2-.03])box(wing,.075,1.25,.075,x,.77,back+.035,frame);
   for(let y=.29;y<1.25;y+=.17)box(wing,width-.10,.012,.012,.5,y,back-.008,boardTint);
   {box(wing,.70,.58,.05,.5,.82,back-.025,frame);box(wing,.58,.46,.025,.5,.82,back-.055,'#b9bd9f');box(wing,.03,.46,.035,.5,.82,back-.075,frame);}
   for(const x of [.5-width/2-.015,.5+width/2+.015]){box(wing,.035,.53,.48,x,.82,cz,frame);box(wing,.045,.41,.36,x,.82,cz,'#b9bd9f');}
   // A lower gable overlaps the original rear wall beneath its roof, forming a joined wing.
   const rise=cottage?.63:.49;
   pitched(wing,.5,1.30,cz,width+.12,depth+.10,rise);
   const v=[.5-width/2,1.29,back,.5+width/2,1.29,back,.5,1.30+rise,back];
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();const infill=new THREE.Mesh(geo,material(wall));infill.material.side=THREE.DoubleSide;wing.add(infill);
   beam(wing,[.5,1.30,back-.025],[.5,1.30+rise-.05,back-.025],.045,frame);
  }
  if(upgraded&&!shop){
   const porch=feature('cabin-comfort-porch');
   if(!b.gameplay.frontPorch){
   box(porch,.75,.1,.75,0,.14,1.50,frame);
   box(porch,design.wallWidth,.08,.29,.5,.15,frontWall+.14,frame);
   for(const x of [-.3,.3]){box(porch,.085,1.16,.085,x,.76,1.77,frame);beam(porch,[x,1.04,1.77],[x*.3,1.37,1.77],.065,frame);}
   pitched(porch,0,1.38,1.6,.84,.61,.27);
   }else{
    box(porch,1.94,.10,1.21,.5,.15,1.84,frame);
    for(let z=1.30;z<2.40;z+=.13)box(porch,1.88,.012,.012,.5,.207,z,'#b59b74');
    for(const x of [-.36,1.36]){box(porch,.085,1.10,.085,x,.75,2.30,frame);beam(porch,[x,.95,2.30],[x+(x<0?.18:-.18),1.25,2.30],.055,frame);}
    const v=[-.47,1.53,1.16,1.47,1.53,1.16,1.47,1.28,2.43,-.47,1.53,1.16,1.47,1.28,2.43,-.47,1.28,2.43];
    for(let i=0;i<v.length;i+=9){const t=v.slice(i+3,i+6);v.splice(i+3,3,...v.slice(i+6,i+9));v.splice(i+6,3,...t);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();const canopy=new THREE.Mesh(geo,roofingMaterial(finish.color,finish.tier));canopy.castShadow=true;canopy.receiveShadow=true;porch.add(canopy);
    if(finish.tier==='estate')for(let x=-.30;x<1.40;x+=.32)beam(porch,[x,1.54,1.17],[x,1.29,2.42],.012,finish.color);
    box(porch,1.94,.065,.055,.5,1.28,2.43,frame);
    for(const x of [-.45,1.45])beam(porch,[x,1.53,1.17],[x,1.28,2.42],.045,frame);
    for(const x of [.62,.94,1.26])box(porch,.035,.32,.04,x,.39,2.37,frame);box(porch,.77,.045,.06,.94,.56,2.37,frame);
    box(porch,.64,.10,.20,0,.05,2.36,'#aaa58d');
   }
   for(const x of [-.32,.32]){box(porch,.105,.17,.1,x,1.09,hi+.08,'#efc77f');box(porch,.14,.035,.13,x,1.19,hi+.08,frame);}
   planter(porch,.94,.57,frontWall+.09);
   const bench=feature('cabin-porch-bench');
   box(bench,.46,.07,.22,.92,.38,1.30,frame);box(bench,.46,.18,.05,.92,.52,1.24,wall);
   for(const x of [.76,1.08])box(bench,.055,.24,.16,x,.23,1.30,frame);
  }
  if((level>=2||b.gameplay.loft)&&!shop){
   const loft=feature('cabin-twin-dormers');
   // Two side-facing dormers rise out of the roof, with real projecting cheeks.
   for(const z of (b.gameplay.roofLookout?[]:[.02,.98])){
    const d=new THREE.Group();d.position.set(1.02,0,z);d.rotation.y=Math.PI/2;loft.add(d);
    const y=1.96+(peak-2.64)*.35;
    box(d,.53,.48,.48,0,y,0,wall);
    box(d,.43,.37,.035,0,y,.247,frame);box(d,.33,.28,.04,0,y,.27,'#d9b77a');
    box(d,.035,.3,.045,0,y,.293,frame);box(d,.35,.035,.045,0,y,.293,frame);
    pitched(d,0,y+.25,0,.61,.56,.20);
    const face=new THREE.BufferGeometry();face.setAttribute('position',new THREE.Float32BufferAttribute([-.265,y+.24,.245,.265,y+.24,.245,0,y+.44,.245,0,y+.44,.245,.265,y+.24,.245,-.265,y+.24,.245],3));face.computeVertexNormals();
    const infill=new THREE.Mesh(face,material(wall));infill.castShadow=true;infill.receiveShadow=true;d.add(infill);
    beam(d,[-.26,y+.24,.25],[0,y+.44,.25],.045,frame);beam(d,[0,y+.44,.25],[.26,y+.24,.25],.045,frame);
   }
   box(loft,design.wallWidth,.10,.07,.5,1.59,hi+.035,frame);
   const glazing=feature('cabin-loft-front-glazing'),base=1.72,top=peak-.22,w=design.wallWidth*.36,z=hi-(suite?.21:-.016);
   // Broad A-frame glazing is visible above the porch; premium balconies stay in front.
   const vertices=[.5-w,base,z,.5+w,base,z,.5,top,z,.5,top,z,.5+w,base,z,.5-w,base,z];
   const pane=new THREE.BufferGeometry();pane.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));pane.computeVertexNormals();glazing.add(new THREE.Mesh(pane,material('#afc8bd')));
   for(const side of [-1,1])beam(glazing,[.5+side*w,base,z+.022],[.5,top,z+.022],.065,frame);
   box(glazing,w*2,.065,.055,.5,base,z+.023,frame);
   beam(glazing,[.5,base,z+.025],[.5,top,z+.025],.045,frame);
   const railY=base+(top-base)*.39;box(glazing,w*1.22,.035,.04,.5,railY,z+.025,frame);

  }
  if(suite&&!shop){
   const retreat=feature('cabin-premium-balcony');
   // Recessed dark glazing reads as a sheltered loft; outer beams remain prominent.
   box(retreat,.94,.075,.24,.5,1.79,1.30,frame);
   for(const x of [.07,.285,.5,.715,.93])box(retreat,.035,.27,.045,x,1.96,1.40,frame);
   box(retreat,.92,.05,.06,.5,2.10,1.40,frame);
   planter(retreat,.15,1.91,1.37,.18);planter(retreat,.85,1.91,1.37,.18);
  }
  if((suite||b.gameplay.fireplace)&&!shop){
   const stone=feature('cabin-premium-stone');
   for(const z of [lo-.02,hi+.02])for(let i=0;i<7;i++)box(stone,design.wallWidth/7-.018,.16,.07,lo+(i+.5)*design.wallWidth/7,.22,z,i%2?'#9a9c8b':'#afb09b');
   box(stone,.29,peak+.20+story,.29,lo+.23,(peak+.20+story)/2,lo+.25,'#9b9c8c');
   for(let y=.25;y<peak+.20+story;y+=.23)box(stone,.30,.025,.30,lo+.23,y,lo+.25,'#797f73');
   box(stone,.40,.10,.4,lo+.23,peak+.26+story,lo+.25,'#71796e');
  }
  if(upgraded&&shop){
   const displays=feature('shop-outdoor-displays');
   box(displays,.78,.065,.20,.89,.53,1.40,frame);
   for(const x of [.58,1.18])box(displays,.065,.35,.17,x,.32,1.40,frame);
   if(!cafe)for(let i=0;i<3;i++){box(displays,.19,.16,.15,.65+i*.23,.64,1.40,['#87956f','#c29a77','#d8bf8e'][i]);box(displays,.20,.025,.16,.65+i*.23,.74,1.40,frame);}
   const canopy=feature('shop-timber-canopy');
   if(level<3&&!cafe){const slab=box(canopy,1.90,.055,level>=2?.48:.36,.5,1.55,1.24,finish.color);slab.rotation.x=.14;}
   if(level<3&&!cafe)for(const x of [-.30,1.29])beam(canopy,[x,1.07,1.25],[x,1.49,1.43],.09,frame);
   if(level>=2){
    const stock=feature('shop-camping-stock');
    if(!cafe)for(let i=0;i<3;i++){
     const roll=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.23,8),material(['#b8886b','#899d78','#d5c499'][i]));roll.rotation.x=Math.PI/2;roll.position.set(.55+i*.24,1.15,hi-.24);roll.castShadow=true;stock.add(roll);
     box(stock,.20,.27,.13,.55+i*.24,.68,hi-.24,i%2?'#73907b':'#a88c68');box(stock,.025,.23,.015,.55+i*.24,.68,hi-.165,frame);
    }
    // A low shed dormer sits on the right roof slope, leaving the ridge uninterrupted.
    const clerestory=feature('shop-raised-roof-windows');const y=peak-.42;
    box(clerestory,.58,.54,1.12,1.0,y,.5,frame);
    for(let i=0;i<4;i++)box(clerestory,.025,.27,.22,1.30,y+.025,.08+i*.28,'#a9c8c3');
    const cap=box(clerestory,.66,.055,1.23,1.0,peak-.09,.5,finish.color);cap.rotation.z=-.15;
    beam(stock,[1.22,1.30,.91],[1.45,1.30,.91],.045,frame);
    box(stock,.045,.27,.25,1.44,1.12,.91,'#49644d');
   }
   if(level===3){
    const portico=feature('shop-outfitter-portico');
    for(const x of [-.32,1.32]){
     box(portico,.23,.35,.23,x,.29,1.38,cafe?'#b2b0a2':'#a6a693');box(portico,cafe?.065:.12,1.28,cafe?.065:.12,x,1.06,1.38,frame);
     beam(portico,[x,1.26,1.38],[x+(x<.5?.30:-.30),1.57,1.38],.09,frame);
    }
    box(portico,1.78,.08,.08,.5,1.72,1.44,frame);
    if(!cafe)pitched(portico,.5,1.71,1.12,1.94,.68,.48);
    if(!cafe)beam(portico,[.5,1.72,1.44],[.5,2.12,1.44],.09,frame);
    if(!cafe)for(const x of [-.18,1.18])beam(portico,[x,1.74,1.44],[.5,2.12,1.44],.07,frame);
   }
  }
  if(cafe){
   const industrial=feature('cafe-industrial-shell');
   // Vertical timber cladding, restrained steel grid glazing and a thin bracket-supported canopy.
   for(let z=lo+.13;z<hi-.05;z+=.17)box(industrial,.016,1.18,.022,lo-.008,.82,z,boardTint);
   for(let x=lo+.13;x<hi-.05;x+=.17){
    box(industrial,.022,1.18,.016,x,.82,lo-.008,boardTint);
    const height=(peak-1.50)*(1-Math.abs(x-.5)/half)-.09;
    if(height>.08)box(industrial,.014,height,.018,x,1.50+height/2,hi+.012,boardTint);
   }
   const frontZ=hi-.02;
   for(const x of [.62,.94])box(industrial,.026,.91,.04,x,.87,frontZ,frame);
   box(industrial,hi-.36,.026,.04,(hi+.28)/2,.88,frontZ,frame);
   for(const z of [.65,1.03])if(z<hi-.1)box(industrial,.04,.91,.026,hi+.023,.87,z,frame);
   box(industrial,.04,.026,hi-lo-.74,hi+.023,.88,(lo+.7+hi-.04)/2,frame);
   const canopy=feature('cafe-steel-canopy');const canopyY=level===3?1.73:1.58;
   box(canopy,1.91,.045,level>=2?.48:.37,.5,canopyY,1.24,frame);
   box(canopy,1.91,.045,.025,.5,canopyY-.04,level>=2?1.465:1.42,'#58645e');
   for(const x of [-.28,1.28])beam(canopy,[x,canopyY-.025,1.40],[x,canopyY-.22,hi-.10],.022,frame);
   // The flue creates a clear silhouette at every tier; no smoke particles or extra lights.
   const flue=feature('cafe-stove-flue'),flueHeight=peak+.55;
   const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,flueHeight,10),material(frame));pipe.position.set(lo+.22,flueHeight/2,lo+.30);pipe.castShadow=true;flue.add(pipe);
   for(const y of [1.55,peak+.35]){const collar=new THREE.Mesh(new THREE.CylinderGeometry(.078,.078,.04,10),material('#69716a'));collar.position.set(lo+.22,y,lo+.30);flue.add(collar);}
   box(flue,.23,.045,.23,lo+.22,flueHeight+.035,lo+.30,frame);
   const tea=feature('cafe-tables-and-pastries');
   const disk=(radius,height,x,y,z,color)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,12),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;tea.add(m);};
   // Tables and chairs sit inside the glazed room; the entrance stays clear.
   for(const [x,z]of (level>0?[[.70,.48],[.05,-.02]]:[[.70,.48]])){
    disk(.22,.05,x,.62,z,wall);box(tea,.055,.42,.055,x,.39,z,frame);disk(.12,.035,x,.19,z,frame);
    for(const dz of [-.26,.26]){disk(.095,.045,x,.39,z+dz,frame);box(tea,.04,.22,.04,x,.26,z+dz,frame);box(tea,.19,.16,.035,x,.49,z+dz+(dz<0?-.07:.07),wall);}
    disk(.045,.012,x,.66,z,'#ede1c4');disk(.028,.065,x,.69,z,'#f3e9d0');
   }
   box(tea,.78,.07,.28,.86,.67,hi-.22,frame);
   for(let i=0;i<(level>=2?4:3);i++){
    const x=.56+i*.17;disk(.065,.018,x,.72,hi-.20,'#ede1c4');disk(.045,.035,x,.747,hi-.20,i%2?'#bd8e58':'#d7b27b');
   }
   if(upgraded){planter(tea,.87,.64,1.39,.58);}
   // A cup emblem and a small menu distinguish the café even when zoomed out.
   box(tea,.25,.34,.04,1.08,1.02,hi-.02,'#405c48');
   for(let i=0;i<3;i++)box(tea,.16-i*.02,.012,.01,1.08,1.11-i*.065,hi+.006,'#e9ddbb');
   box(tea,.16,.14,.035,.5,1.85,hi+.06,'#f2dfb6');box(tea,.18,.025,.04,.5,1.93,hi+.06,'#f2dfb6');
   const handle=new THREE.Mesh(new THREE.TorusGeometry(.055,.018,5,10),material('#f2dfb6'));handle.position.set(.62,1.85,hi+.065);handle.castShadow=true;tea.add(handle);
  }
  if((suite||b.gameplay.fireplace)&&!shop){
   const hearth=feature('cabin-fireplace-details');
   for(let y=0;y<2;y++)for(let z=0;z<3;z++){const log=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.15,7),material('#806348'));log.rotation.x=Math.PI/2;log.position.set(lo-.04,.22+y*.07,lo+.65+z*.16);hearth.add(log);}
   box(hearth,.20,.18,.025,.94,.94,frontWall+.075,'#ebc28a');
  }
  if(b.gameplay.luxury&&!shop){
   const luxury=feature('cabin-luxury-details');
   box(luxury,.35,.38,.025,.94,.95,frontWall+.075,'#e5ce9e');box(luxury,.022,.38,.025,.94,.95,Math.min(frontWall+.10,1.485),frame);
   for(const x of [.72,1.16]){box(luxury,.075,.44,.04,x,.95,Math.min(frontWall+.10,1.475),'#946b64');box(luxury,.085,.028,.045,x,.87,Math.min(frontWall+.13,1.475),'#dfc69d');}
   box(luxury,.48,.055,.10,.94,.69,Math.min(frontWall+.11,1.445),frame);
   for(const x of [-.225,.225])box(luxury,.025,.84,.025,x,.63,frontWall+.11,'#dfc69d');
  }
  if(b.gameplay.roofLookout&&!shop){
   const room=feature('cabin-roof-lookout'),base=peak-.70,top=peak+.25;
   box(room,.90,.13,.98,.5,base,.5,frame);
   for(const x of [.06,.94])for(const z of [.03,.97])box(room,.045,top-base,.045,x,(top+base)/2,z,frame);
   const glass=(w,h,d,x,y,z)=>{const pane=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),shopGlass);pane.position.set(x,y,z);room.add(pane);};
   for(const z of [.025,.975]){glass(.83,.71,.012,.5,base+.48,z);box(room,.90,.055,.04,.5,top-.03,z,frame);box(room,.90,.05,.04,.5,base+.13,z,frame);}
   for(const x of [.055,.945]){glass(.012,.71,.87,x,base+.48,.5);box(room,.04,.055,.98,x,top-.03,.5,frame);}
   box(room,1.02,.065,1.10,.5,top+.04,.5,finish.color);
   const scope=new THREE.Mesh(new THREE.CylinderGeometry(.06,.075,.36,10),material('#6f7e71'));scope.rotation.x=1.15;scope.position.set(.5,base+.50,.5);room.add(scope);
   for(const [x,z]of [[.34,.30],[.66,.30],[.5,.69]])beam(room,[x,base+.10,z],[.5,base+.46,.5],.025,frame);
   const lens=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),material('#afc8cb'));lens.position.set(.5,base+.57,.66);room.add(lens);
  }
  if(story&&!shop){
   for(const part of upperRoof)part.position.y+=story;
   for(const part of tierParts)if(['cabin-twin-dormers','cabin-loft-front-glazing','cabin-premium-balcony','cabin-roof-lookout'].includes(part.name))part.position.y+=story;
   const floor=feature('cabin-second-story');
   box(floor,design.wallWidth,story,wallDepth,.5,1.48+story/2,.5-(upgraded?.14:0),wall);
   box(floor,design.wallWidth+.04,.08,wallDepth+.04,.5,1.51,.5-(upgraded?.14:0),frame);
   for(const x of [lo+.035,hi-.035])for(const z of [lo+.035,frontWall-.035])box(floor,.08,story,.08,x,1.48+story/2,z,frame);
   for(const z of [lo-.015,frontWall+.015])for(const x of [.03,.96]){
    box(floor,.49,.61,.045,x,2.03,z,frame);box(floor,.39,.49,.055,x,2.03,z,'#b5c7ba');box(floor,.025,.50,.065,x,2.03,z,frame);
   }
   for(let x=lo+.15;x<hi-.08;x+=.16)for(const z of [lo-.008,frontWall+.008])box(floor,.012,story-.12,.012,x,1.48+story/2,z,boardTint);
   for(let z=lo+.15;z<frontWall-.08;z+=.16)for(const x of [lo-.008,hi+.008])box(floor,.012,story-.12,.012,x,1.48+story/2,z,boardTint);
   for(const z of [lo-.03,frontWall+.03]){box(floor,design.wallWidth,.075,.07,.5,1.48+story-.04,z,frame);for(const x of [lo+.04,hi-.04])beam(floor,[x,1.48+story-.30,z],[x+(x<.5?.20:-.20),1.48+story-.08,z],.045,frame);}
   beam(floor,[.5,1.5+story,lo-.02],[.5,peak+story-.09,lo-.02],.055,frame);
   for(const x of [lo-.02,hi+.02]){box(floor,.045,.61,.66,x,2.03,.40,frame);box(floor,.055,.49,.54,x,2.03,.40,'#b5c7ba');box(floor,.065,.50,.025,x,2.03,.40,frame);}
  }
  // Batch new static details by material so flowers, rails and stock do not each
  // add a draw call. Run only on model rebuild; keep named feature groups intact.
  for(const part of tierParts){
   part.updateMatrixWorld(true);const inverse=part.matrixWorld.clone().invert(),batches=new Map();
   part.traverse(mesh=>{if(!mesh.isMesh)return;const list=batches.get(mesh.material)||[];list.push(mesh);batches.set(mesh.material,list);});
   for(const [mat,meshes]of batches){
    if(meshes.length<2)continue;
    const positions=[],normals=[];
    for(const mesh of meshes){
     const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
     geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
     positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);
     geo.dispose();mesh.geometry.dispose();mesh.removeFromParent();
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;part.add(mesh);
   }
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
  for(const b of buildings){const signature=JSON.stringify([b.blueprint,b.definitionVersion,b.design,b.appearance,b.gameplay.businessLevel||0,!!b.gameplay.guestWing,!!b.gameplay.frontPorch,!!b.gameplay.loft,!!b.gameplay.secondStory,!!b.gameplay.premiumSuite,!!b.gameplay.fireplace,!!b.gameplay.luxury,!!b.gameplay.roofLookout]);let entry=cache.get(b.id);if(entry?.signature!==signature){if(entry){group.remove(entry.mesh);dispose(entry.mesh);}entry={signature,mesh:build(b)};cache.set(b.id,entry);group.add(entry.mesh);}
   entry.mesh.visible=b.id!==hiddenId;entry.mesh.position.set(b.position[0],height(...b.position),b.position[1]);entry.mesh.rotation.y=b.rotation*Math.PI/2;
  }
  group.updateMatrixWorld(true);const targets=[];group.traverse(o=>{if(o.isMesh)targets.push(o);});return targets;
 }};
}
