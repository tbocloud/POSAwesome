const { execSync } = require('child_process');

console.log('Installing dependencies...');
execSync('yarn install', { stdio: 'inherit' });

console.log('Building the application...');
execSync('node esbuild --production --apps posawesome --run-build-command', { stdio: 'inherit' }); 