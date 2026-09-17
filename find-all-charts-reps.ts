import { readFileSync, writeFileSync } from 'fs';

const files = [
  'prompt_2026-02-06T14-09-59.195Z.json',
  'prompt_2026-01-15T22-04-12.869Z.json',
  'prompt_2026-01-13T09-46-03.154Z.json'
];

for (const file of files) {
  try {
    const raw = readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    console.log(`Analyzing file ${file}, length: ${data.length}`);
    
    for (let i = data.length - 1; i >= 0; i--) {
      const turn = data[i];
      if (turn.author === 'model' && turn.payload?.entries) {
        for (const entry of turn.payload.entries) {
          if (entry.path === 'App.tsx' || entry.path === 'src/App.tsx') {
            const diffs = entry.diffs || [];
            diffs.forEach((diff: any) => {
              const repl = diff.replacement || '';
              // Let's count how many times BarChart / PieChart occur
              const barCount = (repl.match(/BarChart/g) || []).length;
              const pieCount = (repl.match(/PieChart/g) || []).length;
              const composedCount = (repl.match(/ComposedChart/g) || []).length;
              const totalCharts = barCount + pieCount + composedCount;
              if (totalCharts >= 8) {
                console.log(`  File: ${file}, Turn ${i}: description: ${entry.description}`);
                console.log(`    Total charts in replacement: ${totalCharts} (Bar: ${barCount}, Pie: ${pieCount}, Composed: ${composedCount}). Length: ${repl.length}`);
                
                // Let's save this replacement to a file
                writeFileSync(`backup-charts-turn-${i}.txt`, repl, 'utf8');
                console.log(`    Wrote backup-charts-turn-${i}.txt`);
              }
            });
          }
        }
      }
    }
  } catch (e: any) {
    console.error(e.message);
  }
}
