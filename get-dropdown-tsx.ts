import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('selectedChart-turn-380.txt', 'utf8');
  
  // Find all `<select` inside the file
  let idx = 0;
  const selectMatches: number[] = [];
  while ((idx = code.indexOf('<select', idx)) !== -1) {
    selectMatches.push(idx);
    idx += 7;
  }
  
  console.log('Select Tag Positions:', selectMatches);
  
  selectMatches.forEach((pos, index) => {
    console.log(`Select ${index}:`);
    console.log(code.substring(Math.max(0, pos - 100), Math.min(code.length, pos + 1000)));
    console.log('---------------------------');
  });
} catch (e: any) {
  console.error(e.message);
}
