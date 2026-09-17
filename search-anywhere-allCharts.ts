import { readFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log('Searching for the turn where const allCharts was present...');
  
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model' && turn.payload?.entries) {
      for (const entry of turn.payload.entries) {
        if (entry.path === 'App.tsx') {
          const diffs = entry.diffs || [];
          for (const diff of diffs) {
            const repl = diff.replacement || '';
            if (repl.includes('const allCharts =')) {
              console.log(`FOUND ALLCHARTS at Turn ${i}! Description: ${entry.description}`);
              // Stop after finding the most recent one
              process.exit(0);
            }
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
