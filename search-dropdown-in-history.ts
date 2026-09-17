import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log(`Searching history for dropdown and allCharts mapping...`);
  
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model' && turn.payload?.entries) {
      for (const entry of turn.payload.entries) {
        if (entry.path === 'App.tsx') {
          const diffs = entry.diffs || [];
          for (const diff of diffs) {
            const repl = diff.replacement || '';
            if (repl.includes('selectedChartId') && repl.includes('allCharts')) {
              console.log(`✨ Found candidate: Turn ${i}`);
              // Let's write the replacement to a file
              writeFileSync(`selectedChart-turn-${i}.txt`, repl, 'utf8');
              console.log(`Wrote selectedChart-turn-${i}.txt`);
            }
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
