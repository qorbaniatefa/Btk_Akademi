import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Triangle, Vector3, Plane } from 'three';
import { Octree } from 'three/addons/math/Octree.js';

// Thin imported facades must collide from both sides, irrespective of winding.
class TwoSidedOctree extends Octree {
  rayIntersect(ray) {
    const triangles=[];this.getRayTriangles(ray,triangles);
    const point=new Vector3();let nearest=null;
    for(const triangle of triangles){
      if(!ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,point))continue;
      const distance=point.distanceTo(ray.origin);
      if(!nearest||distance<nearest.distance)nearest={distance,position:point.clone(),triangle};
    }
    return nearest||false;
  }
  triangleCapsuleIntersect(capsule, triangle) {
    triangle.getPlane(this.plane ||= new Plane());
    capsule.getCenter(this.center ||= new Vector3());
    if (this.plane.distanceToPoint(this.center) < 0) {
      this.reversed ||= new Triangle();
      this.reversed.set(triangle.c, triangle.b, triangle.a);
      return super.triangleCapsuleIntersect(capsule, this.reversed);
    }
    return super.triangleCapsuleIntersect(capsule, triangle);
  }
}

export class CollisionWorld {
  constructor(roots = []) {
    this.octree = new TwoSidedOctree();
    this.triangleCount = 0;
    for (const root of roots) this.addRoot(root);
    // A solid slab supports the original street and the surrounding exploration plaza.
    const support = new Group();
    const slab = new Mesh(new BoxGeometry(160, 1, 160), new MeshBasicMaterial());
    slab.position.y = -.55; support.add(slab);this.addRoot(support);
    slab.geometry.dispose();slab.material.dispose();
    this.octree.build();
  }
  addRoot(root) {
    root.updateWorldMatrix(true, true);
    root.traverse(object => {
      if (!object.isMesh || object.userData.noCollision) return;
      const attribute = object.geometry.attributes.position;
      const index = object.geometry.index;
      const count = index ? index.count : attribute.count;
      for (let i = 0; i < count; i += 3) {
        const vertices = [0, 1, 2].map(j => new Vector3().fromBufferAttribute(attribute, index ? index.getX(i+j) : i+j).applyMatrix4(object.matrixWorld));
        const triangle = new Triangle(...vertices);
        if (triangle.getArea() < 1e-8) continue;
        this.octree.addTriangle(triangle);this.triangleCount++;
      }
    });
  }
  intersect(capsule) { return this.octree.capsuleIntersect(capsule); }
  clearAt(capsule) {
    const hit = this.intersect(capsule);
    return !hit || hit.depth < .015 || hit.normal.y > .7;
  }
}
