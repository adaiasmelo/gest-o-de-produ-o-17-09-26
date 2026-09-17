import { readFileSync, writeFileSync } from 'fs';

try {
  const diffs = JSON.parse(readFileSync('turn-898-diffs.json', 'utf8'));
  console.log(`Diffs array length: ${diffs.length}`);
  
  // Let's examine each diff chunk. Each chunk typically has: original, replacement or similar
  diffs.forEach((diff: any, idx: number) => {
    console.log(`Diff ${idx}:`);
    console.log(`  Keys:`, Object.keys(diff));
    
    // Write the contents of diff to separate text files to make viewing easy
    if (diff.original) {
      writeFileSync(`diff-${idx}-original.txt`, diff.original, 'utf8');
    }
    if (diff.replacement) {
      writeFileSync(`diff-${idx}-replacement.txt`, diff.replacement, 'utf8');
      console.log(`  Wrote diff-${idx}-replacement.txt, length: ${diff.replacement.length}`);
    }
  });
} catch (e: any) {
  console.error(e.message);
}
