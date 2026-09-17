import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-731.txt', 'utf8');
  console.log(`backup-current-731.txt length: ${code.length}`);
  
  // Find allCharts definition
  const startIdx = code.indexOf('const allCharts =');
  if (startIdx !== -1) {
    const snippet = code.substring(startIdx, startIdx + 2000);
    console.log('--- allCharts definition in 731 ---');
    console.log(snippet);
    console.log('----------------------------------');
  }
  
  // Find where allCharts is mapped and extract it
  const mapIdx = code.indexOf('allCharts.map');
  if (mapIdx !== -1) {
    console.log(`Found allCharts.map in 731 at index ${mapIdx}`);
    const sub = code.substring(mapIdx - 1000, mapIdx + 12000);
    writeFileSync('extracted-allCharts-map-731.txt', sub, 'utf8');
    console.log('Wrote extracted-allCharts-map-731.txt');
  }
} catch (e: any) {
  console.error(e.message);
}
