import { execSync } from 'child_process';

try {
  console.log('--- GIT STATUS ---');
  console.log(execSync('git status', { encoding: 'utf8' }));

  console.log('--- RECENT COMMITS ---');
  console.log(execSync('git log -n 15 --oneline', { encoding: 'utf8' }));
} catch (err: any) {
  console.error('Error running git:', err.message);
}
