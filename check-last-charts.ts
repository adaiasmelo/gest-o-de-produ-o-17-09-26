import { readFileSync } from 'fs';

try {
  const code = readFileSync('charts-turn-997.txt', 'utf8');
  console.log(`charts-turn-997.txt length: ${code.length}`);
  
  // Find lines with "chart" or some headings in charts-turn-997
  const lines = code.split('\n');
  console.log('Sample content from 997 charts block:');
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    console.log(`${i}: ${lines[i]}`);
  }
} catch (e: any) {
  console.error(e.message);
}
