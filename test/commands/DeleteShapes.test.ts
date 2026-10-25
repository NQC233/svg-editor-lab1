import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 6.2, 9] deletes a leaf and restores its sibling position with undo and redo', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'before', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'circle', 'target', '20', '20', '5']);
  dispatcher.dispatch(['create', 'rect', 'after', '40', '40', '10', '10']);

  assert.deepEqual(dispatcher.dispatch(['delete', 'target']), ['circle#target deleted']);
  assert.throws(
    () => dispatcher.dispatch(['show', 'target']),
    new DomainError('no such shape: target'),
  );
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#before  x=0 y=0 w=10 h=10',
    '└── rect#after   x=40 y=40 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['circle#target restored into svg']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#before    x=0 y=0 w=10 h=10',
    '├── circle#target  cx=20 cy=20 r=5',
    '└── rect#after     x=40 y=40 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['circle#target deleted']);
  assert.throws(
    () => dispatcher.dispatch(['show', 'target']),
    new DomainError('no such shape: target'),
  );
});

test('[spec 5.2, 6.2, 9] releases and restores every id in a nested container subtree', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'first']);
  dispatcher.dispatch(['create', 'rect', 'before', '0', '0', '10', '10', 'in', 'first']);
  dispatcher.dispatch(['create', 'g', 'branch', 'in', 'first']);
  dispatcher.dispatch(['create', 'rect', 'nested', '20', '20', '30', '30', 'in', 'branch']);
  dispatcher.dispatch(['create', 'rect', 'last', '50', '50', '10', '10']);

  assert.deepEqual(dispatcher.dispatch(['delete', 'nested']), ['rect#nested deleted']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#nested restored into g#branch']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'branch']), [
    'g#branch',
    '└── rect#nested  x=20 y=20 w=30 h=30',
  ]);

  assert.deepEqual(dispatcher.dispatch(['delete', 'first']), ['g#first deleted']);
  for (const id of ['first', 'before', 'branch', 'nested']) {
    assert.throws(() => dispatcher.dispatch(['show', id]), new DomainError(`no such shape: ${id}`));
  }
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── rect#last  x=50 y=50 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#first restored into svg']);
  assert.deepEqual(dispatcher.dispatch(['show', 'nested']), [
    'rect#nested  parent=g#branch',
    '  x=20 y=20 width=30 height=30',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── g#first',
    '│   ├── rect#before  x=0 y=0 w=10 h=10',
    '│   └── g#branch',
    '│       └── rect#nested  x=20 y=20 w=30 h=30',
    '└── rect#last  x=50 y=50 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#first deleted']);
  assert.throws(
    () => dispatcher.dispatch(['show', 'nested']),
    new DomainError('no such shape: nested'),
  );
});

test('[spec 3.3, 6.2, 9] rejects invalid deletes without changing the tree or redo', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.throws(() => dispatcher.dispatch(['delete']), new DomainError('usage: delete <id>'));
  assert.throws(
    () => dispatcher.dispatch(['delete', 'a', 'extra']),
    new DomainError('usage: delete <id>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['delete', 'missing']),
    new DomainError('no such shape: missing'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── rect#a  x=0 y=0 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
});
