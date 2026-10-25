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
