import { readFileSync, writeFileSync } from 'fs';

const file = 'prompt_2026-02-06T14-09-59.195Z.json';
try {
  const raw = readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  
  // Let's search for user requests containing words about charts: "gráfico", "grafico", "charts"
  data.forEach((turn: any, index: number) => {
    if (turn.author === 'user') {
      const text = turn.payload.text || '';
      if (text.toLowerCase().includes('gráfico') || text.toLowerCase().includes('charts') || text.toLowerCase().includes('anterior') || text.toLowerCase().includes('voltar') || text.toLowerCase().includes('mudou')) {
        console.log(`Turn ${index} (User): ${text.substring(0, 200)}...`);
        // Let's print the model response for the previous turn if available
        if (index > 0 && data[index - 1].author === 'model') {
           console.log(`  Prev Turn ${index - 1} (Model) matches.`);
        }
      }
    }
  });
} catch (e: any) {
  console.error(e.message);
}
