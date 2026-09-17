import { readFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-689.txt', 'utf8');
  console.log('Searching 689...');
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('select') || line.includes('selected') || line.includes('opções') || line.includes('opcao')) {
      if (line.includes('chart') || line.includes('Chart') || line.includes('Grafico') || line.includes('grafico')) {
        console.log(`Line ${idx}: ${line}`);
      }
    }
  });
} catch (e: any) {
  console.error(e.message);
}
