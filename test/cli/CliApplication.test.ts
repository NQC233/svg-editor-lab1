import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { CliApplication } from '../../src/cli/CliApplication.js';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

interface RunResult {
  readonly code: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

async function runCli(input: string): Promise<RunResult> {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  child.stdin.end(input);

  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });

  return { code, stderr, stdout };
}

test('runs a scripted empty-canvas session through EOF', async () => {
  const result = await runCli(
    [
      'help',
      'canvas',
      'init',
      'canvas',
      'init "640" "480"',
      'canvas',
      'init 0 200',
      'canvas',
      'init 300',
      'canvas',
      'init 1 2 3',
      'canvas',
      'canvas 100',
      'canvas 100 200',
      'canvas',
      '  # ignored comment',
      'unknown',
      'set "unterminated',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^Document:\n/);
  assert.doesNotMatch(result.stdout, /svg-editor 0\.1/);
  assert.doesNotMatch(result.stdout, /svg> /);
  assert.match(result.stdout, /\ncanvas 800x600 created\ncanvas 800x600\n/);
  assert.match(result.stdout, /\ncanvas 640x480 created\ncanvas 640x480\n/);
  assert.match(result.stdout, /\nerror: init width and height must be positive\ncanvas 640x480\n/);
  assert.match(result.stdout, /\nerror: init requires both width and height\ncanvas 640x480\n/);
  assert.match(result.stdout, /\nerror: usage: init \[w\] \[h\]\ncanvas 640x480\n/);
  assert.match(
    result.stdout,
    /\nerror: canvas requires both width and height\ncanvas resized to 100x200\ncanvas 100x200\n/,
  );
  assert.match(
    result.stdout,
    /\nerror: unknown command: unknown\nerror: unterminated quoted string\n$/,
  );
});

test('interactive mode prints the banner, prompt, results, and errors', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let stdout = '';
  output.setEncoding('utf8');
  output.on('data', (chunk: string) => {
    stdout += chunk;
  });

  const application = new CliApplication({
    input,
    interactive: true,
    output,
  });
  const run = application.run();

  input.write('canvas\n');
  input.write('init 320 240\n');
  input.end();

  await run;

  assert.match(stdout, /^svg-editor 0\.1 — type 'help' for commands\n/);
  assert.match(stdout, /svg> /);
  assert.match(stdout, /error: no document\. use 'init' or 'read' first/);
  assert.match(stdout, /canvas 320x240 created/);
});
