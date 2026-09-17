import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-731.txt', 'utf8');
  const pos = code.indexOf('allCharts.map');
  if (pos !== -1) {
    console.log(`Found allCharts.map at ${pos}`);
    // Write 25000 characters from pos - 2000
    const start = Math.max(0, pos - 2000);
    const snippet = code.substring(start, pos + 18000);
    writeFileSync('backup-731-charts-full.txt', snippet, 'utf8');
    console.log('Wrote backup-731-charts-full.txt');
  } else {
    console.log('Could not find allCharts.map');
  }
} catch (e: any) {
  console.error(e.message);
}
