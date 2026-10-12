import fs from 'node:fs';
import path from 'node:path';
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}
walk('3D-models');
const report={formats:{},models:[],notes:['Yukarı ekseni Y; oyun ölçeği görsel gezi ölçeğinden ayrı uygulanır.','Kaynakta fotoğraf dokulu ince cepheler bulunur; bina içi geometri veya kapı geçitleri varsayılmaz.']};
for(const file of files){const ext=path.extname(file).toLowerCase();report.formats[ext]=(report.formats[ext]||0)+1;if(!['.glb','.gltf'].includes(ext))continue;
const b=fs.readFileSync(file);const j=ext==='.glb'?JSON.parse(b.subarray(20,20+b.readUInt32LE(12))):JSON.parse(b);
const missing=[...(j.buffers||[]),...(j.images||[])].filter(x=>x.uri&&!x.uri.startsWith('data:')&&!fs.existsSync(path.join(path.dirname(file),decodeURIComponent(x.uri)))).map(x=>x.uri);
const textures=(j.images||[]).map(i=>{if(i.bufferView!==undefined){const v=j.bufferViews[i.bufferView];const start=20+b.readUInt32LE(12)+8+(v.byteOffset||0);if(i.mimeType==='image/png')return {width:b.readUInt32BE(start+16),height:b.readUInt32BE(start+20)};}if(i.uri){const p=path.join(path.dirname(file),i.uri);if(fs.existsSync(p)){const png=fs.readFileSync(p);if(png.readUInt32BE(0)===0x89504e47)return{width:png.readUInt32BE(16),height:png.readUInt32BE(20)};}}return {type:i.mimeType};});
report.models.push({file,bytes:b.length,nodes:j.nodes?.length,meshes:j.meshes?.length,triangles:j.meshes?.reduce((s,m)=>s+m.primitives.reduce((a,p)=>a+j.accessors[p.indices??p.attributes.POSITION].count/3,0),0),materials:j.materials?.map(m=>({name:m.name,pbr:!!m.pbrMetallicRoughness,doubleSided:m.doubleSided,alpha:m.alphaMode||'OPAQUE'})),textures,missing,extensions:j.extensionsRequired||[]});}
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/asset-analysis.json',JSON.stringify(report,null,2));console.log(JSON.stringify({formats:report.formats,models:report.models.map(({materials,textures,...m})=>({...m,materialCount:materials?.length,textures})),notes:report.notes},null,2));
