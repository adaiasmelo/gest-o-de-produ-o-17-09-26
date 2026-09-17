import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-299.txt', 'utf8');
  console.log(`Length of 299: ${code.length}`);
  
  // Find "select" for chart selection
  const selectIdx = code.indexOf('value={selectedChartId || \'\'}');
  if (selectIdx !== -1) {
    console.log(`Found select dropdown at ${selectIdx}`);
    const start = Math.max(0, selectIdx - 1500);
    const snippet = code.substring(start, selectIdx + 11000);
    writeFileSync('extracted-299-charts-view.txt', snippet, 'utf8');
    console.log('Wrote extracted-299-charts-view.txt');
  } else {
    console.log('Could not find selectedChartId select dropdown.');
  }
} catch (e: any) {
  console.error(e.message);
}
