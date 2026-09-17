import { readFileSync } from 'fs';

try {
  const code = readFileSync('diff-0-replacement.txt', 'utf8');
  console.log('--- FIRST 500 CHARS OF RELACEMENT ---');
  console.log(code.substring(0, 500));
  console.log('--------------------------------------');
  
  // Let's search for "ComposedChart" or "BarChart" or "Recharts" - are they in this file?
  const keywords = ['ComposedChart', 'BarChart', 'PieChart', 'dashboardSubTab', 'charts', 'LineChart', 'lucide-react'];
  keywords.forEach(kw => {
    console.log(`Keyword "${kw}" occurrences:`, (code.match(new RegExp(kw, 'g')) || []).length);
  });
} catch (e: any) {
  console.error(e.message);
}
