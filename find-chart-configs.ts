import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-731.txt', 'utf8');
  
  // Find where chartConfigs or list of charts is defined
  const lines = code.split('\n');
  const matchingLines: string[] = [];
  lines.forEach((line, idx) => {
    if (line.includes('title:') && (line.includes('PRODUÇÃO') || line.includes('PARADA') || line.includes('ECO') || line.includes('BORRA'))) {
      matchingLines.push(`Line ${idx}: ${line}`);
    }
  });
  
  console.log('Matching Lines:');
  console.log(matchingLines.join('\n'));
  
  // Let's search for "const charts = " or "const chartList = " or similar
  let chartsDefPos = code.indexOf('const charts =');
  if (chartsDefPos === -1) {
    chartsDefPos = code.indexOf('const chartList =');
  }
  if (chartsDefPos === -1) {
    chartsDefPos = code.indexOf('const chartsList =');
  }
  if (chartsDefPos === -1) {
    chartsDefPos = code.indexOf('const allCharts =');
  }
  
  if (chartsDefPos !== -1) {
    console.log(`Found charts definition at ${chartsDefPos}`);
    const snippet = code.substring(chartsDefPos, chartsDefPos + 8000);
    writeFileSync('backup-731-charts-list.txt', snippet, 'utf8');
    console.log('Wrote backup-731-charts-list.txt');
  } else {
    // Search for "const " + any array declaration containing charts
    console.log('Charts list not found via direct name. Let\'s write a more flexible search.');
  }
} catch (e: any) {
  console.error(e.message);
}
