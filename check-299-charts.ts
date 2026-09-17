import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-299.txt', 'utf8');
  console.log(`backup-current-299.txt length: ${code.length}`);
  
  // Find "chart" or similar selectors, state variables
  const lines = code.split('\n');
  const dLines: string[] = [];
  lines.forEach((line, idx) => {
    if (line.includes('useState') && (line.includes('chart') || line.includes('Chart') || line.includes('allCharts') || line.includes('selectedChart') || line.includes('selected'))) {
      dLines.push(`Line ${idx}: ${line}`);
    }
  });
  console.log('--- matches in 299 ---');
  console.log(dLines.join('\n'));
  
  // Find allCharts definition in 299
  const startIdx = code.indexOf('const allCharts =');
  if (startIdx !== -1) {
    const snippet = code.substring(startIdx, startIdx + 3000);
    writeFileSync('backup-299-charts-list.txt', snippet, 'utf8');
    console.log('Wrote backup-299-charts-list.txt');
  }
} catch (e: any) {
  console.error(e.message);
}
