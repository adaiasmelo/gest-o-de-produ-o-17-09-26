import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  const turn = data[778];
  if (turn && turn.payload?.entries) {
    for (const entry of turn.payload.entries) {
      if (entry.path === 'App.tsx') {
        const diffs = entry.diffs || [];
        for (let d = 0; d < diffs.length; d++) {
          const repl = diffs[d].replacement || '';
          if (repl.includes('const allCharts =')) {
            writeFileSync(`turn-778-diff-${d}.txt`, repl, 'utf8');
            console.log(`Wrote turn-778-diff-${d}.txt, length: ${repl.length}`);
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
