import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 6.8, 6.10, 9] adds a subtree across containers and restores its ownership', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'source']);
  dispatcher.dispatch(['create', 'rect', 'before', '0', '0', '10', '10', 'in', 'source']);
  dispatcher.dispatch(['create', 'g', 'branch', 'in', 'source']);
  dispatcher.dispatch(['create', 'rect', 'nested', '20', '20', '10', '10', 'in', 'branch']);
  dispatcher.dispatch(['create', 'rect', 'after', '40', '40', '10', '10', 'in', 'source']);
  dispatcher.dispatch(['create', 'g', 'target']);
  dispatcher.dispatch(['create', 'rect', 'existing', '60', '60', '10', '10', 'in', 'target']);

  assert.deepEqual(dispatcher.dispatch(['addto', 'target', 'branch']), [
    'g#branch added to g#target',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'source']), [
    'g#source',
    '├── rect#before  x=0 y=0 w=10 h=10',
    '└── rect#after   x=40 y=40 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'target']), [
    'g#target',
    '├── rect#existing  x=60 y=60 w=10 h=10',
    '└── g#branch',
    '    └── rect#nested  x=20 y=20 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'nested']), [
    'rect#nested  parent=g#branch',
    '  x=20 y=20 width=10 height=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#branch moved back to g#source']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'source']), [
    'g#source',
    '├── rect#before  x=0 y=0 w=10 h=10',
    '├── g#branch',
    '│   └── rect#nested  x=20 y=20 w=10 h=10',
    '└── rect#after   x=40 y=40 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'target']), [
    'g#target',
    '└── rect#existing  x=60 y=60 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#branch added to g#target']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'target']), [
    'g#target',
    '├── rect#existing  x=60 y=60 w=10 h=10',
    '└── g#branch',
    '    └── rect#nested  x=20 y=20 w=10 h=10',
  ]);
});

test('[spec 6.8, 6.10, 9] moves a shape to the end of its current parent and restores its index', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'container']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10', 'in', 'container']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10', 'in', 'container']);
  dispatcher.dispatch(['create', 'rect', 'c', '40', '40', '10', '10', 'in', 'container']);

  assert.deepEqual(dispatcher.dispatch(['addto', 'container', 'a']), [
    'rect#a added to g#container',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'container']), [
    'g#container',
    '├── rect#b  x=20 y=20 w=10 h=10',
    '├── rect#c  x=40 y=40 w=10 h=10',
    '└── rect#a  x=0 y=0 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a moved back to g#container']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'container']), [
    'g#container',
    '├── rect#a  x=0 y=0 w=10 h=10',
    '├── rect#b  x=20 y=20 w=10 h=10',
    '└── rect#c  x=40 y=40 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#a added to g#container']);
});

test('[spec 2, 6.8, 6.10, 9] reports an addto no-op without clearing redo or unlocking history', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'target']);
  dispatcher.dispatch(['create', 'rect', 'first', '0', '0', '10', '10', 'in', 'target']);
  dispatcher.dispatch(['create', 'rect', 'tail', '20', '20', '10', '10', 'in', 'target']);
  dispatcher.dispatch(['create', 'rect', 'draft', '40', '40', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.deepEqual(dispatcher.dispatch(['addto', 'target', 'tail']), ['rect#tail unchanged']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'target']), [
    'g#target',
    '├── rect#first  x=0 y=0 w=10 h=10',
    '└── rect#tail   x=20 y=20 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#draft created']);

  dispatcher.dispatch(['canvas', '640', '480']);
  assert.deepEqual(dispatcher.dispatch(['addto', 'target', 'tail']), ['rect#tail unchanged']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
});

test('[spec 3.3, 6.8, 6.10, 9] rejects invalid addto targets without changing the tree or redo', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['addto', 'target', 'leaf']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'target']);
  dispatcher.dispatch(['create', 'rect', 'leaf', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'g', 'parent']);
  dispatcher.dispatch(['create', 'g', 'child', 'in', 'parent']);
  dispatcher.dispatch(['create', 'rect', 'draft', '20', '20', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.throws(() => dispatcher.dispatch(['addto']), new DomainError('usage: addto <gid> <id>'));
  assert.throws(
    () => dispatcher.dispatch(['addto', 'target']),
    new DomainError('usage: addto <gid> <id>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['addto', 'target', 'leaf', 'extra']),
    new DomainError('usage: addto <gid> <id>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['addto', 'missing', 'leaf']),
    new DomainError('no such container: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['addto', 'leaf', 'target']),
    new DomainError('not a container: leaf'),
  );
  assert.throws(
    () => dispatcher.dispatch(['addto', 'target', 'missing']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['addto', 'parent', 'parent']),
    new DomainError('cannot move a container into its own descendant: parent'),
  );
  assert.throws(
    () => dispatcher.dispatch(['addto', 'child', 'parent']),
    new DomainError('cannot move a container into its own descendant: parent'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── g#target',
    '├── rect#leaf  x=0 y=0 w=10 h=10',
    '└── g#parent',
    '    └── g#child',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#draft created']);
});

test('[spec 6.8, 6.10, 9] a successful addto clears redo and unlocks an io barrier', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'target']);
  dispatcher.dispatch(['create', 'rect', 'moving', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'draft', '20', '20', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.deepEqual(dispatcher.dispatch(['addto', 'target', 'moving']), [
    'rect#moving added to g#target',
  ]);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#moving moved back to svg']);

  dispatcher.dispatch(['canvas', '640', '480']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.deepEqual(dispatcher.dispatch(['addto', 'target', 'moving']), [
    'rect#moving added to g#target',
  ]);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#moving moved back to svg']);
});
