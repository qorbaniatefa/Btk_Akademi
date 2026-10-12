export const SAVE_KEY='havana-exploration-v1';
export const SETTINGS_KEY='havana-settings-v1';
export const TARGET_IDS=['bench','plant','lamp','journal','secret'];
export const DEFAULT_SETTINGS={sensitivity:1,quality:'auto',volume:.25,bob:false};
function validPosition(p){return Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.abs(p[0])<70&&Math.abs(p[2])<70&&p[1]>-.1&&p[1]<15;}
export function readSave(storage){
  try{
    storage ||= globalThis.localStorage;
    const data=JSON.parse(storage.getItem(SAVE_KEY));if(!data||data.version!==1||!Array.isArray(data.discovered))return null;
    const position=validPosition(data.position)?data.position:[0,.01,33];
    const journal=data.journal?{carried:data.journal.carried===true,position:validPosition(data.journal.position)?data.journal.position:[-7.5,.59,27.5]}:null;
    return {version:1,discovered:[...new Set(data.discovered.filter(id=>TARGET_IDS.includes(id)))],region:data.region===true,inspected:data.inspected===true,position,yaw:Number.isFinite(data.yaw)?data.yaw:0,pitch:Number.isFinite(data.pitch)?Math.max(-1.48,Math.min(1.48,data.pitch)):0,journal};
  }catch{return null;}
}
export function writeSave(data,storage){try{storage ||= globalThis.localStorage;storage.setItem(SAVE_KEY,JSON.stringify({...data,version:1}));return true;}catch{return false;}}
export function readSettings(storage){
  try{storage ||= globalThis.localStorage;const data=JSON.parse(storage.getItem(SETTINGS_KEY))||{};return {...DEFAULT_SETTINGS,sensitivity:Number.isFinite(data.sensitivity)?Math.max(.2,Math.min(3,data.sensitivity)):1,volume:Number.isFinite(data.volume)?Math.max(0,Math.min(1,data.volume)):.25,quality:['auto','low','medium','high'].includes(data.quality)?data.quality:'auto',bob:data.bob===true};}catch{return {...DEFAULT_SETTINGS};}
}
export function progressOf(save){
  const discovered=new Set(save.discovered);const missions=[
    {id:'objects',label:'Bankı, saksıyı ve lambayı incele',done:['bench','plant','lamp'].every(id=>discovered.has(id))},
    {id:'region',label:'Batı köşesine ulaş',done:!!save.region},
    {id:'inspect',label:'Bir nesneyi yakından incele',done:!!save.inspected},
    {id:'secret',label:'Gizli sokak notunu bul',done:discovered.has('secret')},
    {id:'all',label:'Beş keşif hedefini tamamla',done:TARGET_IDS.every(id=>discovered.has(id))}
  ];
  return {missions,percent:Math.round((discovered.size+(save.region?1:0))/6*100),complete:missions.every(m=>m.done)};
}
