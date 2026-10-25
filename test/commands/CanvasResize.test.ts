import assert from 'node:assert/strict';
import test from 'node:test';

import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 6.14] resizes the canvas without changing existing shapes', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '320', '240']);
  dispatcher.dispatch(['create', 'rect', 'r1', '10', '20', '40', '30', '#4a90d9']);

  assert.deepEqual(dispatcher.dispatch(['canvas', '640', '480']), ['canvas resized to 640x480']);
  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 640x480']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (640x480)',
    '└── rect#r1  x=10 y=20 w=40 h=30 fill=#4a90d9',
  ]);
});
