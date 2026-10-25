import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.1, 5.3, 6.5] sets common styles on every shape and only on the selected container', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'child', '0', '0', '10', '10', 'in', 'scene']);
  dispatcher.dispatch(['create', 'circle', 'c', '20', '20', '5']);
  dispatcher.dispatch(['create', 'ellipse', 'e', '30', '30', '8', '4']);
  dispatcher.dispatch(['create', 'line', 'l', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'text', 't', '5', '6', 'hello']);

  assert.deepEqual(dispatcher.dispatch(['set', 'scene', 'fill', '#123456']), [
    'g#scene updated: fill=#123456',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'scene']), [
    'g#scene  parent=svg',
    '  fill=#123456',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'child']), [
    'rect#child  parent=g#scene',
    '  x=0 y=0 width=10 height=10',
  ]);

  dispatcher.dispatch(['set', 'child', 'fill', '#654321']);
  dispatcher.dispatch(['set', 'child', 'stroke', 'blue']);
  dispatcher.dispatch(['set', 'child', 'stroke-width', '2']);
  for (const id of ['c', 'e', 'l', 't']) {
    assert.deepEqual(dispatcher.dispatch(['set', id, 'fill', '#123456']), [
      `${id === 'c' ? 'circle' : id === 'e' ? 'ellipse' : id === 'l' ? 'line' : 'text'}#${id} updated: fill=#123456`,
    ]);
  }

  assert.deepEqual(dispatcher.dispatch(['show', 'child']), [
    'rect#child  parent=g#scene',
    '  x=0 y=0 width=10 height=10',
    '  fill=#654321',
    '  stroke=blue',
    '  stroke-width=2',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '└── rect#child  x=0 y=0 w=10 h=10 fill=#654321',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 't']), [
    'text#t  parent=svg',
    '  x=5 y=6',
    '  text="hello"',
    '  fill=#123456',
  ]);
});

test('[spec 5.2, 5.3, 6.5] updates every geometry attribute and text content through shape polymorphism', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'r', '0', '0', '10', '20']);
  dispatcher.dispatch(['create', 'circle', 'c', '1', '2', '3']);
  dispatcher.dispatch(['create', 'ellipse', 'e', '4', '5', '6', '7']);
  dispatcher.dispatch(['create', 'line', 'l', '8', '9', '10', '11']);
  dispatcher.dispatch(['create', 'text', 't', '12', '13', 'old']);

  const updates: readonly (readonly [string, string, string])[] = [
    ['r', 'x', '-1.5'],
    ['r', 'y', '2.25'],
    ['r', 'width', '30'],
    ['r', 'height', '40'],
    ['c', 'cx', '14'],
    ['c', 'cy', '15'],
    ['c', 'r', '16'],
    ['e', 'cx', '17'],
    ['e', 'cy', '18'],
    ['e', 'rx', '19'],
    ['e', 'ry', '20'],
    ['l', 'x1', '21'],
    ['l', 'y1', '22'],
    ['l', 'x2', '23'],
    ['l', 'y2', '24'],
    ['t', 'x', '25'],
    ['t', 'y', '26'],
    ['t', 'text', 'new "label"'],
  ];

  for (const [id, attribute, value] of updates) {
    dispatcher.dispatch(['set', id, attribute, value]);
  }

  assert.deepEqual(dispatcher.dispatch(['show', 'r']), [
    'rect#r  parent=svg',
    '  x=-1.5 y=2.25 width=30 height=40',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'c']), [
    'circle#c  parent=svg',
    '  cx=14 cy=15 r=16',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'e']), [
    'ellipse#e  parent=svg',
    '  cx=17 cy=18 rx=19 ry=20',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'l']), [
    'line#l  parent=svg',
    '  x1=21 y1=22 x2=23 y2=24',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 't']), [
    'text#t  parent=svg',
    '  x=25 y=26',
    '  text="new \\"label\\""',
  ]);
});

