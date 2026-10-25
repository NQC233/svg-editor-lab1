import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { CliApplication } from '../../src/cli/CliApplication.js';
import { CommandCatalog } from '../../src/cli/CommandCatalog.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { ConsoleOutput } from '../../src/cli/ConsoleOutput.js';
import { LineTokenizer } from '../../src/cli/LineTokenizer.js';
import { CanvasCommand } from '../../src/commands/CanvasCommand.js';
import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandInvoker } from '../../src/commands/CommandInvoker.js';
import { CreateCommand } from '../../src/commands/CreateCommand.js';
import { HelpCommand } from '../../src/commands/HelpCommand.js';
import { InitCommand } from '../../src/commands/InitCommand.js';
import { ShowCommand } from '../../src/commands/ShowCommand.js';
import { TreeCommand } from '../../src/commands/TreeCommand.js';
import { ShowFormatter } from '../../src/display/ShowFormatter.js';
import { TreeFormatter } from '../../src/display/TreeFormatter.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';

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

function createDispatcher(): CommandDispatcher {
  const context = new CommandContext({
    shapeFactory: new ShapeFactory(),
    showFormatter: new ShowFormatter(),
    treeFormatter: new TreeFormatter(),
  });
  const catalog = new CommandCatalog([
    ['init', new InitCommand()],
    ['canvas', new CanvasCommand()],
    ['create', new CreateCommand()],
    ['tree', new TreeCommand()],
    ['show', new ShowCommand()],
    ['help', new HelpCommand()],
  ]);
  return new CommandDispatcher(catalog, new CommandInvoker(context));
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
    /\nerror: canvas requires both width and height\nerror: canvas resizing is not available yet\ncanvas 640x480\n/,
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
