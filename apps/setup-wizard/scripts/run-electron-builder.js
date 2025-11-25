const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = `electron-builder ${args.join(' ')}`;

console.log('🚀 Building installer...');
console.log('Command:', command);

try {
  execSync(command, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

