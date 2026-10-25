import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
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

test('[spec 6.10, 6.14] querying keeps history while resizing clears and locks it', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 800x600']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['canvas', '640', '480']), ['canvas resized to 640x480']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.throws(
    () => dispatcher.dispatch(['redo']),
    new DomainError('undo not allowed after io command'),
  );

  dispatcher.dispatch(['create', 'rect', 'c', '40', '40', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#c removed']);
  assert.throws(() => dispatcher.dispatch(['undo']), new DomainError('nothing to undo'));
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#c created']);
});

test('[spec 3.3, 3.4, 6.14] failed resizes preserve dimensions, shapes, and history', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.throws(
    () => dispatcher.dispatch(['canvas', '640']),
    new DomainError('canvas requires both width and height'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', 'nope', '480']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '0', '480']),
    new DomainError('canvas width and height must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '640', '-1']),
    new DomainError('canvas width and height must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '640', '480', 'extra']),
    new DomainError('usage: canvas [w] [h]'),
  );

  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 800x600']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── rect#a  x=0 y=0 w=10 h=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
});
