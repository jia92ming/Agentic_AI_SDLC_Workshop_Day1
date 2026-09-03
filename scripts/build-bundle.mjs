import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const bundle = join(root, 'bundle');
const shouldPush = process.argv.includes('--push');

function run(command, args, cwd = root) {
  const windowsScript = process.platform === 'win32' && (command === 'npm' || command === 'npx');
  const executable = windowsScript ? process.env.ComSpec : command;
  const commandArgs = windowsScript
    ? ['/d', '/s', '/c', [command, ...args].join(' ')]
    : args;
  const result = spawnSync(executable, commandArgs, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function hasStagedChanges(cwd) {
  return spawnSync('git', ['diff', '--cached', '--quiet'], { cwd }).status !== 0;
}

run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);
run('npm', ['install'], join(root, 'frontend'));
run('npx', ['ng', 'build'], join(root, 'frontend'));

const builtIndex = join(root, 'frontend', 'dist', 'snip-frontend', 'browser', 'index.html');
if (!existsSync(builtIndex)) {
  throw new Error(`Frontend build output is missing: ${builtIndex}`);
}

for (const entry of readdirSync(bundle)) {
  if (entry !== '.git') rmSync(join(bundle, entry), { recursive: true, force: true });
}

mkdirSync(join(bundle, 'public'), { recursive: true });
cpSync(join(root, 'backend', 'server.js'), join(bundle, 'server.js'));
cpSync(join(root, 'cli', 'cli.js'), join(bundle, 'cli.js'));
cpSync(join(root, 'frontend', 'dist', 'snip-frontend', 'browser'), join(bundle, 'public'), { recursive: true });
writeFileSync(join(bundle, '.env'), 'PUBLIC_DIR=./public\n');
writeFileSync(join(bundle, 'package.json'), JSON.stringify({
  name: 'snip-bundle',
  version: '1.0.0',
  scripts: { start: 'bun server.js' }
}, null, 2) + '\n');
writeFileSync(join(bundle, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  ''
].join('\n'));
writeFileSync(join(bundle, '.dockerignore'), 'node_modules\n.git\n');
writeFileSync(join(bundle, 'railway.json'), JSON.stringify({
  build: { builder: 'DOCKERFILE' }
}, null, 2) + '\n');

run('git', ['add', '-A'], bundle);
if (hasStagedChanges(bundle)) {
  run('git', ['commit', '-m', 'Generate bundle release'], bundle);
  if (shouldPush) run('git', ['push', 'origin', 'HEAD:bundle'], bundle);
} else {
  console.log('bundle: unchanged');
}

run('git', ['add', 'bundle']);
if (spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root }).status !== 0) {
  run('git', ['commit', '-m', 'Bump bundle submodule']);
  if (shouldPush) run('git', ['push', 'origin', 'main']);
} else {
  console.log('main: unchanged');
}
