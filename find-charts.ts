import { readFileSync } from 'fs';

const files = [
  'prompt_2026-02-06T14-09-59.195Z.json',
  'prompt_2026-01-15T22-04-12.869Z.json',
  'prompt_2026-01-13T09-46-03.154Z.json'
];

for (const file of files) {
  try {
    const raw = readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    console.log(`File: ${file}, elements: ${data.length}`);
    
    data.forEach((turn: any, index: number) => {
      const payloadStr = JSON.stringify(turn.payload || {});
      if (payloadStr.includes('dashboardSubTab') || payloadStr.includes('charts') || payloadStr.includes('Visualizacao de Graficos') || payloadStr.includes('ComposedChart')) {
        console.log(`  Found potential chart reference in turn ${index} (author: ${turn.author})`);
        // Let's print some preview snippet or search for React code
        if (payloadStr.includes('ComposedChart') && payloadStr.includes('BarChart')) {
          console.log(`    MATCHED ComposedChart AND BarChart! Length: ${payloadStr.length}`);
        }
      }
    });
  } catch (e: any) {
    console.error(`Error reading ${file}:`, e.message);
  }
}
