import { readFileSync } from 'fs';

try {
  const data = JSON.parse(readFileSync('prompt_2026-02-06T14-09-59.195Z.json', 'utf8'));
  const lastElement = data[data.length - 1];
  console.log('Keys of lastElement:', Object.keys(lastElement));
  console.log('Keys of lastElement.payload:', Object.keys(lastElement.payload));
  console.log('lastElement.payload.type:', lastElement.payload.type);
  // If there are files or attachments or content or parts, let's see them:
  if (lastElement.payload.parts) {
    console.log('Parts length:', lastElement.payload.parts.length);
  }
} catch (e: any) {
  console.error(e.message);
}
