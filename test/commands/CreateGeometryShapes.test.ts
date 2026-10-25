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

test('[spec 3.1, 5.2, 5.5, 5.6, 6.1, 6.10] creates and restores an unfilled ellipse with float geometry', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  assert.deepEqual(dispatcher.dispatch(['create', 'ellipse', 'e1', '-1.5', '2.25', '30.5', '20']), [
    'ellipse#e1 created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'e1']), [
    'ellipse#e1  parent=svg',
    '  cx=-1.5 cy=2.25 rx=30.5 ry=20',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── ellipse#e1  cx=-1.5 cy=2.25 rx=30.5 ry=20',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['ellipse#e1 removed']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['ellipse#e1 created']);
  assert.deepEqual(dispatcher.dispatch(['show', 'e1']), [
    'ellipse#e1  parent=svg',
    '  cx=-1.5 cy=2.25 rx=30.5 ry=20',
  ]);
});
