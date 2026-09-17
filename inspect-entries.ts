import { readFileSync, writeFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  const lastElement = data[data.length - 1];
  console.log('Entries length:', lastElement.payload.entries?.length);
  const entry = lastElement.payload.entries?.[0];
  if (entry) {
    console.log('Entry keys:', Object.keys(entry));
    console.log('Entry type:', entry.type);
    console.log('Entry target:', entry.target);
    console.log('Entry instruction:', entry.instruction);
    // write content or replacement to a file so we can view it
    if (entry.replacement) {
      writeFileSync('entry-replacement.txt', entry.replacement, 'utf8');
      console.log('Wrote entry-replacement.txt');
    }
  }
} catch (e: any) {
  console.error(e.message);
}
