import * as THREE from 'three';

// Real geometry complements the asset kit's textured street surfaces.
// All pieces are generated locally: no additional model or texture files needed.
export function addStreetProps(scene, model, clickable) {
  const props = new THREE.Group();props.name='Kodla tamamlanan sokak eşyaları';
  const metal = new THREE.MeshStandardMaterial({color:'#33473e',roughness:.65,metalness:.35});
  const wood = new THREE.MeshStandardMaterial({color:'#a97248',roughness:.9});
  function piece(group,geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.focusRoot=group;group.add(mesh);clickable.push(mesh);return mesh;}
  function group(label,x,z){const g=new THREE.Group();g.name=label;g.userData.label=label;g.position.set(x,0,z);props.add(g);return g;}
  const bench=group('Ahşap sokak bankı',-3,11);
  for(let i=0;i<4;i++)piece(bench,new THREE.BoxGeometry(1.8,.07,.13),wood,0,.52,(i-1.5)*.15);
  for(let i=0;i<3;i++)piece(bench,new THREE.BoxGeometry(1.8,.12,.07),wood,0,.76+i*.14,-.29);
  for(const x of [-.65,.65]){piece(bench,new THREE.BoxGeometry(.07,.5,.5),metal,x,.25,0);piece(bench,new THREE.BoxGeometry(.07,.6,.07),metal,x,.74,-.3);}
  for(const [x,z] of [[-5,11],[1,11]]){
    const plant=group('Terracotta saksı ve bitki',x,z);
    piece(plant,new THREE.CylinderGeometry(.32,.23,.55,12),new THREE.MeshStandardMaterial({color:'#b86c48',roughness:.95}),0,.28,0);
    piece(plant,new THREE.IcosahedronGeometry(.48,0),new THREE.MeshStandardMaterial({color:'#657f45',roughness:1}),0,.8,0);
  }
  const originalLights=[];
  model.traverse(o=>{if(o.name.startsWith('Cylinder') && !o.isMesh){const b=new THREE.Box3().setFromObject(o);if(!b.isEmpty())originalLights.push({center:b.getCenter(new THREE.Vector3()),height:b.getSize(new THREE.Vector3()).y});}});
  for(const {center,height} of originalLights){
    const lamp=group('Sokak lambası',center.x,center.z);
    piece(lamp,new THREE.CylinderGeometry(.025,.045,height,8),metal,0,height*.5,0);
    piece(lamp,new THREE.CylinderGeometry(.085,.11,.14,8),metal,0,.07,0);
    piece(lamp,new THREE.BoxGeometry(.38,.035,.035),metal,.16,height-.08,0);
    piece(lamp,new THREE.BoxGeometry(.19,.065,.14),metal,.32,height-.10,0);
    piece(lamp,new THREE.BoxGeometry(.14,.012,.1),new THREE.MeshStandardMaterial({color:'#fff0b8',emissive:'#ffd886',emissiveIntensity:.4}),.32,height-.14,0);
  }
  scene.add(props);return props;
}
