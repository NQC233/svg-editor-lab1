import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

async function fixture(directory: string, name: string, content: string): Promise<string> {
  const path = join(directory, name);
  await writeFile(path, content);
  return path;
}

test('[spec 6.12, 7.2, 7.4] assigns ids in document order after collecting every explicit id', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-assign-ids-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const path = await fixture(
    directory,
    'unnamed.svg',
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">',
      '  <title><path d="M0 0"/></title>',
      '  <g>',
      '    <desc><polygon points="0,0"/></desc>',
      '    <rect id="rect2" x="0" y="0" width="1" height="1"/>',
      '    <rect x="0" y="0" width="1" height="1"/>',
      '    <circle id="" cx="0" cy="0" r="1"/>',
      '    <metadata><g id="hidden"><rect width="not-a-number"/></g></metadata>',
      '  </g>',
      '  <text id="Text1" x="5" y="6">A&amp;B<![CDATA[ <C>]]></text>',
      '  <rect x="7" y="8" width="9" height="10"/>',
      '</svg>',
    ].join('\n'),
  );
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['read', path]), [
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect1 to unnamed <rect>',
    'warning: assigned id circle1 to unnamed <circle>',
    'warning: assigned id rect3 to unnamed <rect>',
    `read ${path} (6 elements)`,
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (200x100)',
    '├── g#g1',
    '│   ├── rect#rect2      x=0 y=0 w=1 h=1',
    '│   ├── rect#rect1      x=0 y=0 w=1 h=1',
    '│   └── circle#circle1  cx=0 cy=0 r=1',
    '├── text#Text1  (5,6) "A&B <C>"',
    '└── rect#rect3  x=7 y=8 w=9 h=10',
  ]);
});

test('[spec 7.4] reserves explicit ids that appear after unnamed shapes', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-reserve-ids-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const path = await fixture(
    directory,
    'reserved.svg',
    [
      '<svg width="100" height="80">',
      '  <rect x="0" y="0" width="1" height="1"/>',
      '  <rect id="rect1" x="1" y="1" width="1" height="1"/>',
      '  <circle cx="2" cy="2" r="1"/>',
      '  <circle id="circle1" cx="3" cy="3" r="1"/>',
      '</svg>',
    ].join('\n'),
  );
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['read', path]), [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id circle2 to unnamed <circle>',
    `read ${path} (4 elements)`,
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (100x80)',
    '├── rect#rect2      x=0 y=0 w=1 h=1',
    '├── rect#rect1      x=1 y=1 w=1 h=1',
    '├── circle#circle2  cx=2 cy=2 r=1',
    '└── circle#circle1  cx=3 cy=3 r=1',
  ]);
});

test('[spec 5.4, 6.12, 6.13, 7.2, 7.3, 8] preserves unmodeled attributes through edits and Read/save/read', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-roundtrip-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const input = await fixture(
    directory,
    'input.svg',
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80">',
      '  <title>ignored</title>',
      '  <g id="scene" data-group="outer" fill="none">',
      '    <rect id="r" x="1" y="2" width="3" height="4" fill="#fff" data-z="1" data-a="A&amp;B" aria-label="盒">',
      '      <title>ignored</title>',
      '    </rect>',
      '    <text id="t" x="5" y="6" data-note="&quot;hi&quot;">A &amp; B<![CDATA[ <C>]]><desc><tspan>ignored</tspan></desc></text>',
      '  </g>',
      '</svg>',
    ].join('\n'),
  );
  const saved = join(directory, 'saved.svg');
  const reread = join(directory, 'reread.svg');
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['read', input]), [`read ${input} (3 elements)`]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (100x80)',
    '└── g#scene',
    '    ├── rect#r  x=1 y=2 w=3 h=4 fill=#fff',
    '    └── text#t  (5,6) "A & B <C>"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'r']), [
    'rect#r  parent=g#scene',
    '  x=1 y=2 width=3 height=4',
    '  fill=#fff',
  ]);
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'data-z', '2']),
    new DomainError('unknown attribute: data-z'),
  );

  dispatcher.dispatch(['scale', 'r', '2']);
  dispatcher.dispatch(['set', 'r', 'fill', 'red']);
  assert.deepEqual(dispatcher.dispatch(['save', saved]), [`saved to ${saved} (3 elements)`]);

  const expected = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80">',
    '  <g id="scene" fill="none" data-group="outer">',
    '    <rect id="r" x="2" y="4" width="6" height="8" fill="red" data-z="1" data-a="A&amp;B" aria-label="盒"/>',
    '    <text id="t" x="5" y="6" data-note="&quot;hi&quot;">A &amp; B &lt;C&gt;</text>',
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
  assert.equal(await readFile(saved, 'utf8'), expected);

  assert.deepEqual(dispatcher.dispatch(['read', saved]), [`read ${saved} (3 elements)`]);
  assert.deepEqual(dispatcher.dispatch(['save', reread]), [`saved to ${reread} (3 elements)`]);
  assert.equal(await readFile(reread, 'utf8'), expected);
});
