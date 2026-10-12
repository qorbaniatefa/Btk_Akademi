import fs from 'node:fs';
import path from 'node:path';
import { Box3, Matrix4, Vector3, Quaternion } from 'three';
const filename = process.argv[2] || '3D-models/modular_havana_street__low-poly_asset_kit.glb';
const bytes = fs.readFileSync(filename);
const data = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const bounds = new Box3();
const groups = [];
function visit(index, parent = new Matrix4()) {
  const n = data.nodes[index];
  const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation || [0,0,0])), new Quaternion(...(n.rotation || [0,0,0,1])), new Vector3(...(n.scale || [1,1,1])));
  const world = parent.clone().multiply(local);
  const box = new Box3();
  if(n.mesh !== undefined) for(const primitive of data.meshes[n.mesh].primitives){const a=data.accessors[primitive.attributes.POSITION];if(a.min && a.max) box.union(new Box3(new Vector3(...a.min),new Vector3(...a.max)).applyMatrix4(world));}
  for(const child of n.children || []) box.union(visit(child, world));
  if(!box.isEmpty() && n.mesh === undefined) groups.push({name:n.name,center:box.getCenter(new Vector3()).toArray(),size:box.getSize(new Vector3()).toArray()});
  bounds.union(box);return box;
}
for(const index of data.scenes[data.scene || 0].nodes)visit(index);
const missing=(data.images || []).filter(i=>i.uri && !i.uri.startsWith('data:') && !fs.existsSync(path.join(path.dirname(filename),i.uri))).map(i=>i.uri);
console.log(JSON.stringify({filename, bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},groups,missing,meshes:data.meshes.length},null,2));
