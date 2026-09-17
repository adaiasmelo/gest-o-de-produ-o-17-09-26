import { readFileSync, writeFileSync } from 'fs';

const files = [
  'backup-current-909.txt',
  'backup-current-904.txt',
  'backup-current-898.txt'
];

for (const file of files) {
  try {
    const code = readFileSync(file, 'utf8');
    console.log(`Analyzing file: ${file}, length: ${code.length}`);
    
    // Find all occurrences of allCharts and print the definition block
    const startIdx = code.indexOf('const allCharts =');
    if (startIdx !== -1) {
      const snippet = code.substring(startIdx, startIdx + 3000);
      console.log(`--- Chart list in ${file} ---`);
      console.log(snippet);
      console.log('-----------------------------');
      
      // Also let's extract the JSX block where allCharts is mapped so we can see how the 13th chart was rendered.
      const mapIdx = code.indexOf('allCharts.map');
      if (mapIdx !== -1) {
        const mapSnippet = code.substring(mapIdx - 1000, mapIdx + 12000);
        writeFileSync(`extracted-allCharts-map-${file}.txt`, mapSnippet, 'utf8');
        console.log(`Wrote extracted-allCharts-map-${file}.txt`);
      }
      break; // Found it in the newest file, can stop
    }
  } catch (e: any) {
    console.error(`Error reading ${file}:`, e.message);
  }
}
