import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-731.txt', 'utf8');
  console.log(`Code length: ${code.length}`);
  
  // Find where PieChart is used and extract 1000 characters before and after
  let pos = code.indexOf('<PieChart');
  if (pos !== -1) {
    console.log(`Found <PieChart at ${pos}`);
    const snippet = code.substring(Math.max(0, pos - 1500), Math.min(code.length, pos + 1500));
    writeFileSync('backup-731-piechart-snippet.txt', snippet, 'utf8');
    console.log('Wrote backup-731-piechart-snippet.txt');
  }
  
  // Let's print all matches for "activeTab" in the jsx
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('activeTab ===') || line.includes('activeTab ===')) {
      console.log(`  Line ${idx}: ${line}`);
    }
  });
} catch (e: any) {
  console.error(e.message);
}
