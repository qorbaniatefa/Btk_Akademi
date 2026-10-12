import { spawnSync } from 'node:child_process';
const checks=['physics-check','save-check'];
if(process.argv.includes('--browser'))checks.push('game-check','mission-check','mobile-check','preview-check');
for(const name of checks){const result=spawnSync(process.execPath,[`scripts/${name}.mjs`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
