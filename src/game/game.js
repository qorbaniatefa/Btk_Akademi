import './game.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CollisionWorld } from './collision-world.js';
import { Player, SPAWN } from './player.js';
import { createGameObjects, Interaction } from './interaction.js';
import { readSave, writeSave, readSettings, progressOf, SETTINGS_KEY } from './save.js';
import { GameUI } from './ui.js';
import { GameAudio } from './audio.js';

const GAME_SCALE=2.5;
export class ExplorationGame {
  constructor({scene,camera,renderer,worldRoot,model,props,floor,tourControls,onTour,onGame}) {
    Object.assign(this,{scene,camera,renderer,worldRoot,model,props,floor,tourControls,onTour,onGame});
    this.active=false;this.state='welcome';this.keys=new Set();this.settings=readSettings();this.save=readSave();
    this.data=this.save||this.freshData();this.dragMode=false;this.dragging=false;this.carried=null;this.inspected=null;this.completeShown=progressOf(this.data).complete;
    this.audio=new GameAudio();this.audio.volume=this.settings.volume;this.sinceSave=0;this.sinceRay=0;this.fpsTime=0;this.fpsFrames=0;this.elapsed=0;this.autoTimer=0;
    this.setWorldScale(true);
    const paving=document.createElement('canvas');paving.width=256;paving.height=256;const context=paving.getContext('2d');context.fillStyle='#d0c3ad';context.fillRect(0,0,256,256);context.strokeStyle='#bdaf96';context.lineWidth=2;context.strokeRect(0,0,256,256);context.beginPath();context.moveTo(0,128);context.lineTo(256,128);context.moveTo(128,0);context.lineTo(128,128);context.moveTo(64,128);context.lineTo(64,256);context.moveTo(192,128);context.lineTo(192,256);context.stroke();
    this.pavingTexture=new THREE.CanvasTexture(paving);this.pavingTexture.colorSpace=THREE.SRGBColorSpace;this.pavingTexture.wrapS=this.pavingTexture.wrapT=THREE.RepeatWrapping;this.pavingTexture.repeat.set(160,160);
    const {extra,entries}=createGameObjects(props);this.extra=extra;this.entries=entries;scene.add(extra);extra.updateMatrixWorld(true);
    // Original lamp billboards have transparent rectangles around the pole.
    // Collide with generated solid lamp geometry instead of those invisible regions.
    model.traverse(o=>{if(o.isMesh){let ancestor=o.parent;while(ancestor&&ancestor!==model){if(ancestor.name.startsWith('Cylinder')){o.userData.noCollision=true;break;}ancestor=ancestor.parent;}}});
    this.world=new CollisionWorld([worldRoot]);this.player=new Player(camera,this.world);
    const occluders=[];model.traverse(o=>{if(o.isMesh&&!o.userData.noCollision)occluders.push(o);});props.traverse(o=>{if(o.isMesh)occluders.push(o);});
    this.interaction=new Interaction(camera,entries,occluders,this.world);
    this.inspectionScene=new THREE.Scene();this.inspectionScene.background=new THREE.Color('#14231f');
    this.inspectionScene.add(new THREE.HemisphereLight(0xfff2d6,0x647466,3));const light=new THREE.DirectionalLight(0xffdfb3,4);light.position.set(3,5,4);this.inspectionScene.add(light);
    this.inspectionCamera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.01,100);this.inspectionCamera.position.set(2,1.2,4);
    this.inspectionControls=new OrbitControls(this.inspectionCamera,renderer.domElement);this.inspectionControls.enabled=false;this.inspectionControls.enableDamping=true;this.inspectionControls.enablePan=false;this.inspectionControls.minDistance=1.3;this.inspectionControls.maxDistance=9;
    this.flashlight=new THREE.SpotLight(0xffecd0,0,22,Math.PI/7,.5,1.4);this.flashlight.position.set(.15,-.1,-.2);this.flashlight.target.position.set(0,0,-8);camera.add(this.flashlight,this.flashlight.target);scene.add(camera);
    this.ui=new GameUI(this.actions(),entries,this.settings,!!this.save);this.ui.root.hidden=true;
    this.installInput();this.setWorldScale(false);extra.visible=false;this.updateHUD();
    this.ui.root.querySelector('#quality-note').textContent='Otomatik mod FPS düştüğünde çözünürlüğü ve gölge kalitesini azaltır.';
    this.applyQuality();
  }
  freshData(){return {version:1,discovered:[],region:false,inspected:false,position:SPAWN.toArray(),yaw:0,pitch:0};}
  setWorldScale(playing){this.worldRoot.scale.setScalar(playing?GAME_SCALE:1);this.props.children.forEach(g=>g.scale.setScalar(playing&&g.name!=='Sokak lambası'?1/GAME_SCALE:1));this.worldRoot.updateMatrixWorld(true);}
  actions(){return {
    new:()=>this.start(false),continue:()=>this.start(true),resume:()=>this.resume(),pause:()=>this.pause(),
    settings:()=>this.openMenu('settings'),guide:()=>this.openMenu('guide'),back:()=>this.show(this.returnState||'pause'),
    collection:()=>this.openCollection(),closeCollection:()=>this.resume(),closeInspect:()=>this.closeInspect(),
    inspectZoomIn:()=>this.inspectZoom(.8),inspectZoomOut:()=>this.inspectZoom(1.25),take:()=>this.take(),drop:()=>this.drop(),
    reset:()=>{this.player.reset();this.persist();this.resume();this.ui.notice('Başlangıç konumuna döndün.');},
    menu:()=>{this.persist();this.releaseLock();this.show('welcome');this.ui.root.querySelector('[data-action="continue"]').hidden=false;},
    tour:()=>this.leave(),settingChange:()=>this.changeSettings(),fullscreen:()=>this.fullscreen(),
    dragMode:()=>{this.dragMode=true;this.ui.root.querySelector('.game-fallback').hidden=true;this.show('playing');},
    dismissMobile:()=>{this.ui.root.querySelector('.game-mobile').hidden=true;}
  };}
  activate(){
    this.active=true;document.body.classList.add('game-mode');this.ui.root.hidden=false;this.extra.visible=true;
    this.setWorldScale(true);this.tourControls.enabled=false;this.onGame();
    this.scene.background.set('#c7d4cc');this.scene.fog.color.set('#c7d4cc');this.floor.material.map=this.pavingTexture;this.floor.material.needsUpdate=true;
    this.camera.clearViewOffset();this.camera.fov=45;this.camera.updateProjectionMatrix();
    this.camera.position.set(48,31,56);this.camera.lookAt(0,3,0);this.show('welcome');
    if(matchMedia('(pointer:coarse)').matches)this.ui.root.querySelector('.game-mobile').hidden=false;
    this.renderer.shadowMap.needsUpdate=true;this.applyQuality();
  }
  leave(){
    this.persist();this.releaseLock();this.closeInspectionObject();this.interaction.setTarget(null);this.keys.clear();
    this.active=false;this.ui.root.hidden=true;document.body.classList.remove('game-mode');this.extra.visible=false;this.setWorldScale(false);
    this.scene.background.set('#f3efe6');this.scene.fog.color.set('#f3efe6');this.floor.material.map=null;this.floor.material.needsUpdate=true;
    this.flashlight.intensity=0;this.inspectionControls.enabled=false;this.renderer.shadowMap.needsUpdate=true;this.onTour();
  }
  start(continuing){
    this.closeInspectionObject();this.carried=null;this.ui.root.querySelector('.game-drop').hidden=true;this.data=continuing?(readSave()||this.freshData()):this.freshData();this.completeShown=progressOf(this.data).complete;
    this.entries.forEach(entry=>entry.locations.forEach(({object,position})=>{object.visible=true;object.position.copy(position);object.updateMatrixWorld(true);}));
    if(continuing&&this.data.journal){const journal=this.entries.find(e=>e.id==='journal');journal.object.position.fromArray(this.data.journal.position);journal.object.updateMatrixWorld(true);if(this.data.journal.carried){this.carried=journal;journal.object.visible=false;this.ui.root.querySelector('.game-drop').hidden=false;}}
    this.player.reset();if(continuing){this.player.teleport(new THREE.Vector3(...this.data.position));if(!this.world.clearAt(this.player.collider))this.player.reset();this.player.yaw=this.data.yaw;this.player.pitch=this.data.pitch;this.player.syncCamera(false);}
    this.updateHUD();this.persist();this.resume();this.ui.notice('Bank, saksı ve lambayı incele. Gizli not için batı köşesini ara.');
  }
  resume(){
    this.closeInspectionObject();this.inspectionControls.enabled=false;this.keys.clear();this.player.syncCamera(false);this.camera.clearViewOffset();this.camera.fov=65;this.camera.updateProjectionMatrix();
    this.audio.unlock();this.show('playing');if(!this.dragMode)this.requestLock();
  }
  requestLock(){
    if(document.pointerLockElement===this.renderer.domElement)return;
    if(!this.renderer.domElement.requestPointerLock){this.lockFailed();return;}
    try{const promise=this.renderer.domElement.requestPointerLock();promise?.catch(()=>this.lockFailed());}catch{this.lockFailed();}
  }
  lockFailed(){if(!this.active)return;this.keys.clear();this.show('pause');this.ui.root.querySelector('.game-fallback').hidden=false;}
  releaseLock(){if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();}
  show(state){this.state=state;this.ui.screen(state);this.inspectionControls.enabled=state==='inspect';if(state!=='playing'){this.keys.clear();this.interaction.setTarget(null);this.ui.prompt(null);}this.onGame();}
  pause(){if(!this.active)return;this.persist();this.show('pause');this.releaseLock();}
  openMenu(state){this.returnState=this.state==='welcome'?'welcome':'pause';this.persist();this.show(state);this.releaseLock();}
  openCollection(){this.persist();this.show('collection');this.releaseLock();this.updateHUD();}
  installInput(){
    document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===this.renderer.domElement){this.ui.root.querySelector('.game-fallback').hidden=true;}else if(this.active&&this.state==='playing'&&!this.dragMode)this.pause();});
    document.addEventListener('pointerlockerror',()=>this.lockFailed());
    document.addEventListener('mousemove',e=>{if(this.active&&this.state==='playing'&&(document.pointerLockElement===this.renderer.domElement||(this.dragMode&&this.dragging)))this.player.look(e.movementX,e.movementY,this.settings.sensitivity);});
    this.renderer.domElement.addEventListener('pointerdown',e=>{if(this.active&&this.state==='playing'&&this.dragMode){this.dragging=true;this.renderer.domElement.setPointerCapture(e.pointerId);}});
    this.renderer.domElement.addEventListener('pointerup',()=>this.dragging=false);
    document.addEventListener('keydown',e=>{
      if(!this.active)return;
      if(e.code==='Tab'&&e.repeat){e.preventDefault();return;}
      if(e.code==='Escape'){e.preventDefault();if(this.state==='inspect'){this.closeInspectionObject();this.persist();}this.pause();return;}
      if(e.code==='Tab'&&this.state==='playing'){e.preventDefault();this.openCollection();return;}
      if(e.code==='Tab'&&this.state==='collection'){e.preventDefault();this.resume();return;}
      if(this.state!=='playing'){
        if(e.code==='Tab'){const dialog=this.ui.root.querySelector('[data-screen]:not([hidden])');const focusable=[...dialog.querySelectorAll('button:not([hidden]),input,select')];const current=focusable.indexOf(document.activeElement);if(focusable.length){e.preventDefault();focusable[(current+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();}}return;
      }
      if(['Space','Tab','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','KeyE','KeyF','KeyR','KeyG'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);if(e.repeat)return;
      if(e.code==='Space')this.player.jump();
      if(e.code==='KeyE'&&this.interaction.target)this.inspect(this.interaction.target);
      if(e.code==='KeyF'){this.flashlight.intensity=this.flashlight.intensity?0:18;this.onGame();this.ui.notice(this.flashlight.intensity?'El feneri açık':'El feneri kapalı');}
      if(e.code==='KeyR'){this.player.reset();this.persist();this.ui.notice('Başlangıç konumuna döndün.');}
      if(e.code==='KeyG')this.drop();
    });
    document.addEventListener('keyup',e=>this.keys.delete(e.code));
    addEventListener('blur',()=>{this.keys.clear();if(this.active&&this.state==='playing')this.pause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.active)this.pause();});
    addEventListener('pagehide',()=>this.persist());
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.pause();this.ui.notice('Grafik bağlamı kayboldu. Sayfayı yenileyerek kayıtlı oyuna devam edebilirsin.');});
  }
  inspect(entry){
    if(this.state!=='playing'||this.interaction.target!==entry)return;
    this.inspected=entry;this.data.inspected=true;if(!this.data.discovered.includes(entry.id)){this.data.discovered.push(entry.id);this.audio.tone();}
    this.closeInspectionObject();this.inspectionObject=this.interaction.cloneForInspection(entry);this.inspectionScene.add(this.inspectionObject);
    this.inspectionCamera.position.set(2,1.2,4);this.inspectionControls.target.set(0,0,0);this.inspectionControls.update();this.resize();this.ui.inspect(entry);this.updateHUD();this.persist();this.show('inspect');this.releaseLock();
  }
  closeInspectionObject(){if(this.inspectionObject){this.inspectionScene.remove(this.inspectionObject);this.inspectionObject=null;}this.inspectionControls.enabled=false;}
  closeInspect(){this.closeInspectionObject();if(this.checkComplete())return;this.resume();}
  inspectZoom(factor){this.inspectionCamera.position.sub(this.inspectionControls.target).multiplyScalar(factor).add(this.inspectionControls.target);this.inspectionControls.update();}
  take(){if(!this.inspected?.portable)return;this.carried=this.inspected;this.carried.object.visible=false;this.ui.root.querySelector('.game-drop').hidden=false;this.persist();this.ui.notice('Defteri aldın. G ile uygun zemine bırakabilirsin.');this.closeInspect();}
  drop(){
    if(!this.carried)return;
    const point=this.player.feet;const forward=new THREE.Vector3(-Math.sin(this.player.yaw),0,-Math.cos(this.player.yaw));point.addScaledVector(forward,.9);
    const probe=this.player.collider.clone();const delta=point.clone().sub(this.player.feet);probe.translate(delta);
    if(!this.world.clearAt(probe)){this.ui.notice('Burada yeterli alan yok. Açık bir zemine bakarak bırak.');return;}
    const ground=this.world.octree.rayIntersect(new THREE.Ray(point.clone().add(new THREE.Vector3(0,2,0)),new THREE.Vector3(0,-1,0)));
    if(!ground||ground.distance>4){this.ui.notice('Defteri güvenli bir zemine bırakmalısın.');return;}
    point.y=ground.position.y+.04;this.carried.object.position.copy(point);this.carried.object.visible=true;this.carried.object.updateMatrixWorld(true);this.carried=null;this.persist();this.ui.root.querySelector('.game-drop').hidden=true;this.ui.notice('Defteri bıraktın.');
  }
  checkComplete(){if(progressOf(this.data).complete&&!this.completeShown){this.completeShown=true;this.persist();this.audio.tone(750);this.show('complete');this.releaseLock();return true;}return false;}
  updateHUD(){this.ui.updateProgress(this.data,progressOf(this.data));}
  persist(){
    if(!this.active||!this.player||this.state==='welcome')return;
    const safe=this.player.safe;this.data.position=safe.toArray();this.data.yaw=this.player.yaw;this.data.pitch=this.player.pitch;
    const journal=this.entries.find(e=>e.id==='journal');this.data.journal={carried:!!this.carried,position:journal.object.position.toArray()};
    if(!writeSave(this.data)&&!this.storageWarning){this.storageWarning=true;this.ui.notice('Tarayıcı kayda izin vermiyor; bu oturumdaki ilerlemen korunuyor.');}
    this.save=this.data;this.ui.root.querySelector('[data-action="continue"]').hidden=false;
    this.ui.root.querySelector('[data-action="new"]').innerHTML='Yeni Oyun <span>↗</span>';
  }
  changeSettings(){
    const root=this.ui.root;this.settings.sensitivity=Number(root.querySelector('#mouse-sensitivity').value);this.settings.volume=Number(root.querySelector('#sound-volume').value);this.settings.quality=root.querySelector('#graphics-quality').value;this.settings.bob=root.querySelector('#camera-bob').checked;
    root.querySelector('#sensitivity-output').textContent=this.settings.sensitivity.toFixed(1);root.querySelector('#volume-output').textContent=`${Math.round(this.settings.volume*100)}%`;this.audio.volume=this.settings.volume;
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(this.settings));}catch{this.ui.notice('Ayarlar bu oturum için uygulandı.');}this.applyQuality();
  }
  applyQuality(level){
    const quality=level||(this.settings.quality==='auto'?(navigator.hardwareConcurrency<=4?'low':'medium'):this.settings.quality);this.effectiveQuality=quality;
    const ratios={low:.8,medium:1,high:1.5};this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratios[quality]));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=quality!=='low';this.renderer.shadowMap.needsUpdate=true;
    this.model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=Math.min(quality==='high'?8:2,this.renderer.capabilities.getMaxAnisotropy());});
    if(this.ui)this.ui.root.querySelector('#quality-note').textContent=`Etkin kalite: ${{low:'Düşük',medium:'Orta',high:'Yüksek'}[quality]}. ${this.settings.quality==='auto'?'FPS düşükse otomatik azaltılır.':'Tercihin kaydedildi.'}`;
    this.onGame();
  }
  fullscreen(){try{const request=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();request?.catch(()=>this.ui.notice('Bu tarayıcı tam ekran isteğini kabul etmedi.'));}catch{this.ui.notice('Bu tarayıcı tam ekranı desteklemiyor.');}}
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.inspectionCamera.aspect=innerWidth/innerHeight;this.inspectionCamera.clearViewOffset();if(innerWidth>800)this.inspectionCamera.setViewOffset(innerWidth,innerHeight,innerWidth*.18,0,innerWidth,innerHeight);else this.inspectionCamera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.20,innerWidth,innerHeight);this.inspectionCamera.updateProjectionMatrix();}
  update(dt){
    if(!this.active)return;this.elapsed+=dt;
    if(this.state==='playing'){
      const recovered=this.player.update(dt,this.keys,this.settings.bob&&!matchMedia('(prefers-reduced-motion: reduce)').matches);if(recovered)this.ui.notice('Güvenli başlangıç konumuna döndün.');
      if(this.player.grounded&&Math.hypot(this.player.velocity.x,this.player.velocity.z)>.8)this.audio.step(this.elapsed);
      this.sinceRay+=dt;if(this.sinceRay>.06){this.sinceRay=0;this.ui.prompt(this.interaction.update());}
      const p=this.player.feet;if(!this.data.region&&p.distanceTo(new THREE.Vector3(-31,0,7))<4){this.data.region=true;this.ui.notice('Yeni bölge keşfedildi: Batı köşesi');this.audio.tone();this.updateHUD();this.persist();this.checkComplete();}
      const bearing=['K','B','G','D'][((Math.round(this.player.yaw/(Math.PI/2))%4)+4)%4];
      const region=p.x<-27?'BATI KÖŞESİ':p.x>27?'DOĞU SOKAĞI':p.z>26?'SOKAK GİRİŞİ':'SOKAKLAR';
      this.ui.root.querySelector('#game-location').textContent=`HAVANA / ${region} · ${bearing}`;
      this.sinceSave+=dt;if(this.sinceSave>3){this.sinceSave=0;this.persist();}
    }else if(this.state==='inspect')this.inspectionControls.update();
  }
  view(){return this.state==='inspect'?{scene:this.inspectionScene,camera:this.inspectionCamera}:{scene:this.scene,camera:this.camera};}
  recordFrame(dt){if(!this.active||this.state!=='playing')return;this.fpsTime+=dt;this.fpsFrames++;if(this.fpsTime>=1){const fps=Math.round(this.fpsFrames/this.fpsTime);this.ui.root.querySelector('#game-fps').textContent=`${fps} FPS`;this.autoTimer+=this.fpsTime;if(this.settings.quality==='auto'&&fps<35&&this.autoTimer>5&&this.effectiveQuality!=='low'){this.applyQuality('low');this.ui.notice('Akıcılık için grafik kalitesi otomatik azaltıldı.');}this.fpsTime=0;this.fpsFrames=0;}}
}
