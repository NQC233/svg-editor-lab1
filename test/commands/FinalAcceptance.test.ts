import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.4, 6.1, 6.3, 6.4, 6.9] combines container creation, transforms, and z-order', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '240']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'under', '0', '0', '100', '60', '#111', 'in', 'scene']);
  dispatcher.dispatch(['create', 'circle', 'over', '20', '20', '10', '#222', 'in', 'scene']);
  dispatcher.dispatch(['create', 'text', 'label', '10', '100', '层叠', 'in', 'scene']);

  assert.deepEqual(dispatcher.dispatch(['front', 'under']), ['rect#under moved to front']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '├── circle#over  cx=20 cy=20 r=10 fill=#222',
    '├── text#label   (10,100) "层叠"',
    '└── rect#under   x=0 y=0 w=100 h=60 fill=#111',
  ]);

  assert.deepEqual(dispatcher.dispatch(['move', 'scene', '5', '-10']), [
    'g#scene moved by (5,-10)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['scale', 'scene', '2']), ['g#scene scaled by 2']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '├── circle#over  cx=50 cy=20 r=20 fill=#222',
    '├── text#label   (30,180) "层叠"',
    '└── rect#under   x=10 y=-20 w=200 h=120 fill=#111',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#scene scale restored']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#scene moved back by (-5,10)']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#under moved back']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '├── rect#under   x=0 y=0 w=100 h=60 fill=#111',
    '├── circle#over  cx=20 cy=20 r=10 fill=#222',
    '└── text#label   (10,100) "层叠"',
  ]);
});

test('[spec 5.4, 6.12-6.13, 7.3-7.4, 8] edits, orders, and round-trips unmodeled attributes', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-final-acceptance-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const input = join(directory, 'input.svg');
  const saved = join(directory, 'saved.svg');
  const reread = join(directory, 'reread.svg');
  await writeFile(
    input,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80">',
      '  <g id="scene" data-scene="north">',
      '    <rect id="under" x="1" y="2" width="10" height="10" fill="#111" data-scale="keep"/>',
      '    <circle id="over" cx="5" cy="5" r="4" fill="#222" data-radius="4"/>',
      '  </g>',
      '</svg>',
    ].join('\n'),
  );
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['read', input]), [`read ${input} (3 elements)`]);
  assert.deepEqual(
    dispatcher.dispatch(['create', 'ellipse', 'fresh', '8', '9', '3', '4', 'cyan', 'in', 'scene']),
    ['ellipse#fresh created in g#scene'],
  );
  assert.deepEqual(dispatcher.dispatch(['front', 'under']), ['rect#under moved to front']);
  assert.deepEqual(dispatcher.dispatch(['move', 'scene', '5', '5']), ['g#scene moved by (5,5)']);
  assert.deepEqual(dispatcher.dispatch(['scale', 'scene', '2']), ['g#scene scaled by 2']);

  const expectedTree = [
    'svg (100x80)',
    '└── g#scene',
    '    ├── circle#over    cx=20 cy=20 r=8 fill=#222',
    '    ├── ellipse#fresh  cx=26 cy=28 rx=6 ry=8 fill=cyan',
    '    └── rect#under     x=12 y=14 w=20 h=20 fill=#111',
  ];
  assert.deepEqual(dispatcher.dispatch(['tree']), expectedTree);
  assert.deepEqual(dispatcher.dispatch(['save', saved]), [`saved to ${saved} (4 elements)`]);
  assert.equal(
    await readFile(saved, 'utf8'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80">',
      '  <g id="scene" data-scene="north">',
      '    <circle id="over" cx="20" cy="20" r="8" fill="#222" data-radius="4"/>',
      '    <ellipse id="fresh" cx="26" cy="28" rx="6" ry="8" fill="cyan"/>',
      '    <rect id="under" x="12" y="14" width="20" height="20" fill="#111" data-scale="keep"/>',
      '  </g>',
      '</svg>',
      '',
    ].join('\n'),
  );

  assert.deepEqual(dispatcher.dispatch(['read', saved]), [`read ${saved} (4 elements)`]);
  assert.deepEqual(dispatcher.dispatch(['tree']), expectedTree);
  assert.deepEqual(dispatcher.dispatch(['save', reread]), [`saved to ${reread} (4 elements)`]);
  assert.equal(await readFile(reread, 'utf8'), await readFile(saved, 'utf8'));
});
