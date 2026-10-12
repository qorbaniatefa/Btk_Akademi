import { Vector3, Euler } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

export const EYE_HEIGHT = 1.65;
export const SPAWN = new Vector3(0, .01, 33);
const RADIUS = .30;
const HEIGHT = 1.8;
const STEP_HEIGHT = .24;
export class Player {
  constructor(camera, world) {
    this.camera=camera;this.world=world;this.velocity=new Vector3();this.yaw=0;this.pitch=0;
    this.collider=new Capsule(new Vector3(),new Vector3(),RADIUS);
    this.grounded=false;this.time=0;this.safe=SPAWN.clone();this.accumulator=0;this.penetrationTime=0;
    this.direction=new Vector3();this.delta=new Vector3();this.euler=new Euler(0,0,0,'YXZ');
    this.reset();
  }
  get feet(){return new Vector3(this.collider.start.x,this.collider.start.y-RADIUS,this.collider.start.z);}
  teleport(feet){this.collider.start.copy(feet).add(new Vector3(0,RADIUS,0));this.collider.end.copy(feet).add(new Vector3(0,HEIGHT-RADIUS,0));this.velocity.set(0,0,0);this.accumulator=0;this.grounded=false;this.syncCamera(false);}
  reset(){this.teleport(SPAWN);this.yaw=0;this.pitch=0;this.penetrationTime=0;this.safe.copy(SPAWN);this.syncCamera(false);}
  look(dx,dy,sensitivity){this.yaw-=dx*.002*sensitivity;this.pitch=Math.max(-1.48,Math.min(1.48,this.pitch-dy*.002*sensitivity));this.syncCamera(false);}
  jump(){if(this.grounded){this.velocity.y=5.6;this.grounded=false;return true;}return false;}
  update(dt,keys,bob=false){
    // Fixed physics ticks with bounded catch-up prevent tunnelling after a long frame.
    this.accumulator=Math.min(this.accumulator+dt,.15);
    while(this.accumulator>=1/120){this.step(1/120,keys);this.accumulator-=1/120;}
    this.time+=dt;this.syncCamera(bob);
    const p=this.feet;
    const residual=this.world.intersect(this.collider);this.penetrationTime=residual&&residual.depth>.1?this.penetrationTime+dt:0;
    if(!Number.isFinite(p.x+p.y+p.z)||p.y < -3||Math.abs(p.x)>72||Math.abs(p.z)>72||this.penetrationTime>.6){this.reset();return 'reset';}
    if(this.grounded&&this.world.clearAt(this.collider))this.safe.copy(p);
    return null;
  }
  step(dt,keys){
    const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
    const side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?6:3.2;
    this.direction.set(side,0,-forward).normalize().applyAxisAngle(new Vector3(0,1,0),this.yaw).multiplyScalar(speed);
    const alpha=1-Math.exp(-(this.grounded?12:4)*dt);
    this.velocity.x+=(this.direction.x-this.velocity.x)*alpha;this.velocity.z+=(this.direction.z-this.velocity.z)*alpha;
    this.velocity.y=Math.max(-25,this.velocity.y-16*dt);
    const before=this.collider.clone();
    this.delta.copy(this.velocity).multiplyScalar(dt);this.collider.translate(this.delta);
    this.grounded=false;let blocked=false;
    for(let pass=0;pass<4;pass++){
      const hit=this.world.intersect(this.collider);if(!hit||hit.depth<1e-7)break;
      if(hit.normal.y>.65){this.grounded=true;if(this.velocity.y<0)this.velocity.y=0;}
      else {blocked=blocked||Math.abs(hit.normal.y)<.3;const inward=this.velocity.dot(hit.normal);if(inward<0)this.velocity.addScaledVector(hit.normal,-inward);}
      this.collider.translate(hit.normal.clone().multiplyScalar(hit.depth+1e-5));
    }
    // Attempt a small step only if it lands on an actual walkable surface.
    if(blocked && this.grounded && (forward||side)){
      const candidate=before.clone();candidate.translate(new Vector3(this.delta.x,STEP_HEIGHT,this.delta.z));
      if(!this.world.intersect(candidate)){
        let landed=false;
        for(let i=0;i<13;i++){
          candidate.translate(new Vector3(0,-.02,0));const hit=this.world.intersect(candidate);
          if(hit){if(hit.normal.y>.65){candidate.translate(hit.normal.clone().multiplyScalar(hit.depth+1e-5));landed=true;}break;}
        }
        if(landed){this.collider.copy(candidate);this.grounded=true;}
      }
    }
  }
  syncCamera(bob){
    this.camera.position.copy(this.collider.start);this.camera.position.y+=EYE_HEIGHT-RADIUS;
    if(bob&&this.grounded){const speed=Math.hypot(this.velocity.x,this.velocity.z);this.camera.position.y+=Math.sin(this.time*12)*.025*Math.min(speed/3.2,1);}
    this.euler.set(this.pitch,this.yaw,0);this.camera.quaternion.setFromEuler(this.euler);
  }
}
