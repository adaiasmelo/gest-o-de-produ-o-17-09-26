import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-731.txt', 'utf8');
  
  // Find where allCharts is referenced
  let pos = 0;
  const indices: number[] = [];
  while ((pos = code.indexOf('allCharts', pos)) !== -1) {
    indices.push(pos);
    pos += 9;
  }
  
  console.log('Occurrences of allCharts:', indices);
  indices.forEach((index, idx) => {
    console.log(`Occurrence ${idx} (pos: ${index}):`);
    console.log(code.substring(Math.max(0, index - 100), Math.min(code.length, index + 800)));
  });
} catch (e: any) {
  console.error(e.message);
}
