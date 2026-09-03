import { spawn } from 'node:child_process';
import path from 'node:path';

const stateDir = process.env.YFL_TEST_STATE_DIR || path.resolve('.playwright-yfl-home/state');
const python = process.env.YFL_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const prefix = (process.env.YFL_PYTHON_ARGS || '').split(' ').filter(Boolean);
const args = [
  ...prefix,
  'runtime/challenge_ui.py', 'serve', '--mode', 'preview', '--port', '43871', '--state-dir', stateDir,
];
const child = spawn(python, args, { stdio: 'inherit', windowsHide: true });

const shutdown = () => {
  if (!child.killed) child.kill();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
child.on('error', (error) => {
  console.error(`Could not start Python judge with ${python}: ${error.message}`);
  console.error('Set YFL_PYTHON and optionally YFL_PYTHON_ARGS (for example: YFL_PYTHON=py, YFL_PYTHON_ARGS=-3).');
  process.exit(2);
});
child.on('exit', (code) => process.exit(code ?? 0));
