import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 6.9, 6.10, 9] moves leaves to front/back and restores their original indexes', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'c', '40', '40', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'd', '60', '60', '10', '10']);

  assert.deepEqual(dispatcher.dispatch(['front', 'b']), ['rect#b moved to front']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#a  x=0 y=0 w=10 h=10',
    '├── rect#c  x=40 y=40 w=10 h=10',
    '├── rect#d  x=60 y=60 w=10 h=10',
    '└── rect#b  x=20 y=20 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b moved back']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#a  x=0 y=0 w=10 h=10',
    '├── rect#b  x=20 y=20 w=10 h=10',
    '├── rect#c  x=40 y=40 w=10 h=10',
    '└── rect#d  x=60 y=60 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b moved to front']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b moved back']);
  assert.deepEqual(dispatcher.dispatch(['back', 'c']), ['rect#c moved to back']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#c  x=40 y=40 w=10 h=10',
    '├── rect#a  x=0 y=0 w=10 h=10',
    '├── rect#b  x=20 y=20 w=10 h=10',
    '└── rect#d  x=60 y=60 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#c moved back']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#c moved to back']);
});

test('[spec 6.9, 6.10, 9] moves a container without changing its subtree order', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'back', '0', '0', '10', '10', 'in', 'outer']);
  dispatcher.dispatch(['create', 'g', 'middle', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'nested-a', '20', '20', '10', '10', 'in', 'middle']);
  dispatcher.dispatch(['create', 'rect', 'nested-b', '40', '40', '10', '10', 'in', 'middle']);
  dispatcher.dispatch(['create', 'rect', 'front', '60', '60', '10', '10', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['front', 'middle']), ['g#middle moved to front']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── rect#back   x=0 y=0 w=10 h=10',
    '├── rect#front  x=60 y=60 w=10 h=10',
    '└── g#middle',
    '    ├── rect#nested-a  x=20 y=20 w=10 h=10',
    '    └── rect#nested-b  x=40 y=40 w=10 h=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#middle moved back']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── rect#back   x=0 y=0 w=10 h=10',
    '├── g#middle',
    '│   ├── rect#nested-a  x=20 y=20 w=10 h=10',
    '│   └── rect#nested-b  x=40 y=40 w=10 h=10',
    '└── rect#front  x=60 y=60 w=10 h=10',
  ]);
});

test('[spec 2, 6.9, 6.10, 9] reports boundary no-ops without clearing redo or unlocking history', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'c', '40', '40', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'draft', '60', '60', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.deepEqual(dispatcher.dispatch(['front', 'c']), ['rect#c is already at front']);
  assert.deepEqual(dispatcher.dispatch(['back', 'a']), ['rect#a is already at back']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#draft created']);

  dispatcher.dispatch(['canvas', '640', '480']);
  assert.deepEqual(dispatcher.dispatch(['front', 'draft']), ['rect#draft is already at front']);
  assert.deepEqual(dispatcher.dispatch(['back', 'a']), ['rect#a is already at back']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
});

test('[spec 3.3, 6.9, 6.10, 9] rejects malformed z-order commands without changing state or redo', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['front', 'a']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'draft', '40', '40', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.throws(() => dispatcher.dispatch(['front']), new DomainError('usage: front <id>'));
  assert.throws(
    () => dispatcher.dispatch(['front', 'a', 'extra']),
    new DomainError('usage: front <id>'),
  );
  assert.throws(() => dispatcher.dispatch(['back']), new DomainError('usage: back <id>'));
  assert.throws(
    () => dispatcher.dispatch(['back', 'a', 'extra']),
    new DomainError('usage: back <id>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['front', 'missing']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['back', 'missing']),
    new DomainError('no such shape: missing'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#a  x=0 y=0 w=10 h=10',
    '└── rect#b  x=20 y=20 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#draft created']);
});

test('[spec 6.9, 6.10, 9] successful z-order commands clear redo and unlock an io barrier', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'draft', '40', '40', '10', '10']);
  dispatcher.dispatch(['undo']);

  assert.deepEqual(dispatcher.dispatch(['front', 'a']), ['rect#a moved to front']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a moved back']);

  dispatcher.dispatch(['canvas', '640', '480']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.deepEqual(dispatcher.dispatch(['back', 'b']), ['rect#b moved to back']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b moved back']);
});
