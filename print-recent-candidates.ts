import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log(`Checking file prompt_2026-02-06T14-09-59.195Z.json, elements: ${data.length}`);
  
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model' && turn.payload?.entries) {
      for (const entry of turn.payload.entries) {
        if (entry.path === 'App.tsx') {
          const diffs = entry.diffs || [];
          diffs.forEach((diff: any) => {
            const repl = diff.replacement || '';
            const barCount = (repl.match(/BarChart/g) || []).length;
            const pieCount = (repl.match(/PieChart/g) || []).length;
            const composedCount = (repl.match(/ComposedChart/g) || []).length;
            const totalCharts = barCount + pieCount + composedCount;
            if (totalCharts >= 8) {
              console.log(`Model Turn ${i}: ${entry.description}`);
              console.log(`  Charts count: ${totalCharts} (Bar: ${barCount}, Pie: ${pieCount}, Composed: ${composedCount}). Repl length: ${repl.length}`);
              // Let's write the first 1000 characters of the replacement and save files
              writeFileSync(`backup-current-${i}.txt`, repl, 'utf8');
              console.log(`  Wrote backup-current-${i}.txt`);
            }
          });
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
