import { readFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  
  let count = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model' && turn.payload?.entries) {
      console.log(`Turn ${i} has ${turn.payload.entries.length} entries`);
      for (const entry of turn.payload.entries) {
        console.log(`  Entry keys:`, Object.keys(entry));
        console.log(`  Entry path:`, entry.path || entry.TargetFile || entry.targetFile);
        console.log(`  Entry keys/values sample:`, Object.entries(entry).map(([k, v]) => `${k}: ${typeof v !== 'object' ? v : Array.isArray(v) ? `Array(${v.length})` : 'Object'}`).join(', '));
      }
      count++;
      if (count > 5) break;
    }
  }
} catch (e: any) {
  console.error(e.message);
}