test('[spec 5.1, 5.3, 6.5, 6.10, 9] restores unset styles and exact previous values through undo and redo', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'r', '0', '0', '10', '10']);

  assert.deepEqual(dispatcher.dispatch(['set', 'r', 'fill', 'red']), ['rect#r updated: fill=red']);
  assert.deepEqual(dispatcher.dispatch(['set', 'r', 'stroke-width', '2.50']), [
    'rect#r updated: stroke-width=2.5',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'r']), [
    'rect#r  parent=svg',
    '  x=0 y=0 width=10 height=10',
    '  fill=red',
    '  stroke-width=2.5',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#r updated: stroke-width=(unset)']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#r updated: fill=(unset)']);
  assert.deepEqual(dispatcher.dispatch(['show', 'r']), [
    'rect#r  parent=svg',
    '  x=0 y=0 width=10 height=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#r updated: fill=red']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#r updated: stroke-width=2.5']);
});

test('[spec 2, 6.5, 9] treats identical values as history-neutral no-ops', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '10', '20', '30', '40', 'red']);
  dispatcher.dispatch(['create', 'rect', 'b', '50', '60', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['set', 'a', 'x', '10.0']), ['rect#a unchanged']);
  assert.deepEqual(dispatcher.dispatch(['set', 'a', 'fill', 'red']), ['rect#a unchanged']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);

  dispatcher.dispatch(['canvas', '640', '480']);
  assert.deepEqual(dispatcher.dispatch(['set', 'a', 'x', '10']), ['rect#a unchanged']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
});

test('[spec 3.3, 5.1, 5.2, 5.3, 6.5, 9] rejects invalid sets without changing the shape or history', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'r', '10', '20', '30', '40', 'red', 'in', 'scene']);
  dispatcher.dispatch(['create', 'text', 't', '1', '2', 'old']);
  dispatcher.dispatch(['create', 'circle', 'c', '1', '2', '3']);
  dispatcher.dispatch(['create', 'ellipse', 'e', '4', '5', '6', '7']);
  dispatcher.dispatch(['create', 'line', 'l', '8', '9', '10', '11']);
  dispatcher.dispatch(['create', 'rect', 'pending', '50', '60', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#pending removed']);

  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'opacity', '1']),
    new DomainError('unknown attribute: opacity'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'scene', 'x', '1']),
    new DomainError('unknown attribute: x'),
  );
  for (const [id, attribute] of [
    ['r', 'cx'],
    ['c', 'x'],
    ['e', 'r'],
    ['l', 'width'],
    ['t', 'radius'],
  ] as const) {
    assert.throws(
      () => dispatcher.dispatch(['set', id, attribute, '1']),
      new DomainError(`unknown attribute: ${attribute}`),
    );
  }
  assert.throws(
    () => dispatcher.dispatch(['set', 'missing', 'x', '1']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'x', 'nope']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'width', '0']),
    new DomainError('rect width must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'height', '-1']),
    new DomainError('rect height must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'fill', '']),
    new DomainError('fill must not be empty'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'stroke', '']),
    new DomainError('stroke must not be empty'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'stroke-width', '-1']),
    new DomainError('stroke-width must be non-negative'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'stroke-width', 'nope']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'x']),
    new DomainError('usage: set <id> <attr> <value>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'x', '1', 'extra']),
    new DomainError('usage: set <id> <attr> <value>'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── g#scene',
    '│   └── rect#r  x=10 y=20 w=30 h=40 fill=red',
    '├── text#t     (1,2) "old"',
    '├── circle#c   cx=1 cy=2 r=3',
    '├── ellipse#e  cx=4 cy=5 rx=6 ry=7',
    '└── line#l     (8,9) -> (10,11)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#pending created']);
});

test('[spec 5.3, 6.5] accepts quoted values and formats text content as a JSON string', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'text', 't', '0', '0', 'old']);

  assert.deepEqual(dispatcher.dispatch(['set', 't', 'text', '']), ['text#t updated: text=""']);
  assert.deepEqual(dispatcher.dispatch(['set', 't', 'text', 'say "hi" \\path']), [
    'text#t updated: text="say \\"hi\\" \\\\path"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['text#t updated: text=""']);
  assert.deepEqual(dispatcher.dispatch(['show', 't']), [
    'text#t  parent=svg',
    '  x=0 y=0',
    '  text=""',
  ]);
});

test('[spec 3.3, 6.5] requires a document before validating set arguments', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['set', 'r', 'x', '1']),
    new DomainError("no document. use 'init' or 'read' first"),
  );
});

test('[spec 6.5, 6.10, 9] a successful set clears redo and remains one undo unit', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['set', 'a', 'x', '5']), ['rect#a updated: x=5']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a updated: x=0']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#a updated: x=5']);
});
