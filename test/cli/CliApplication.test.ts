import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

async function runCli(input: string, cwd = projectRoot): Promise<RunResult> {
  const child = spawn(
    process.execPath,
    [join(projectRoot, 'node_modules/tsx/dist/cli.mjs'), join(projectRoot, 'src/main.ts')],
    {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

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

test('[spec 6.13, 8] replays save success, path reuse, and write failures through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-cli-save-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const file = join(directory, 'cli output.svg');
  const result = await runCli(
    [
      `save "${file}"`,
      'init 320 240',
      'create g scene',
      'create text label 10 20 "你好 & <x>"',
      `save "${file}"`,
      'save',
      'init 100 80',
      'save',
      `save "${directory}"`,
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(result.stdout.split('\n').slice(0, -1), [
    "error: no document. use 'init' or 'read' first",
    'canvas 320x240 created',
    'g#scene created',
    'text#label created',
    `saved to ${file} (2 elements)`,
    `saved to ${file} (2 elements)`,
    'canvas 100x80 created',
    'error: no file path; use save <file.svg>',
    `error: cannot write file: ${directory}`,
  ]);
  assert.match(await readFile(file, 'utf8'), /你好 &amp; &lt;x&gt;/);
});

test('[spec 6.13, ADR-0008] resolves relative paths from the process working directory', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-relative-cwd-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const relativePath = 'relative output.svg';
  const result = await runCli(
    [
      'init 100 80',
      'create rect r 1 2 3 4',
      `save "${relativePath}"`,
      'save',
      'init 200 100',
      'save',
    ].join('\n'),
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(result.stdout.split('\n').slice(0, -1), [
    'canvas 100x80 created',
    'rect#r created',
    `saved to ${relativePath} (1 elements)`,
    `saved to ${relativePath} (1 elements)`,
    'canvas 200x100 created',
    'error: no file path; use save <file.svg>',
  ]);
  assert.match(await readFile(join(directory, relativePath), 'utf8'), /<rect id="r"/);
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

test('[spec 3.3, 6.10, 6.14] replays canvas resize history, failures, and unlocking through the CLI', async () => {
  const result = await runCli(
    [
      'init 800 600',
      'create rect a 0 0 10 10',
      'create rect b 20 20 10 10',
      'undo',
      'canvas',
      'redo',
      'undo',
      'canvas 640 480',
      'undo',
      'redo',
      'create rect c 40 40 10 10',
      'undo',
      'undo',
      'redo',
      'undo',
      'canvas 0 200',
      'canvas',
      'tree',
      'redo',
      'tree',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 800x600 created',
      'rect#a created',
      'rect#b created',
      'rect#b removed',
      'canvas 800x600',
      'rect#b created',
      'rect#b removed',
      'canvas resized to 640x480',
      'error: undo not allowed after io command',
      'error: undo not allowed after io command',
      'rect#c created',
      'rect#c removed',
      'error: nothing to undo',
      'rect#c created',
      'rect#c removed',
      'error: canvas width and height must be positive',
      'canvas 640x480',
      'svg (640x480)',
      '└── rect#a  x=0 y=0 w=10 h=10',
      'rect#c created',
      'svg (640x480)',
      '├── rect#a  x=0 y=0 w=10 h=10',
      '└── rect#c  x=40 y=40 w=10 h=10',
      '',
    ].join('\n'),
  );
});

test('[spec 6.9, 6.10, 9] replays z-order changes, no-ops, undo, and redo through the CLI', async () => {
  const result = await runCli(
    [
      'init 800 600',
      'create rect back 0 0 10 10',
      'create rect middle 20 20 10 10',
      'create rect front 40 40 10 10',
      'front back',
      'tree',
      'back back',
      'tree',
      'front front',
      'back back',
      'undo',
      'undo',
      'redo',
      'front',
      'back missing',
      'tree',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 800x600 created',
      'rect#back created',
      'rect#middle created',
      'rect#front created',
      'rect#back moved to front',
      'svg (800x600)',
      '├── rect#middle  x=20 y=20 w=10 h=10',
      '├── rect#front   x=40 y=40 w=10 h=10',
      '└── rect#back    x=0 y=0 w=10 h=10',
      'rect#back moved to back',
      'svg (800x600)',
      '├── rect#back    x=0 y=0 w=10 h=10',
      '├── rect#middle  x=20 y=20 w=10 h=10',
      '└── rect#front   x=40 y=40 w=10 h=10',
      'rect#front is already at front',
      'rect#back is already at back',
      'rect#back moved back',
      'rect#back moved back',
      'rect#back moved to front',
      'error: usage: front <id>',
      'error: no such shape: missing',
      'svg (800x600)',
      '├── rect#middle  x=20 y=20 w=10 h=10',
      '├── rect#front   x=40 y=40 w=10 h=10',
      '└── rect#back    x=0 y=0 w=10 h=10',
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

test('[spec 5.1-5.3, 6.5, 6.10, 9] replays set updates, no-ops, failures, history, and barriers', async () => {
  const result = await runCli(
    [
      'set r x 1',
      'init 400 200',
      'create rect r 0 0 10 10',
      'create text t 1 2 "old"',
      'set t text "new \\"label\\""',
      'set r fill red',
      'set r x 5',
      'set r stroke-width 2.50',
      'show r',
      'show t',
      'set r x 5.0',
      'set r width 0',
      'set r opacity 1',
      'set r fill ""',
      'set r fill red',
      'undo',
      'show r',
      'undo',
      'undo',
      'show r',
      'redo',
      'canvas 640 480',
      'set r x 0',
      'undo',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      "error: no document. use 'init' or 'read' first",
      'canvas 400x200 created',
      'rect#r created',
      'text#t created',
      'text#t updated: text="new \\"label\\""',
      'rect#r updated: fill=red',
      'rect#r updated: x=5',
      'rect#r updated: stroke-width=2.5',
      'rect#r  parent=svg',
      '  x=5 y=0 width=10 height=10',
      '  fill=red',
      '  stroke-width=2.5',
      'text#t  parent=svg',
      '  x=1 y=2',
      '  text="new \\"label\\""',
      'rect#r unchanged',
      'error: rect width must be positive',
      'error: unknown attribute: opacity',
      'error: fill must not be empty',
      'rect#r unchanged',
      'rect#r updated: stroke-width=(unset)',
      'rect#r  parent=svg',
      '  x=5 y=0 width=10 height=10',
      '  fill=red',
      'rect#r updated: x=0',
      'rect#r updated: fill=(unset)',
      'rect#r  parent=svg',
      '  x=0 y=0 width=10 height=10',
      'rect#r updated: fill=red',
      'canvas resized to 640x480',
      'rect#r unchanged',
      'error: undo not allowed after io command',
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

test('[spec 5.5, 5.6, 6.1, 6.10] replays nested container creation, display, history, and failures', async () => {
  const result = await runCli(
    [
      'init 800 600',
      'create g flowchart',
      'create g node1 in flowchart',
      'create rect r1 10 20 30 40 red in node1',
      'create text label 15 25 "开始" in node1',
      'tree',
      'tree node1',
      'show r1',
      'undo',
      'tree node1',
      'redo',
      'tree node1',
      'create rect missing 0 0 1 1 in absent',
      'create rect wrong 0 0 1 1 in r1',
      'create g node1 in flowchart',
      'create g nested "in" flowchart',
      'create g incomplete in',
      'create rect bare-in 0 0 1 1 in',
      'tree',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 800x600 created',
      'g#flowchart created',
      'g#node1 created in g#flowchart',
      'rect#r1 created in g#node1',
      'text#label created in g#node1',
      'svg (800x600)',
      '└── g#flowchart',
      '    └── g#node1',
      '        ├── rect#r1     x=10 y=20 w=30 h=40 fill=red',
      '        └── text#label  (15,25) "开始"',
      'g#node1',
      '├── rect#r1     x=10 y=20 w=30 h=40 fill=red',
      '└── text#label  (15,25) "开始"',
      'rect#r1  parent=g#node1',
      '  x=10 y=20 width=30 height=40',
      '  fill=red',
      'text#label removed',
      'g#node1',
      '└── rect#r1  x=10 y=20 w=30 h=40 fill=red',
      'text#label created in g#node1',
      'g#node1',
      '├── rect#r1     x=10 y=20 w=30 h=40 fill=red',
      '└── text#label  (15,25) "开始"',
      'error: no such container: absent',
      'error: not a container: r1',
      'error: id already exists: node1',
      'error: usage: create g <id>',
      'error: usage: create <type> <id> [params...] [in <containerId>]',
      'error: usage: create <type> <id> [params...] [in <containerId>]',
      'svg (800x600)',
      '└── g#flowchart',
      '    └── g#node1',
      '        ├── rect#r1     x=10 y=20 w=30 h=40 fill=red',
      '        └── text#label  (15,25) "开始"',
      '',
    ].join('\n'),
  );
});

test('[spec 5.4, 6.3, 6.10, 9] replays leaf and nested-container movement through the CLI', async () => {
  const result = await runCli(
    [
      'init 400 200',
      'create g scene',
      'create g node in scene',
      'create rect box 10 20 30 40 red in node',
      'create text label 15 25 "开始" in node',
      'move node 5 -2.5',
      'tree scene',
      'undo',
      'tree node',
      'redo',
      'move box 0 0',
      'move missing 1 1',
      'move box nope 1',
      'move box 1',
      'move box 1 2 3',
      'undo',
      'redo',
      'tree scene',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 400x200 created',
      'g#scene created',
      'g#node created in g#scene',
      'rect#box created in g#node',
      'text#label created in g#node',
      'g#node moved by (5,-2.5)',
      'g#scene',
      '└── g#node',
      '    ├── rect#box    x=15 y=17.5 w=30 h=40 fill=red',
      '    └── text#label  (20,22.5) "开始"',
      'g#node moved back by (-5,2.5)',
      'g#node',
      '├── rect#box    x=10 y=20 w=30 h=40 fill=red',
      '└── text#label  (15,25) "开始"',
      'g#node moved by (5,-2.5)',
      'rect#box unchanged',
      'error: no such shape: missing',
      'error: invalid number: nope',
      'error: usage: move <id> <dx> <dy>',
      'error: usage: move <id> <dx> <dy>',
      'g#node moved back by (-5,2.5)',
      'g#node moved by (5,-2.5)',
      'g#scene',
      '└── g#node',
      '    ├── rect#box    x=15 y=17.5 w=30 h=40 fill=red',
      '    └── text#label  (20,22.5) "开始"',
      '',
    ].join('\n'),
  );
});

test('[spec 5.4, 6.4, 6.10, 9] replays scaling, failures, and history through the CLI', async () => {
  const result = await runCli(
    [
      'init 400 200',
      'create g scene',
      'create rect box 10 20 30 40 red in scene',
      'create text label 15 25 "开始" in scene',
      'scale scene 2',
      'tree scene',
      'undo',
      'tree scene',
      'redo',
      'scale box 1',
      'scale missing 2',
      'scale box nope',
      'scale box 0',
      'scale box -0.5',
      'scale box 2 3',
      'undo',
      'redo',
      'tree scene',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 400x200 created',
      'g#scene created',
      'rect#box created in g#scene',
      'text#label created in g#scene',
      'g#scene scaled by 2',
      'g#scene',
      '├── rect#box    x=20 y=40 w=60 h=80 fill=red',
      '└── text#label  (30,50) "开始"',
      'g#scene scale restored',
      'g#scene',
      '├── rect#box    x=10 y=20 w=30 h=40 fill=red',
      '└── text#label  (15,25) "开始"',
      'g#scene scaled by 2',
      'rect#box unchanged',
      'error: no such shape: missing',
      'error: invalid number: nope',
      'error: scale factor must be positive',
      'error: scale factor must be positive',
      'error: usage: scale <id> <factor>',
      'g#scene scale restored',
      'g#scene scaled by 2',
      'g#scene',
      '├── rect#box    x=20 y=40 w=60 h=80 fill=red',
      '└── text#label  (30,50) "开始"',
      '',
    ].join('\n'),
  );
});

test('[spec 3.3, 5.2, 6.2, 9] replays subtree deletion, restore, and failures through the CLI', async () => {
  const result = await runCli(
    [
      'init 400 200',
      'create g scene',
      'create rect box 10 20 30 40 red in scene',
      'create g branch in scene',
      'create text label 15 25 "开始" in branch',
      'create rect after 200 100 20 20',
      'delete label',
      'undo',
      'delete branch',
      'delete missing',
      'delete',
      'delete box extra',
      'tree',
      'undo',
      'show label',
      'redo',
      'tree',
      'undo',
      'delete scene',
      'tree',
      'undo',
      'tree',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 400x200 created',
      'g#scene created',
      'rect#box created in g#scene',
      'g#branch created in g#scene',
      'text#label created in g#branch',
      'rect#after created',
      'text#label deleted',
      'text#label restored into g#branch',
      'g#branch deleted',
      'error: no such shape: missing',
      'error: usage: delete <id>',
      'error: usage: delete <id>',
      'svg (400x200)',
      '├── g#scene',
      '│   └── rect#box  x=10 y=20 w=30 h=40 fill=red',
      '└── rect#after  x=200 y=100 w=20 h=20',
      'g#branch restored into g#scene',
      'text#label  parent=g#branch',
      '  x=15 y=25',
      '  text="开始"',
      'g#branch deleted',
      'svg (400x200)',
      '├── g#scene',
      '│   └── rect#box  x=10 y=20 w=30 h=40 fill=red',
      '└── rect#after  x=200 y=100 w=20 h=20',
      'g#branch restored into g#scene',
      'g#scene deleted',
      'svg (400x200)',
      '└── rect#after  x=200 y=100 w=20 h=20',
      'g#scene restored into svg',
      'svg (400x200)',
      '├── g#scene',
      '│   ├── rect#box  x=10 y=20 w=30 h=40 fill=red',
      '│   └── g#branch',
      '│       └── text#label  (15,25) "开始"',
      '└── rect#after  x=200 y=100 w=20 h=20',
      '',
    ].join('\n'),
  );
});

test('[spec 3.3, 5.2, 6.7, 6.10, 9] replays container ungrouping, restore, and failures through the CLI', async () => {
  const result = await runCli(
    [
      'init 800 600',
      'create g outer',
      'create rect b 0 0 10 10 in outer',
      'create g n in outer',
      'create rect a 20 20 10 10 in n',
      'create g m in n',
      'create rect x 40 40 10 10 in m',
      'create rect z 60 60 10 10 in n',
      'create rect c 80 80 10 10 in outer',
      'ungroup n',
      'tree outer',
      'show x',
      'undo',
      'tree outer',
      'ungroup outer',
      'ungroup b',
      'ungroup missing',
      'ungroup',
      'ungroup n extra',
      'redo',
      'tree outer',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 800x600 created',
      'g#outer created',
      'rect#b created in g#outer',
      'g#n created in g#outer',
      'rect#a created in g#n',
      'g#m created in g#n',
      'rect#x created in g#m',
      'rect#z created in g#n',
      'rect#c created in g#outer',
      'g#n ungrouped: 3 children',
      'g#outer',
      '├── rect#b  x=0 y=0 w=10 h=10',
      '├── rect#a  x=20 y=20 w=10 h=10',
      '├── g#m',
      '│   └── rect#x  x=40 y=40 w=10 h=10',
      '├── rect#z  x=60 y=60 w=10 h=10',
      '└── rect#c  x=80 y=80 w=10 h=10',
      'rect#x  parent=g#m',
      '  x=40 y=40 width=10 height=10',
      'g#n restored with 3 children',
      'g#outer',
      '├── rect#b  x=0 y=0 w=10 h=10',
      '├── g#n',
      '│   ├── rect#a  x=20 y=20 w=10 h=10',
      '│   ├── g#m',
      '│   │   └── rect#x  x=40 y=40 w=10 h=10',
      '│   └── rect#z  x=60 y=60 w=10 h=10',
      '└── rect#c  x=80 y=80 w=10 h=10',
      'error: cannot ungroup top-level container: outer',
      'error: not a container: b',
      'error: no such shape: missing',
      'error: usage: ungroup <gid>',
      'error: usage: ungroup <gid>',
      'g#n ungrouped: 3 children',
      'g#outer',
      '├── rect#b  x=0 y=0 w=10 h=10',
      '├── rect#a  x=20 y=20 w=10 h=10',
      '├── g#m',
      '│   └── rect#x  x=40 y=40 w=10 h=10',
      '├── rect#z  x=60 y=60 w=10 h=10',
      '└── rect#c  x=80 y=80 w=10 h=10',
      '',
    ].join('\n'),
  );
});

test('[spec 3.3, 5.2, 6.8, 6.10, 9] replays addto ownership moves, no-ops, and failures through the CLI', async () => {
  const result = await runCli(
    [
      'addto target moving',
      'init 800 600',
      'create g source',
      'create rect a 0 0 10 10 in source',
      'create g branch in source',
      'create text label 5 6 "开始" in branch',
      'create rect tail 20 20 10 10 in source',
      'create g target',
      'create rect existing 40 40 10 10 in target',
      'addto branch source',
      'addto target target',
      'tree',
      'addto target branch',
      'tree',
      'undo',
      'tree source',
      'redo',
      'addto source a',
      'tree source',
      'undo',
      'addto target tail',
      'tree target',
      'addto target tail',
      'addto a target',
      'addto missing a',
      'addto target missing',
      'addto target',
      'tree target',
      'undo',
      'tree source',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      "error: no document. use 'init' or 'read' first",
      'canvas 800x600 created',
      'g#source created',
      'rect#a created in g#source',
      'g#branch created in g#source',
      'text#label created in g#branch',
      'rect#tail created in g#source',
      'g#target created',
      'rect#existing created in g#target',
      'error: cannot move a container into its own descendant: source',
      'error: cannot move a container into its own descendant: target',
      'svg (800x600)',
      '├── g#source',
      '│   ├── rect#a     x=0 y=0 w=10 h=10',
      '│   ├── g#branch',
      '│   │   └── text#label  (5,6) "开始"',
      '│   └── rect#tail  x=20 y=20 w=10 h=10',
      '└── g#target',
      '    └── rect#existing  x=40 y=40 w=10 h=10',
      'g#branch added to g#target',
      'svg (800x600)',
      '├── g#source',
      '│   ├── rect#a     x=0 y=0 w=10 h=10',
      '│   └── rect#tail  x=20 y=20 w=10 h=10',
      '└── g#target',
      '    ├── rect#existing  x=40 y=40 w=10 h=10',
      '    └── g#branch',
      '        └── text#label  (5,6) "开始"',
      'g#branch moved back to g#source',
      'g#source',
      '├── rect#a     x=0 y=0 w=10 h=10',
      '├── g#branch',
      '│   └── text#label  (5,6) "开始"',
      '└── rect#tail  x=20 y=20 w=10 h=10',
      'g#branch added to g#target',
      'rect#a added to g#source',
      'g#source',
      '├── rect#tail  x=20 y=20 w=10 h=10',
      '└── rect#a     x=0 y=0 w=10 h=10',
      'rect#a moved back to g#source',
      'rect#tail added to g#target',
      'g#target',
      '├── rect#existing  x=40 y=40 w=10 h=10',
      '├── g#branch',
      '│   └── text#label  (5,6) "开始"',
      '└── rect#tail      x=20 y=20 w=10 h=10',
      'rect#tail unchanged',
      'error: not a container: a',
      'error: no such container: missing',
      'error: no such shape: missing',
      'error: usage: addto <gid> <id>',
      'g#target',
      '├── rect#existing  x=40 y=40 w=10 h=10',
      '├── g#branch',
      '│   └── text#label  (5,6) "开始"',
      '└── rect#tail      x=20 y=20 w=10 h=10',
      'rect#tail moved back to g#source',
      'g#source',
      '├── rect#a     x=0 y=0 w=10 h=10',
      '└── rect#tail  x=20 y=20 w=10 h=10',
      '',
    ].join('\n'),
  );
});

test('[spec 3.3, 5.2, 6.6, 6.10, 9] replays group ordering, restore, redo, and failures through the CLI', async () => {
  const result = await runCli(
    [
      'group merged a',
      'init 800 600',
      'create g left',
      'create rect a 0 0 10 10 in left',
      'create rect b 20 20 10 10 in left',
      'create rect c 40 40 10 10 in left',
      'create g right',
      'create rect d 60 60 10 10 in right',
      'create rect e 80 80 10 10 in right',
      'group merged b d a',
      'tree',
      'undo',
      'tree',
      'redo',
      'group solo e',
      'tree right',
      'undo',
      'group bad b b',
      'group bad missing',
      'group left a',
      'group bad left merged',
      'group',
      'group bad',
      'redo',
      'tree right',
    ].join('\n'),
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      "error: no document. use 'init' or 'read' first",
      'canvas 800x600 created',
      'g#left created',
      'rect#a created in g#left',
      'rect#b created in g#left',
      'rect#c created in g#left',
      'g#right created',
      'rect#d created in g#right',
      'rect#e created in g#right',
      'g#merged created with 3 children',
      'svg (800x600)',
      '├── g#left',
      '│   ├── g#merged',
      '│   │   ├── rect#a  x=0 y=0 w=10 h=10',
      '│   │   ├── rect#b  x=20 y=20 w=10 h=10',
      '│   │   └── rect#d  x=60 y=60 w=10 h=10',
      '│   └── rect#c    x=40 y=40 w=10 h=10',
      '└── g#right',
      '    └── rect#e  x=80 y=80 w=10 h=10',
      'g#merged removed; 3 children restored',
      'svg (800x600)',
      '├── g#left',
      '│   ├── rect#a  x=0 y=0 w=10 h=10',
      '│   ├── rect#b  x=20 y=20 w=10 h=10',
      '│   └── rect#c  x=40 y=40 w=10 h=10',
      '└── g#right',
      '    ├── rect#d  x=60 y=60 w=10 h=10',
      '    └── rect#e  x=80 y=80 w=10 h=10',
      'g#merged created with 3 children',
      'g#solo created with 1 children',
      'g#right',
      '└── g#solo',
      '    └── rect#e  x=80 y=80 w=10 h=10',
      'g#solo removed; 1 children restored',
      'error: duplicate target: b',
      'error: no such shape: missing',
      'error: id already exists: left',
      'error: cannot group a container into its own descendant: left',
      'error: usage: group <newGid> <id1> <id2>...',
      'error: usage: group <newGid> <id1> <id2>...',
      'g#solo created with 1 children',
      'g#right',
      '└── g#solo',
      '    └── rect#e  x=80 y=80 w=10 h=10',
      '',
    ].join('\n'),
  );
});

test('[spec 6.12, 7, 9] replays read success, relative paths, failures, and preserved redo through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-cli-read-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const validPath = 'valid input.svg';
  const invalidPath = 'invalid.svg';
  await writeFile(
    join(directory, validPath),
    '<svg width="100" height="80"><rect id="box" x="1" y="2" width="3" height="4" fill="#fff"/></svg>',
  );
  await writeFile(
    join(directory, invalidPath),
    '<svg width="100" height="80"><rect id="bad" x="0" y="0" width="0" height="1"/></svg>',
  );

  const result = await runCli(
    [
      `read "${validPath}"`,
      'tree',
      'show box',
      'create rect after 5 6 7 8',
      'undo',
      'undo',
      `read "${invalidPath}"`,
      'tree',
      'redo',
      'undo',
      'read "missing.svg"',
      'redo',
      'tree',
    ].join('\n'),
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      `read ${validPath} (1 elements)`,
      'svg (100x80)',
      '└── rect#box  x=1 y=2 w=3 h=4 fill=#fff',
      'rect#box  parent=svg',
      '  x=1 y=2 width=3 height=4',
      '  fill=#fff',
      'rect#after created',
      'rect#after removed',
      'error: nothing to undo',
      'error: rect width must be positive',
      'svg (100x80)',
      '└── rect#box  x=1 y=2 w=3 h=4 fill=#fff',
      'rect#after created',
      'rect#after removed',
      'error: cannot read file: missing.svg',
      'rect#after created',
      'svg (100x80)',
      '├── rect#box    x=1 y=2 w=3 h=4 fill=#fff',
      '└── rect#after  x=5 y=6 w=7 h=8',
      '',
    ].join('\n'),
  );
});

test('[spec 6.12, 6.13, 7.3, 7.4, 8] replays assigned-id warnings, attribute roundtrip, and warning-free failures through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-cli-roundtrip-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const unnamed = 'unnamed input.svg';
  const invalid = 'invalid.svg';
  const saved = 'roundtrip.svg';
  await writeFile(
    join(directory, unnamed),
    '<svg width="100" height="80"><title>ignored</title><rect x="1" y="2" width="3" height="4" data-extra="keep"/></svg>',
  );
  await writeFile(
    join(directory, invalid),
    '<svg width="100" height="80"><g><rect width="0" height="1"/></g></svg>',
  );

  const result = await runCli(
    [
      `read "${unnamed}"`,
      'tree',
      `save "${saved}"`,
      'create rect temp 10 10 5 5',
      'undo',
      `read "${invalid}"`,
      'tree',
      'redo',
      'save',
    ].join('\n'),
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'warning: assigned id rect1 to unnamed <rect>',
      `read ${unnamed} (1 elements)`,
      'svg (100x80)',
      '└── rect#rect1  x=1 y=2 w=3 h=4',
      `saved to ${saved} (1 elements)`,
      'rect#temp created',
      'rect#temp removed',
      'error: rect width must be positive',
      'svg (100x80)',
      '└── rect#rect1  x=1 y=2 w=3 h=4',
      'rect#temp created',
      `saved to ${saved} (2 elements)`,
      '',
    ].join('\n'),
  );
  assert.equal(
    await readFile(join(directory, saved), 'utf8'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80">',
      '  <rect id="rect1" x="1" y="2" width="3" height="4" data-extra="keep"/>',
      '  <rect id="temp" x="10" y="10" width="5" height="5"/>',
      '</svg>',
      '',
    ].join('\n'),
  );
});

test('[spec 11.1] replays the complete basic acceptance session through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-cli-basic-acceptance-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const result = await runCli(
    [
      'help',
      'init 800 600',
      'create rect bg 0 0 800 600 #ffffff',
      'create text title 20 40 "My Diagram"',
      'create circle c1 100 100 20 red',
      'create rect box 200 80 60 60 #3366ff',
      'group markers c1 box',
      'move c1 30 0',
      'undo',
      'redo',
      'set title text "My Diagram v2"',
      'undo',
      'delete box',
      'undo',
      'save demo.svg',
      'undo',
    ].join('\n'),
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'Document:',
      '  init [w] [h]',
      '  read <file.svg>',
      '  save [file.svg]',
      '  canvas [w] [h]',
      'Edit:',
      '  create <type> <id> [params...] [in <containerId>]',
      '  delete <id>',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>',
      '  set <id> <attr> <value>',
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id>',
      '  back <id>',
      'Display:',
      '  tree [id]',
      '  show <id>',
      '  help',
      'History:',
      '  undo',
      '  redo',
      'Phase 1 implementation: available commands are help, init, read, canvas, create rect, circle, ellipse, line, text, g, delete, group, ungroup, addto, front, back, move, scale, set, save, tree, show, undo, and redo.',
      'canvas 800x600 created',
      'rect#bg created',
      'text#title created',
      'circle#c1 created',
      'rect#box created',
      'g#markers created with 2 children',
      'circle#c1 moved to (130,100)',
      'circle#c1 moved back to (100,100)',
      'circle#c1 moved to (130,100)',
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
      'rect#box deleted',
      'rect#box restored into g#markers',
      'saved to demo.svg (5 elements)',
      'error: undo not allowed after io command',
      '',
    ].join('\n'),
  );
  assert.match(await readFile(join(directory, 'demo.svg'), 'utf8'), /<text id="title"/);
});

test('[spec 6.1, 11.2] replays the two-node flowchart session through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-cli-flowchart-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const result = await runCli(
    [
      'init 800 600',
      'create g flowchart',
      'create g node1 in flowchart',
      'create rect start 120 100 160 60 #4a90d9 in node1',
      'create text start-label 155 135 "开始" in node1',
      'create g node2 in flowchart',
      'create rect process 520 100 160 60 #f5a623 in node2',
      'create text process-label 545 135 "处理数据" in node2',
      'create line arrow1 280 130 520 130 black in flowchart',
      'tree',
      'move node2 0 100',
      'undo',
      'set process-label text "处理数据 v2"',
      'save flowchart.svg',
    ].join('\n'),
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 800x600 created',
      'g#flowchart created',
      'g#node1 created in g#flowchart',
      'rect#start created in g#node1',
      'text#start-label created in g#node1',
      'g#node2 created in g#flowchart',
      'rect#process created in g#node2',
      'text#process-label created in g#node2',
      'line#arrow1 created in g#flowchart',
      'svg (800x600)',
      '└── g#flowchart',
      '    ├── g#node1',
      '    │   ├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9',
      '    │   └── text#start-label  (155,135) "开始"',
      '    ├── g#node2',
      '    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623',
      '    │   └── text#process-label  (545,135) "处理数据"',
      '    └── line#arrow1  (280,130) -> (520,130)',
      'g#node2 moved by (0,100)',
      'g#node2 moved back by (0,-100)',
      'text#process-label updated: text="处理数据 v2"',
      'saved to flowchart.svg (8 elements)',
      '',
    ].join('\n'),
  );
  assert.match(await readFile(join(directory, 'flowchart.svg'), 'utf8'), /开始/);
});

test('[spec 11.3, 11.5] replays failure atomicity and the IO barrier through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-cli-failure-barrier-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const result = await runCli(
    [
      'init 800 600',
      'create g g1',
      'create rect r1 0 0 10 10 red in g1',
      'group g2 r1 r9',
      'tree',
      'save a.svg',
      'undo',
      'create rect r2 10 10 10 10 blue',
      'undo',
      'undo',
    ].join('\n'),
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    [
      'canvas 800x600 created',
      'g#g1 created',
      'rect#r1 created in g#g1',
      'error: no such shape: r9',
      'svg (800x600)',
      '└── g#g1',
      '    └── rect#r1  x=0 y=0 w=10 h=10 fill=red',
      'saved to a.svg (2 elements)',
      'error: undo not allowed after io command',
      'rect#r2 created',
      'rect#r2 removed',
      'error: nothing to undo',
      '',
    ].join('\n'),
  );
});
