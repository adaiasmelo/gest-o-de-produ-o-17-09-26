import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  console.log(`Checking turns 890 to 910...`);
  
  for (let i = 890; i <= 910; i++) {
    if (i < data.length) {
      const turn = data[i];
      console.log(`Turn ${i} (Author: ${turn.author}):`);
      if (turn.author === 'model' && turn.payload?.entries) {
        for (const entry of turn.payload.entries) {
          console.log(`  Entry path: ${entry.path}, description: ${entry.description}`);
          if (entry.diffs) {
            console.log(`    Diffs length: ${entry.diffs.length}`);
            writeFileSync(`turn-${i}-diffs.json`, JSON.stringify(entry.diffs, null, 2), 'utf8');
            console.log(`    Wrote turn-${i}-diffs.json`);
          }
        }
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
