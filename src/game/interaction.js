import { Box3, BoxGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector2, Vector3 } from 'three';

const DESCRIPTIONS={
  bench:'Ahşap oturma yüzeyi ve metal ayakları olan sokak bankı. Girişteki bu sakin köşe, yolculuğun ilk durağı. Bankın üzerindeki gezi defterine de bakmayı unutma.',
  plant:'Terracotta saksı ve köşeli yeşil bitki. Sıcak toprak rengi, sokağın yıpranmış cepheleriyle yan yana duruyor. Küçük bir detay, yeni bir keşif.',
  lamp:'İnce metal direği ve küçük armatürüyle bir sokak lambası. Sokağın kenarını takip ederken gözünü yukarı çevir; tanıdık bir nesne yeni bir açıdan görünsün.',
  journal:'Bankın üzerindeki küçük gezi defteri. Alıp yanında taşıyabilir, uygun bir zemine yeniden bırakabilirsin. Bir sonraki köşede hangi detayı fark edeceksin?',
  secret:'Batı cephesinin arkasındaki gizli keşif notu: “Bir şehri anlamak için bazen yalnızca köşeyi dönmek gerekir.” Notu buldun; artık bu köşenin hikâyesi günlüğünde.'
};
export function createGameObjects(props) {
  const extra=new Group();extra.name='Oyun keşif noktaları';
  const entries=[];
  const bench=props.children.find(o=>o.name==='Ahşap sokak bankı');
  const plant=props.children.find(o=>o.name.includes('saksı'));
  const lamps=props.children.filter(o=>o.name==='Sokak lambası');
  const lamp=lamps.sort((a,b)=>b.getWorldPosition(new Vector3()).z-a.getWorldPosition(new Vector3()).z)[0];
  for(const [id,object,label] of [['bench',bench,'Sokak bankı'],['plant',plant,'Terracotta saksı'],['lamp',lamp,'Sokak lambası']])if(object)entries.push({id,object,label,description:DESCRIPTIONS[id],portable:false});
  const lampEntry=entries.find(e=>e.id==='lamp');if(lampEntry)lampEntry.objects=lamps;
  const journal=new Group();journal.position.set(-7.5,.59,27.5);journal.name='Gezi defteri';
  const cover=new Mesh(new BoxGeometry(.36,.055,.25),new MeshStandardMaterial({color:'#ba6846',roughness:.85}));journal.add(cover);
  const pages=new Mesh(new BoxGeometry(.34,.034,.23),new MeshStandardMaterial({color:'#f5e9c9',roughness:1}));pages.position.y=.033;journal.add(pages);extra.add(journal);
  entries.push({id:'journal',object:journal,label:'Gezi defteri',description:DESCRIPTIONS.journal,portable:true});
  const secret=new Group();secret.position.set(-32,.85,0);secret.rotation.y=Math.PI/2;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ede2c6';ctx.fillRect(0,0,256,256);ctx.fillStyle='#394d41';ctx.textAlign='center';ctx.font='64px Georgia';ctx.fillText('H°',128,110);ctx.font='18px sans-serif';ctx.fillText('KÖŞEYİ DÖN.',128,162);ctx.strokeStyle='#b56b45';ctx.strokeRect(15,15,226,226);
  const sign=new Mesh(new BoxGeometry(.75,.75,.045),new MeshStandardMaterial({map:new CanvasTexture(canvas),roughness:.9}));secret.add(sign);
  const post=new Mesh(new CylinderGeometry(.025,.025,.8,8),new MeshStandardMaterial({color:'#465448',roughness:.8}));post.position.y=-.42;secret.add(post);extra.add(secret);
  entries.push({id:'secret',object:secret,label:'Gizli sokak notu',description:DESCRIPTIONS.secret,portable:false});
  extra.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.noCollision=true;}});
  for(const entry of entries){entry.objects ||= [entry.object];entry.locations=entry.objects.map(object=>({object,position:object.position.clone()}));for(const object of entry.objects)object.traverse(o=>{if(o.isMesh){o.userData.discoveryId=entry.id;o.userData.discoveryRoot=object;}});entry.spawn=entry.object.position.clone();}
  return {extra,entries};
}

export class Interaction {
  constructor(camera,entries,occluders,world) {
    this.camera=camera;this.entries=entries;this.occluders=occluders;this.world=world;
    this.ray=new Raycaster();this.ray.near=.05;this.ray.far=3.2;this.center=new Vector2();
    this.target=null;this.restore=[];this.highlightMaterials=new Map();
    this.meshes=[];entries.forEach(e=>e.objects.forEach(object=>object.traverse(o=>{if(o.isMesh)this.meshes.push(o);})));
  }
  update(){
    this.camera.updateMatrixWorld();this.ray.setFromCamera(this.center,this.camera);
    // Occluders with no discovery ID must still stop the interaction ray.
    const allHits=this.ray.intersectObjects([...this.occluders,...this.meshes],false).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
    const first=allHits[0];
    const entry=first?this.entries.find(e=>e.id===first.object.userData.discoveryId):null;
    const solid=this.world?.octree.rayIntersect(this.ray.ray);
    if(entry&&solid&&solid.distance+.025<first.distance){this.setTarget(null);return null;}
    if(entry&&first.object.userData.discoveryRoot!==entry.object){this.setTarget(null);entry.object=first.object.userData.discoveryRoot;}
    this.setTarget(entry||null);return this.target;
  }
  setTarget(entry){
    if(this.target===entry)return;
    for(const [mesh,material] of this.restore)mesh.material=material;this.restore=[];this.target=entry;
    if(!entry)return;
    entry.object.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const original=mesh.material;
      if(!this.highlightMaterials.has(mesh)){
        const highlighted=(Array.isArray(original)?original:[original]).map(m=>{const clone=m.clone();if(clone.emissive){clone.emissive=new Color('#d6ab62');clone.emissiveIntensity=.25;}return clone;});
        this.highlightMaterials.set(mesh,Array.isArray(original)?highlighted:highlighted[0]);
      }
      this.restore.push([mesh,original]);mesh.material=this.highlightMaterials.get(mesh);
    });
  }
  cloneForInspection(entry){
    this.setTarget(null);
    // Source props store references to their group in userData. Copy transforms and
    // shared render resources explicitly, rather than JSON-copying those cycles.
    function copy(source){const target=source.isMesh?new Mesh(source.geometry,source.material):new Group();target.position.copy(source.position);target.quaternion.copy(source.quaternion);target.scale.copy(source.scale);for(const child of source.children)target.add(copy(child));return target;}
    const clone=copy(entry.object);
    clone.scale.setFromMatrixScale(entry.object.matrixWorld);
    clone.position.set(0,0,0);clone.quaternion.copy(entry.object.getWorldQuaternion(entry.object.quaternion.clone()));
    clone.updateMatrixWorld(true);const box=new Box3().setFromObject(clone);clone.position.sub(box.getCenter(new Vector3()));
    const max=Math.max(...box.getSize(new Vector3()).toArray());clone.scale.multiplyScalar(2/Math.max(max,.1));clone.position.multiplyScalar(2/Math.max(max,.1));clone.updateMatrixWorld(true);
    return clone;
  }
  dispose(){this.setTarget(null);for(const materials of this.highlightMaterials.values())for(const material of Array.isArray(materials)?materials:[materials])material.dispose();this.highlightMaterials.clear();}
}
