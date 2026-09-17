import { readFileSync, writeFileSync } from 'fs';

const file = 'prompt_2026-02-06T14-09-59.195Z.json';
try {
  const raw = readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  
  console.log(`Analyzing file, length: ${data.length}`);
  
  for (let i = data.length - 1; i >= 0; i--) {
    const turn = data[i];
    if (turn.author === 'model') {
      const payloadStr = JSON.stringify(turn.payload || {});
      if (payloadStr.includes('BarChart') && payloadStr.includes('PieChart')) {
        console.log(`Found candidate turn ${i} containing BarChart and PieChart. Length of turn payload text: ${turn.payload.text?.length}`);
        
        // Let's write the whole text of this turn to a temporary file
        writeFileSync(`model-turn-${i}.txt`, turn.payload.text || '', 'utf8');
        console.log(`Wrote model-turn-${i}.txt`);
        break; // Only write the most recent one first
      }
    }
  }
} catch (e: any) {
  console.error(e.message);
}
