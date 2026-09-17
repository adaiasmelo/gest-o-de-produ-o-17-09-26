import { readFileSync, writeFileSync } from 'fs';

try {
  const code = readFileSync('backup-current-299.txt', 'utf8');
  console.log(`backup-current-299.txt count of stats:`);
  
  // Find where const stats = useMemo or const stats = is declared
  let idx = 0;
  while ((idx = code.indexOf('const stats =', idx)) !== -1) {
    console.log(`Found "const stats =" at ${idx}`);
    console.log(code.substring(idx, idx + 500));
    idx += 13;
  }
} catch (e: any) {
  console.error(e.message);
}
