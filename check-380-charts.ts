import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('selectedChart-turn-380.txt', 'utf8');
  console.log(`selectedChart-turn-380.txt length: ${code.length}`);
  
  // Find allCharts declaration
  const allChartsIdx = code.indexOf('const allCharts =');
  if (allChartsIdx !== -1) {
    const snippet = code.substring(allChartsIdx, allChartsIdx + 2000);
    console.log('--- allCharts in Turn 380 ---');
    console.log(snippet);
    console.log('-----------------------------');
  }
  
  // Find allCharts.map or visibleCharts.map block
  const mapIdx = code.indexOf('allCharts.map');
  const visibleMapIdx = code.indexOf('visibleCharts.map');
  const index = visibleMapIdx !== -1 ? visibleMapIdx : mapIdx;
  
  if (index !== -1) {
    console.log(`Found map at index ${index}`);
    const snippet = code.substring(index - 1000, index + 8000);
    writeFileSync('extracted-380-map.txt', snippet, 'utf8');
    console.log('Wrote extracted-380-map.txt');
  }
} catch (e: any) {
  console.error(e.message);
}
