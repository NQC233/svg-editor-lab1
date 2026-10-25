import assert from 'node:assert/strict';
import test from 'node:test';

import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 5.5, 5.6, 6.1, 6.10] creates, displays, undoes, and redoes a circle', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  assert.deepEqual(dispatcher.dispatch(['create', 'circle', 'c1', '100', '80', '20', 'red']), [
    'circle#c1 created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'c1']), [
    'circle#c1  parent=svg',
    '  cx=100 cy=80 r=20',
    '  fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── circle#c1  cx=100 cy=80 r=20 fill=red',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['circle#c1 removed']);
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (400x200)']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['circle#c1 created']);
  assert.deepEqual(dispatcher.dispatch(['show', 'c1']), [
    'circle#c1  parent=svg',
    '  cx=100 cy=80 r=20',
    '  fill=red',
  ]);
});
