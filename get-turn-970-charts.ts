import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log(`Searching around Turn 970...`);
  
  for (let i = 998; i >= 950; i--) {
    const turn = data[i];
    if (turn && turn.author === 'model' && turn.payload?.entries) {
      for (const entry of turn.payload.entries) {
        if (entry.path === 'App.tsx') {
          const diffs = entry.diffs || [];
          for (const diff of diffs) {
            const repl = diff.replacement || '';
            if (repl.includes('allCharts') || repl.includes('Charts')) {
              console.log(`Turn ${i} has charts keyword.`);
              writeFileSync(`charts-turn-${i}.txt`, repl, 'utf8');
            }
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
