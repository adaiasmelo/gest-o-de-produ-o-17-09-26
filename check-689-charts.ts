import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-689.txt', 'utf8');
  console.log(`backup-current-689.txt code length: ${code.length}`);
  
  // Find allCharts in 689
  const lines = code.split('\n');
  const matchingLines: string[] = [];
  lines.forEach((line, idx) => {
    if (line.includes('allCharts') || line.includes('const allCharts =')) {
      matchingLines.push(`Line ${idx}: ${line}`);
    }
  });
  console.log('--- matches in 689 ---');
  console.log(matchingLines.join('\n'));
  
  // Let's search inside backup-current-689.txt for "allCharts" mapping and extract the whole block
  const startIdx = code.indexOf('const allCharts =');
  if (startIdx !== -1) {
    const snippet = code.substring(startIdx, startIdx + 8000);
    writeFileSync('backup-689-charts-list.txt', snippet, 'utf8');
    console.log('Wrote backup-689-charts-list.txt');
  }
} catch (e: any) {
  console.error(e.message);
}
