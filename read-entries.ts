import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log(`Searching across ${data.length} entries...`);
  
  // Let's filter model turns that had entries with path 'src/App.tsx' and check their diffs/description
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model' && turn.payload?.entries) {
      for (const entry of turn.payload.entries) {
        if (entry.path === 'src/App.tsx' || entry.path === '/src/App.tsx') {
          console.log(`Turn ${i}: path: ${entry.path}, generationType: ${entry.generationType}, description: ${entry.description}`);
          // Let's inspect entry.diffs if any
          if (entry.diffs && Array.isArray(entry.diffs) && entry.diffs.length > 0) {
            console.log(`  Diffs count: ${entry.diffs.length}`);
            const diffSample = JSON.stringify(entry.diffs[0]);
            if (diffSample.includes('charts') || diffSample.includes('BarChart') || diffSample.includes('PieChart')) {
              console.log(`  -> This turn contains chart changes in diff!`);
              writeFileSync(`turn-${i}-app-diffs.json`, JSON.stringify(entry.diffs, null, 2), 'utf8');
              console.log(`  Wrote turn-${i}-app-diffs.json`);
            }
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
