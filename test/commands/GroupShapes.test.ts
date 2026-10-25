import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 6.6, 6.10, 9] groups siblings in original order and restores their indexes', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'c', '40', '40', '10', '10', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['group', 'combined', 'b', 'a']), [
    'g#combined created with 2 children',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#combined',
    '│   ├── rect#a  x=0 y=0 w=10 h=10',
    '│   └── rect#b  x=20 y=20 w=10 h=10',
    '└── rect#c      x=40 y=40 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#combined removed; 2 children restored']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── rect#a  x=0 y=0 w=10 h=10',
    '├── rect#b  x=20 y=20 w=10 h=10',
    '└── rect#c  x=40 y=40 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#combined created with 2 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#combined',
    '│   ├── rect#a  x=0 y=0 w=10 h=10',
    '│   └── rect#b  x=20 y=20 w=10 h=10',
    '└── rect#c      x=40 y=40 w=10 h=10',
  ]);
});

test('[spec 6.6, 6.10, 9] uses the first target anchor across parents and supports one target', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'left']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10', 'in', 'left']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10', 'in', 'left']);
  dispatcher.dispatch(['create', 'g', 'right']);
  dispatcher.dispatch(['create', 'rect', 'd', '40', '40', '10', '10', 'in', 'right']);
  dispatcher.dispatch(['create', 'rect', 'e', '60', '60', '10', '10', 'in', 'right']);

  assert.deepEqual(dispatcher.dispatch(['group', 'merged', 'd', 'a']), [
    'g#merged created with 2 children',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── g#left',
    '│   └── rect#b  x=20 y=20 w=10 h=10',
    '└── g#right',
    '    ├── g#merged',
    '    │   ├── rect#a  x=0 y=0 w=10 h=10',
    '    │   └── rect#d  x=40 y=40 w=10 h=10',
    '    └── rect#e    x=60 y=60 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['group', 'solo', 'e']), ['g#solo created with 1 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'right']), [
    'g#right',
    '├── g#merged',
    '│   ├── rect#a  x=0 y=0 w=10 h=10',
    '│   └── rect#d  x=40 y=40 w=10 h=10',
    '└── g#solo',
    '    └── rect#e  x=60 y=60 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#solo removed; 1 children restored']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#merged removed; 2 children restored']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── g#left',
    '│   ├── rect#a  x=0 y=0 w=10 h=10',
    '│   └── rect#b  x=20 y=20 w=10 h=10',
    '└── g#right',
    '    ├── rect#d  x=40 y=40 w=10 h=10',
    '    └── rect#e  x=60 y=60 w=10 h=10',
  ]);
});

test('[spec 3.3, 6.6, 6.10, 9] rejects invalid groups without changing tree, history, or redo', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['group', 'combined', 'a']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'inner', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'leaf', '0', '0', '10', '10', 'in', 'inner']);
  dispatcher.dispatch(['create', 'rect', 'sibling', '20', '20', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'draft', '40', '40', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.throws(
    () => dispatcher.dispatch(['group']),
    new DomainError('usage: group <newGid> <id1> <id2>...'),
  );
  assert.throws(
    () => dispatcher.dispatch(['group', 'combined']),
    new DomainError('usage: group <newGid> <id1> <id2>...'),
  );
  assert.throws(
    () => dispatcher.dispatch(['group', 'combined', 'leaf', 'leaf']),
    new DomainError('duplicate target: leaf'),
  );
  assert.throws(
    () => dispatcher.dispatch(['group', 'combined', 'leaf', 'missing']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['group', 'outer', 'leaf']),
    new DomainError('id already exists: outer'),
  );
  assert.throws(
    () => dispatcher.dispatch(['group', 'combined', 'outer', 'leaf']),
    new DomainError('cannot group a container into its own descendant: outer'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── g#outer',
    '    ├── g#inner',
    '    │   └── rect#leaf  x=0 y=0 w=10 h=10',
    '    └── rect#sibling  x=20 y=20 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#draft created']);
});

test('[spec 6.6, 6.10, 9] a successful group clears redo and unlocks an io barrier', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'draft', '40', '40', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.deepEqual(dispatcher.dispatch(['group', 'combined', 'b', 'a']), [
    'g#combined created with 2 children',
  ]);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#combined removed; 2 children restored']);

  dispatcher.dispatch(['canvas', '640', '480']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.deepEqual(dispatcher.dispatch(['group', 'combined', 'b', 'a']), [
    'g#combined created with 2 children',
  ]);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#combined removed; 2 children restored']);
});
