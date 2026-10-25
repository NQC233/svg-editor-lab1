import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandToken } from '../../src/commands/CommandToken.js';
import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 5.5, 5.6, 6.1] creates and displays an empty container', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  assert.deepEqual(dispatcher.dispatch(['create', 'g', 'scene']), ['g#scene created']);
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (800x600)', '└── g#scene']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), ['g#scene']);
  assert.deepEqual(dispatcher.dispatch(['show', 'scene']), ['g#scene  parent=svg']);
});

test('[spec 5.5, 5.6, 6.1, 6.10] creates in a container and restores its parent and index', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  assert.deepEqual(
    dispatcher.dispatch(['create', 'rect', 'a', '10', '20', '30', '40', 'red', 'in', 'scene']),
    ['rect#a created in g#scene'],
  );
  assert.deepEqual(dispatcher.dispatch(['show', 'a']), [
    'rect#a  parent=g#scene',
    '  x=10 y=20 width=30 height=40',
    '  fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── g#scene',
    '    └── rect#a  x=10 y=20 w=30 h=40 fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '└── rect#a  x=10 y=20 w=30 h=40 fill=red',
  ]);

  assert.deepEqual(
    dispatcher.dispatch(['create', 'rect', 'b', '50', '60', '70', '80', 'in', 'scene']),
    ['rect#b created in g#scene'],
  );
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a removed']);
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (800x600)', '└── g#scene']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#a created in g#scene']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created in g#scene']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '├── rect#a  x=10 y=20 w=30 h=40 fill=red',
    '└── rect#b  x=50 y=60 w=70 h=80',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'b']), [
    'rect#b  parent=g#scene',
    '  x=50 y=60 width=70 height=80',
  ]);
});

test('[spec 5.2, 5.5, 6.1] nests every supported type and aligns each sibling group', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'flowchart']);
  dispatcher.dispatch(['create', 'g', 'node1', 'in', 'flowchart']);
  dispatcher.dispatch([
    'create',
    'rect',
    'start',
    '120',
    '100',
    '160',
    '60',
    '#4a90d9',
    'in',
    'node1',
  ]);
  dispatcher.dispatch(['create', 'text', 'start-label', '155', '135', '开始', 'in', 'node1']);
  dispatcher.dispatch(['create', 'g', 'node2', 'in', 'flowchart']);
  dispatcher.dispatch(['create', 'circle', 'dot', '500', '130', '10', 'in', 'node2']);
  dispatcher.dispatch(['create', 'ellipse', 'oval', '540', '130', '30', '15', 'in', 'node2']);
  dispatcher.dispatch([
    'create',
    'line',
    'arrow',
    '280',
    '130',
    '500',
    '130',
    'black',
    'in',
    'node2',
  ]);

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── g#flowchart',
    '    ├── g#node1',
    '    │   ├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9',
    '    │   └── text#start-label  (155,135) "开始"',
    '    └── g#node2',
    '        ├── circle#dot    cx=500 cy=130 r=10',
    '        ├── ellipse#oval  cx=540 cy=130 rx=30 ry=15',
    '        └── line#arrow    (280,130) -> (500,130)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'node1']), [
    'g#node1',
    '├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9',
    '└── text#start-label  (155,135) "开始"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'arrow']), [
    'line#arrow  parent=g#node2',
    '  x1=280 y1=130 x2=500 y2=130',
    '  stroke=black',
  ]);
});

test('[spec 3.3, 5.5, 6.1, 6.10] rejects container suffix failures without changing tree or redo', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'base', '0', '0', '10', '10', 'in', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'pending', '20', '20', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#pending removed']);

  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'missing', '0', '0', '1', '1', 'in', 'absent']),
    new DomainError('no such container: absent'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'wrong', '0', '0', '1', '1', 'in', 'base']),
    new DomainError('not a container: base'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'base', '2', '3', '4', '5', 'in', 'scene']),
    new DomainError('id already exists: base'),
  );
  assert.throws(
    () =>
      dispatcher.dispatchTokens([
        new CommandToken('create'),
        new CommandToken('g'),
        new CommandToken('quoted-in'),
        new CommandToken('in', true),
        new CommandToken('scene'),
      ]),
    new DomainError('usage: create g <id>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'g', 'incomplete', 'in']),
    new DomainError('usage: create <type> <id> [params...] [in <containerId>]'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'bare-in', '0', '0', '1', '1', 'in']),
    new DomainError('usage: create <type> <id> [params...] [in <containerId>]'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── g#scene',
    '    └── rect#base  x=0 y=0 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#pending created']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── g#scene',
    '│   └── rect#base  x=0 y=0 w=10 h=10',
    '└── rect#pending  x=20 y=20 w=5 h=5',
  ]);
});
