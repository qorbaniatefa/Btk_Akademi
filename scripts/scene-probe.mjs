import { Box3, Ray, Vector3 } from 'three';

// QA only: samples real walkable geometry and raycasts real discovery targets.
export function probeScene(game){
  const p=game.player,world=game.world;const original=p.feet;
  const cells=new Map();const radius=p.collider.radius;
  for(let x=-37;x<=37;x++)for(let z=-33;z<=37;z++){
    const floor=world.octree.rayIntersect(new Ray(new Vector3(x,.8,z),new Vector3(0,-1,0)));
    if(!floor||floor.distance>1.1)continue;
    const feet=new Vector3(x,floor.position.y+.025,z);
    const capsule=p.collider.clone();capsule.start.copy(feet).add(new Vector3(0,radius,0));capsule.end.copy(feet).add(new Vector3(0,1.8-radius,0));
    const hit=world.intersect(capsule);
    if(hit&&hit.depth>.005)continue;
    cells.set(`${x},${z}`,feet);
  }
  const start='0,33',queue=[start],reachable=new Set([start]);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i].split(',').map(Number);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const key=`${x+dx},${z+dz}`;if(!reachable.has(key)&&cells.has(key)){
        // Check the full edge at capsule-sized intervals, not just its endpoints.
        const a=cells.get(queue[i]),b=cells.get(key);let clear=true;
        for(let step=1;step<=4;step++){const feet=a.clone().lerp(b,step/4);const capsule=p.collider.clone();capsule.start.copy(feet).add(new Vector3(0,radius,0));capsule.end.copy(feet).add(new Vector3(0,1.8-radius,0));const hit=world.intersect(capsule);if(hit&&hit.depth>.008){clear=false;break;}}
        if(clear){reachable.add(key);queue.push(key);}
      }
    }
  }
  const targets=[];
  for(const entry of game.entries){
    const points=[];for(const object of entry.objects){object.updateMatrixWorld(true);object.traverse(o=>{if(o.isMesh)points.push(new Box3().setFromObject(o).getCenter(new Vector3()));});}
    let found=null;
    for(const key of reachable){
      const feet=cells.get(key);const eye=feet.clone().add(new Vector3(0,1.65,0));
      for(const point of points){
        if(eye.distanceTo(point)>3.05||eye.distanceTo(point)<.5)continue;
        p.teleport(feet);const delta=point.clone().sub(eye);p.yaw=Math.atan2(-delta.x,-delta.z);p.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));p.syncCamera(false);
        if(game.interaction.update()?.id===entry.id){found={id:entry.id,feet:feet.toArray(),yaw:p.yaw,pitch:p.pitch};break;}
      }if(found)break;
    }
    targets.push(found||{id:entry.id,unreachable:true});
  }
  const region=[...reachable].some(key=>cells.get(key).distanceTo(new Vector3(-31,0,7))<4);
  game.interaction.setTarget(null);p.teleport(original);
  return {sampled:cells.size,reachable:reachable.size,region,targets};
}
