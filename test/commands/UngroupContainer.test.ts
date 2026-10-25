import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 6.7, 6.10, 9] ungroups nested children in place and restores them as one undo unit', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'b', '0', '0', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['create', 'g', 'n', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'a', '20', '20', '10', '10', 'in', 'n']);
  dispatcher.dispatch(['create', 'g', 'm', 'in', 'n']);
  dispatcher.dispatch(['create', 'rect', 'x', '40', '40', '10', '10', 'in', 'm']);
  dispatcher.dispatch(['create', 'rect', 'z', '60', '60', '10', '10', 'in', 'n']);
  dispatcher.dispatch(['create', 'rect', 'c', '80', '80', '10', '10', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['ungroup', 'n']), ['g#n ungrouped: 3 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── rect#b  x=0 y=0 w=10 h=10',
    '├── rect#a  x=20 y=20 w=10 h=10',
    '├── g#m',
    '│   └── rect#x  x=40 y=40 w=10 h=10',
    '├── rect#z  x=60 y=60 w=10 h=10',
    '└── rect#c  x=80 y=80 w=10 h=10',
  ]);
  assert.throws(() => dispatcher.dispatch(['show', 'n']), new DomainError('no such shape: n'));
  assert.deepEqual(dispatcher.dispatch(['show', 'x']), [
    'rect#x  parent=g#m',
    '  x=40 y=40 width=10 height=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#n restored with 3 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── rect#b  x=0 y=0 w=10 h=10',
    '├── g#n',
    '│   ├── rect#a  x=20 y=20 w=10 h=10',
    '│   ├── g#m',
    '│   │   └── rect#x  x=40 y=40 w=10 h=10',
    '│   └── rect#z  x=60 y=60 w=10 h=10',
    '└── rect#c  x=80 y=80 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#n ungrouped: 3 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── rect#b  x=0 y=0 w=10 h=10',
    '├── rect#a  x=20 y=20 w=10 h=10',
    '├── g#m',
    '│   └── rect#x  x=40 y=40 w=10 h=10',
    '├── rect#z  x=60 y=60 w=10 h=10',
    '└── rect#c  x=80 y=80 w=10 h=10',
  ]);
});

test('[spec 6.7, 6.10, 9] ungroups an empty nested container and restores it', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'empty', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['ungroup', 'empty']), ['g#empty ungrouped: 0 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), ['g#outer']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#empty restored with 0 children']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), ['g#outer', '└── g#empty']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#empty ungrouped: 0 children']);
});

test('[spec 3.3, 6.7, 6.10, 9] rejects invalid ungroups without changing the tree or history', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['ungroup', 'missing']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'target', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'leaf', '0', '0', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'pending', '20', '20', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['undo']);

  assert.throws(
    () => dispatcher.dispatch(['ungroup', 'outer']),
    new DomainError('cannot ungroup top-level container: outer'),
  );
  assert.throws(
    () => dispatcher.dispatch(['ungroup', 'leaf']),
    new DomainError('not a container: leaf'),
  );
  assert.throws(
    () => dispatcher.dispatch(['ungroup', 'missing']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(() => dispatcher.dispatch(['ungroup']), new DomainError('usage: ungroup <gid>'));
  assert.throws(
    () => dispatcher.dispatch(['ungroup', 'target', 'extra']),
    new DomainError('usage: ungroup <gid>'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#target',
    '└── rect#leaf  x=0 y=0 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#leaf removed']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#leaf created in g#outer']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#pending created in g#outer']);
});

test('[spec 6.7, 6.10] a successful ungroup clears redo', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'target', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'pending', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#pending removed']);

  assert.deepEqual(dispatcher.dispatch(['ungroup', 'target']), ['g#target ungrouped: 0 children']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#target restored with 0 children']);
});

test('[spec 6.10, 9] a successful ungroup unlocks an io barrier', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'target', 'in', 'outer']);
  dispatcher.dispatch(['canvas', '640', '480']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );

  assert.deepEqual(dispatcher.dispatch(['ungroup', 'target']), ['g#target ungrouped: 0 children']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#target restored with 0 children']);
  assert.throws(() => dispatcher.dispatch(['undo']), new DomainError('nothing to undo'));
});
