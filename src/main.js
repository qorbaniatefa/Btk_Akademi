import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { addStreetProps } from './street-props.js';
import { ExplorationGame } from './game/game.js';

const mount = document.querySelector('#scene');
const scene = new THREE.Scene();
const worldRoot=new THREE.Group();scene.add(worldRoot);
scene.background = new THREE.Color('#f3efe6');
scene.fog = new THREE.Fog('#f3efe6', 65, 150);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .05, 250);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
mount.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xfff4dd, 0x9baca0, 2.5));
const sun = new THREE.DirectionalLight(0xffe4bf, 3.2);
sun.position.set(-15, 30, 20);sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left:-25,right:25,top:25,bottom:-25,near:1,far:100 });
sun.shadow.bias = -.001;scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:'#f3efe6',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.04;floor.receiveShadow=true;scene.add(floor);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled=false;controls.enableDamping=true;controls.dampingFactor=.07;
controls.minDistance=.7;controls.maxDistance=70;controls.maxPolarAngle=Math.PI*.49;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let model, game, route=[], progress=0, smoothed=0, free=false, focusTween=null, lastStep=-1, needsRender=true;
const renderedPosition=new THREE.Vector3(Infinity,Infinity,Infinity),renderedRotation=new THREE.Quaternion();
const position = new THREE.Vector3(), target = new THREE.Vector3();
const clickable=[];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const panel = document.querySelector('.focus-panel');
const modelUrl = new URL('../3D-models/modular_havana_street__low-poly_asset_kit.glb', import.meta.url).href;
function frameOffset(){needsRender=true;if(game?.active){game.resize();return;}camera.aspect=innerWidth/innerHeight;camera.clearViewOffset();if(!free){if(innerWidth>700)camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.19,0,innerWidth,innerHeight);else camera.setViewOffset(innerWidth,innerHeight,0,-innerHeight*.20,innerWidth,innerHeight);}camera.updateProjectionMatrix();}
function setFree(value){free=value;document.body.classList.toggle('free',free);controls.enabled=free;document.querySelector('#mode').innerHTML=free?'Geziye dön <span>↙</span>':'Serbest keşif <span>↗</span>';document.querySelector('#status').textContent=free?'SÜRÜKLE: DÖNDÜR · KAYDIR: YAKINLAŞ':'SCROLL İLE KEŞFET';if(!free){panel.hidden=true;focusTween=null;}frameOffset();controls.update();}
new GLTFLoader().load(modelUrl,gltf=>{
  model=gltf.scene;
  let box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(24/Math.max(size.x,size.z));
  box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());
  model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;clickable.push(o);}});
  worldRoot.add(model);const props=addStreetProps(scene,model,clickable);worldRoot.add(props);
  renderer.shadowMap.needsUpdate=true;
  box=new THREE.Box3().setFromObject(model);
  const h=box.max.y;
  route=[
    {p:[29,22,32],t:[0,h*.28,0]},
    {p:[19,12,23],t:[0,h*.25,0]},
    {p:[3,4,18],t:[-3,.65,11]},
    {p:[-16,9,20],t:[0,h*.27,0]},
    {p:[-26,19,29],t:[0,h*.3,0]},
  ];
  camera.position.fromArray(route[0].p);controls.target.fromArray(route[0].t);camera.lookAt(controls.target);frameOffset();
  document.querySelector('.loader').classList.add('done');
  window.__havana={ready:true,scene,camera,controls,model,props,route,clickable,get free(){return free;},get progress(){return progress;}};
  game=new ExplorationGame({scene,camera,renderer,worldRoot,model,props,floor,tourControls:controls,onGame:()=>{needsRender=true;},onTour:()=>{free=false;focusTween=null;camera.fov=38;camera.updateProjectionMatrix();setFree(false);smoothed=progress;}});
  if(import.meta.env.DEV)window.__game=game;
  document.querySelector('#play-game').onclick=()=>game.activate();
  if(new URLSearchParams(location.search).get('mode')!=='tour')game.activate();
},event=>{const percent=event.total?Math.round(event.loaded/event.total*100):0;document.querySelector('#load-progress').textContent=`${percent}%`;document.querySelector('#load-bar').style.width=`${percent}%`;},error=>{
  console.error('Model yüklenemedi',error);document.querySelector('.loader p').textContent='Model yüklenemedi. Sayfayı yenileyerek tekrar deneyin.';
  const retry=document.createElement('button');retry.className='discover';retry.textContent='Tekrar dene';retry.onclick=()=>location.reload();document.querySelector('.loader').appendChild(retry);
});
function updateProgress(){progress=Math.min(4,Math.max(0,scrollY/(document.documentElement.scrollHeight-innerHeight)*4));document.body.classList.toggle('in-tour',progress>.35);}
addEventListener('scroll',updateProgress,{passive:true});updateProgress();
document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>{setFree(false);const step=Number(button.dataset.goto);window.scrollTo({top:step/4*(document.documentElement.scrollHeight-innerHeight),behavior:reduced?'instant':'smooth'});}));
document.querySelector('#mode').onclick=()=>setFree(!free);
document.querySelector('#explore').onclick=()=>setFree(true);
document.querySelector('#return').onclick=()=>setFree(false);
document.querySelector('#reset').onclick=()=>{setFree(false);updateProgress();smoothed=progress;};
function zoom(factor){if(!model)return;if(!free)setFree(true);focusTween=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();}
document.querySelector('#zoom-in').onclick=()=>zoom(.8);
document.querySelector('#zoom-out').onclick=()=>zoom(1.25);
let down;
renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
renderer.domElement.addEventListener('pointerup',event=>{
  if(game?.active||!model||!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)return;
  pointer.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);
  raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable,false)[0];if(!hit)return;
  const selected=hit.object.userData.focusRoot || hit.object;
  const box=new THREE.Box3().setFromObject(selected);const center=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z);
  // Broad combined meshes use the clicked surface instead of the whole street center.
  const focus=max>8?hit.point.clone():center;
  const distance=Math.max(1.4,Math.min(max>8?4:max*2.3,12));
  const direction=camera.position.clone().sub(focus).normalize();direction.y=Math.max(direction.y,.2);direction.normalize();
  setFree(true);focusTween={p:focus.clone().addScaledVector(direction,distance),t:focus};
  document.querySelector('#focus-name').textContent=selected.userData.label || (max>8?'Sokak ve cephe detayı':'Sokak objesi');panel.hidden=false;
});
controls.addEventListener('start',()=>{focusTween=null;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);frameOffset();});
let previous=performance.now();
function animate(now){requestAnimationFrame(animate);const elapsed=(now-previous)/1000;const dt=Math.min(elapsed,.1);previous=now;
  if(game?.active){game.update(dt);const view=game.view();if(needsRender||view.camera.position.distanceToSquared(renderedPosition)>1e-8||1-Math.abs(view.camera.quaternion.dot(renderedRotation))>1e-9){renderer.render(view.scene,view.camera);renderedPosition.copy(view.camera.position);renderedRotation.copy(view.camera.quaternion);needsRender=false;}game.recordFrame(elapsed);return;}
  if(route.length){
    if(!free){smoothed=reduced?progress:THREE.MathUtils.damp(smoothed,progress,5,dt);const index=Math.min(3,Math.floor(smoothed));const raw=smoothed-index;const mix=raw*raw*(3-2*raw);position.fromArray(route[index].p).lerp(new THREE.Vector3(...route[index+1].p),mix);target.fromArray(route[index].t).lerp(new THREE.Vector3(...route[index+1].t),mix);camera.position.copy(position);controls.target.copy(target);camera.lookAt(target);const step=Math.round(smoothed);if(step!==lastStep){lastStep=step;document.querySelectorAll('.chapter-nav button').forEach((b,i)=>b.classList.toggle('active',i===step));}}
    else {if(focusTween){const alpha=reduced?1:1-Math.exp(-5*dt);camera.position.lerp(focusTween.p,alpha);controls.target.lerp(focusTween.t,alpha);if(camera.position.distanceTo(focusTween.p)<.01)focusTween=null;}controls.update();}
  }if(needsRender||camera.position.distanceToSquared(renderedPosition)>1e-8||1-Math.abs(camera.quaternion.dot(renderedRotation))>1e-9){renderer.render(scene,camera);renderedPosition.copy(camera.position);renderedRotation.copy(camera.quaternion);needsRender=false;}
}requestAnimationFrame(animate);
