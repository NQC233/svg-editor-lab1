import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { CliApplication } from '../../src/cli/CliApplication.js';
import { ConsoleOutput } from '../../src/cli/ConsoleOutput.js';
import { LineTokenizer } from '../../src/cli/LineTokenizer.js';
import { createDispatcher } from '../support/createDispatcher.js';

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

test('[spec 4.1-4.3, 6.11, 6.14, 6.17] runs a scripted empty-canvas session through EOF', async () => {
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

test('[spec 4.1, 4.3] interactive mode prints the banner, prompt, results, and errors', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let stdout = '';
  output.setEncoding('utf8');
  output.on('data', (chunk: string) => {
    stdout += chunk;
  });

  const application = new CliApplication({
    dispatcher: createDispatcher(),
    input,
    interactive: true,
    output: new ConsoleOutput(output),
    tokenizer: new LineTokenizer(),
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

test('[spec 4.1, 4.2] blank and comment-only scripts produce no output', async () => {
  const result = await runCli(['', '  # ignored', '\t# also ignored'].join('\n'));

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '');
});

test('[spec 4.2, 5.5, 5.6, 6.1] replays rectangle creation, display, and failures without comments swallowing colors', async () => {
  const result = await runCli(
    [
      'create rect r1 0 0 10 10',
      'tree',
      'show r1',
      'init 320 240',
      'create rect r1 10 20 40 30 #4a90d9',
      'show r1',
      'tree',
      'create rect r1 0 0 1 1',
      'create rect bad-number nope 0 10 10',
      'create rect zero 0 0 0 10',
      'create rect "bad id" 1 2 3 4',
      'create rect empty-fill 0 0 10 10 ""',
      'create hexagon h1 0 0 10 10',
      'show missing',
      'tree',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
      'canvas 320x240 created',
      'rect#r1 created',
      'rect#r1  parent=svg',
      '  x=10 y=20 width=40 height=30',
      '  fill=#4a90d9',
      'svg (320x240)',
      '└── rect#r1  x=10 y=20 w=40 h=30 fill=#4a90d9',
      'error: id already exists: r1',
      'error: invalid number: nope',
      'error: rect width must be positive',
      'error: invalid id: bad id',
      'error: fill must not be empty',
      'error: unknown shape type: hexagon (is the plugin loaded?)',
      'error: no such shape: missing',
      'svg (320x240)',
      '└── rect#r1  x=10 y=20 w=40 h=30 fill=#4a90d9',
      '',
    ].join('\n'),
  );
});

test('[spec 6.10, 6.11, 9] replays create, undo, redo, failures, and the init barrier', async () => {
  const result = await runCli(
    [
      'undo',
      'init 800 600',
      'undo',
      'create rect a 0 0 10 10 red',
      'create rect b 10 10 20 20 #4a90d9',
      'undo',
      'tree',
      'show b',
      'redo',
      'show b',
      'undo',
      'undo',
      'undo',
      'create rect c 5 5 5 5',
      'redo',
      'init 320 240',
      'undo',
      'create rect d 0 0 1 1',
      'undo',
      'undo',
      'redo',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      "error: no document. use 'init' or 'read' first",
      'canvas 800x600 created',
      'error: undo not allowed after io command',
      'rect#a created',
      'rect#b created',
      'rect#b removed',
      'svg (800x600)',
      '└── rect#a  x=0 y=0 w=10 h=10 fill=red',
      'error: no such shape: b',
      'rect#b created',
      'rect#b  parent=svg',
      '  x=10 y=10 width=20 height=20',
      '  fill=#4a90d9',
      'rect#b removed',
      'rect#a removed',
      'error: nothing to undo',
      'rect#c created',
      'error: nothing to redo',
      'canvas 320x240 created',
      'error: undo not allowed after io command',
      'rect#d created',
      'rect#d removed',
      'error: nothing to undo',
      'rect#d created',
      '',
    ].join('\n'),
  );
});

test('[spec 3.3, 5.1, 5.2, 5.5, 5.6, 6.1, 6.10] replays geometry shape creation, display, history, and failures', async () => {
  const result = await runCli(
    [
      'init 320 240',
      'create circle c1 -5.5 10 2 #f00',
      'create ellipse e1 20 30 4.5 6',
      'create line edge 0 0 100 50 #333',
      'tree',
      'show c1',
      'undo',
      'show edge',
      'redo',
      'show edge',
      'create ellipse zero 0 0 0 10',
      'create line invalid 0 0 nope 10',
      'undo',
      'tree',
      'redo',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 320x240 created',
      'circle#c1 created',
      'ellipse#e1 created',
      'line#edge created',
      'svg (320x240)',
      '├── circle#c1   cx=-5.5 cy=10 r=2 fill=#f00',
      '├── ellipse#e1  cx=20 cy=30 rx=4.5 ry=6',
      '└── line#edge   (0,0) -> (100,50)',
      'circle#c1  parent=svg',
      '  cx=-5.5 cy=10 r=2',
      '  fill=#f00',
      'line#edge removed',
      'error: no such shape: edge',
      'line#edge created',
      'line#edge  parent=svg',
      '  x1=0 y1=0 x2=100 y2=50',
      '  stroke=#333',
      'error: ellipse rx must be positive',
      'error: invalid number: nope',
      'line#edge removed',
      'svg (320x240)',
      '├── circle#c1   cx=-5.5 cy=10 r=2 fill=#f00',
      '└── ellipse#e1  cx=20 cy=30 rx=4.5 ry=6',
      'line#edge created',
      '',
    ].join('\n'),
  );
});

test('[spec 4.2, 5.2, 5.5, 5.6, 6.1, 6.10] replays quoted text creation, display, history, and failures', async () => {
  const result = await runCli(
    [
      'create text missing-doc 0 0 "content"',
      'init 400 200',
      'create text title 20 40 "My Diagram"',
      'create text title2 30 50 "开始"',
      'create text empty 0 0 ""',
      'create text quoted 5 6 "say \\"hi\\" \\\\path"',
      'create text keyword 7 8 "in"',
      'tree',
      'show quoted',
      'show empty',
      'show keyword',
      'create text bad nope 0 content',
      'create text few 1 2',
      'create text keyword 0 0 duplicate',
      'undo',
      'tree',
      'redo',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      "error: no document. use 'init' or 'read' first",
      'canvas 400x200 created',
      'text#title created',
      'text#title2 created',
      'text#empty created',
      'text#quoted created',
      'text#keyword created',
      'svg (400x200)',
      '├── text#title    (20,40) "My Diagram"',
      '├── text#title2   (30,50) "开始"',
      '├── text#empty    (0,0) ""',
      '├── text#quoted   (5,6) "say \\"hi\\" \\\\path"',
      '└── text#keyword  (7,8) "in"',
      'text#quoted  parent=svg',
      '  x=5 y=6',
      '  text="say \\"hi\\" \\\\path"',
      'text#empty  parent=svg',
      '  x=0 y=0',
      '  text=""',
      'text#keyword  parent=svg',
      '  x=7 y=8',
      '  text="in"',
      'error: invalid number: nope',
      'error: usage: create text <id> <x> <y> <content>',
      'error: id already exists: keyword',
      'text#keyword removed',
      'svg (400x200)',
      '├── text#title   (20,40) "My Diagram"',
      '├── text#title2  (30,50) "开始"',
      '├── text#empty   (0,0) ""',
      '└── text#quoted  (5,6) "say \\"hi\\" \\\\path"',
      'text#keyword created',
      '',
    ].join('\n'),
  );
});
