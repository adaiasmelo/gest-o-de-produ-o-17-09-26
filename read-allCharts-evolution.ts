import { readFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log(`Searching 998 turns...`);
  
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model' && turn.payload?.entries) {
      for (const entry of turn.payload.entries) {
        if (entry.path === 'App.tsx') {
          const diffs = entry.diffs || [];
          for (const diff of diffs) {
            const repl = diff.replacement || '';
            if (repl.includes('const allCharts =')) {
              const startIdx = repl.indexOf('const allCharts =');
              const snippet = repl.substring(startIdx, startIdx + 2000);
              console.log(`Turn ${i} had const allCharts:`);
              console.log(snippet.substring(0, 1000));
              console.log('----------------------------------------------------');
            }
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
