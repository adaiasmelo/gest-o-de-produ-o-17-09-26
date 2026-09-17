import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-299.txt', 'utf8');
  console.log('Searching 299 for selectedChartId references...');
  
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('selectedChartId')) {
      console.log(`Line ${idx}: ${line}`);
    }
  });
  
  // Find where it's being rendered as a select
  let pos = 0;
  while ((pos = code.indexOf('selectedChartId', pos)) !== -1) {
    console.log(`--- Occurrence at pos ${pos} ---`);
    console.log(code.substring(Math.max(0, pos - 150), Math.min(code.length, pos + 400)));
    pos += 15;
  }
} catch (e: any) {
  console.error(e.message);
}
