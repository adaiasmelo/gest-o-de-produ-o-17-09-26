import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('turn-778-diff-0.txt', 'utf8');
  console.log(`turn-778-diff-0.txt length: ${code.length}`);
  
  // Find "const allCharts"
  const startIdx = code.indexOf('const allCharts =');
  if (startIdx !== -1) {
    const listSnippet = code.substring(startIdx, startIdx + 3000);
    console.log('--- allCharts definition ---');
    console.log(listSnippet);
    console.log('----------------------------');
  }
  
  // Find how visibleCharts is memoized
  const memoIdx = code.indexOf('const visibleCharts =');
  if (memoIdx !== -1) {
    console.log('--- visibleCharts definition ---');
    console.log(code.substring(memoIdx, memoIdx + 1000));
    console.log('----------------------------');
  }
  
  // Find where it's mapped in JSX
  const mapIdx = code.indexOf('visibleCharts.map');
  const allMapIdx = code.indexOf('allCharts.map');
  const mapIndex = mapIdx !== -1 ? mapIdx : allMapIdx;
  if (mapIndex !== -1) {
    console.log(`Found map at ${mapIndex}`);
    const jsxSnippet = code.substring(mapIndex - 1000, mapIndex + 12000);
    writeFileSync('extracted-778-charts-map.txt', jsxSnippet, 'utf8');
    console.log('Wrote extracted-778-charts-map.txt');
  }
} catch (e: any) {
  console.error(e.message);
}
