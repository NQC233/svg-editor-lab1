import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 6.11, 6.14] init creates an empty document that canvas can display', () => {
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['init']), ['canvas 800x600 created']);
  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 800x600']);
});

test('[spec 6.17] help works without a document and lists the complete target grammar', () => {
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['help']), [
    'Document:',
    '  init [w] [h]',
    '  read <file.svg>',
    '  save [file.svg]',
    '  canvas [w] [h]',
    'Edit:',
    '  create <type> <id> [params...] [in <containerId>]',
    '  delete <id>',
    '  move <id> <dx> <dy>',
    '  scale <id> <factor>',
    '  set <id> <attr> <value>',
    '  group <newGid> <id1> <id2>...',
    '  ungroup <gid>',
    '  addto <gid> <id>',
    '  front <id>',
    '  back <id>',
    'Display:',
    '  tree [id]',
    '  show <id>',
    '  help',
    'History:',
    '  undo',
    '  redo',
    'Phase 1 implementation: available commands are help, init, read, canvas, create rect, circle, ellipse, line, text, g, delete, group, ungroup, addto, front, back, move, scale, set, save, tree, show, undo, and redo.',
  ]);
});

test('[spec 3.3, 6.14] failed canvas commands leave the existing size unchanged', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['canvas']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '400', '200']);

  assert.throws(
    () => dispatcher.dispatch(['canvas', '100']),
    new DomainError('canvas requires both width and height'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '100', 'nope']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '0', '200']),
    new DomainError('canvas width and height must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '1', '2', '3']),
    new DomainError('usage: canvas [w] [h]'),
  );

  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 400x200']);
  assert.deepEqual(dispatcher.dispatch(['canvas', '100', '200']), ['canvas resized to 100x200']);
  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 100x200']);
});

test('[spec 3.1, 6.11] accepts decimal/scientific init values and rejects invalid numeric forms', () => {
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['init', '.5', '5.']), ['canvas 0.5x5 created']);
  assert.deepEqual(dispatcher.dispatch(['init', '1e3', '2E2']), ['canvas 1000x200 created']);
  assert.deepEqual(dispatcher.dispatch(['init', '320', '240']), ['canvas 320x240 created']);

  for (const value of ['NaN', 'Infinity', '', '10px', '50%', '0x10']) {
    assert.throws(
      () => dispatcher.dispatch(['init', value, '240']),
      new DomainError(`invalid number: ${value}`),
    );
  }

  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 320x240']);
});
