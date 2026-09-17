import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('charts-turn-997.txt', 'utf8');
  
  // Let's search inside charts-turn-997.txt for any chart keyword
  const lines = code.split('\n');
  const matches: string[] = [];
  lines.forEach((line, idx) => {
    if (line.includes('const allCharts =') || line.includes('allCharts') || line.includes('dashboardSubTab === \'charts\'') || line.includes('dashboardSubTab === "charts"')) {
      matches.push(`Line ${idx}: ${line}`);
    }
  });
  
  console.log('Matches in 997:');
  console.log(matches.join('\n'));
  
  // Find where charts subtab is matched in JSX
  const chartsIdx = code.indexOf('dashboardSubTab ===');
  if (chartsIdx !== -1) {
    console.log(`dashboardSubTab match found at index ${chartsIdx}`);
    const snippet = code.substring(chartsIdx - 200, chartsIdx + 4000);
    writeFileSync('997-charts-block-jsx.txt', snippet, 'utf8');
    console.log('Wrote 997-charts-block-jsx.txt');
  }
} catch (e: any) {
  console.error(e.message);
}
