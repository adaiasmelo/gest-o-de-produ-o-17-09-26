import { readFileSync } from 'fs';

try {
  const code = readFileSync('selectedChart-turn-380.txt', 'utf8');
  console.log('Searching for selectedChartId...');
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('selectedChartId') || line.includes('ChartId')) {
      console.log(`Line ${idx}: ${line}`);
    }
  });
} catch (e: any) {
  console.error(e.message);
}
