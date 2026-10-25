import assert from 'node:assert/strict';
import test from 'node:test';

import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 5.5, 5.6, 6.1] creates and displays an empty container', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  assert.deepEqual(dispatcher.dispatch(['create', 'g', 'scene']), ['g#scene created']);
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (800x600)', '└── g#scene']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), ['g#scene']);
  assert.deepEqual(dispatcher.dispatch(['show', 'scene']), ['g#scene  parent=svg']);
});
