import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandInvoker } from '../../src/commands/CommandInvoker.js';
import { CommandCatalog } from '../../src/cli/CommandCatalog.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { DomainError } from '../../src/shared/DomainError.js';

test('init creates an empty document that canvas can display', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(new CommandCatalog(), new CommandInvoker(context));

  assert.deepEqual(dispatcher.dispatch(['init']), ['canvas 800x600 created']);
  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 800x600']);
});

test('help works without a document and lists the complete target grammar', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(new CommandCatalog(), new CommandInvoker(context));

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
    'Partial implementation: available commands are help, init, and canvas.',
  ]);
});

test('failed canvas commands leave the existing size unchanged', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(new CommandCatalog(), new CommandInvoker(context));

  assert.throws(
    () => dispatcher.dispatch(['canvas']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '400', '200']);

  assert.throws(
    () => dispatcher.dispatch(['canvas', '0', '200']),
    new DomainError('canvas width and height must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', 'wide', '200']),
    new DomainError('invalid number: wide'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '1', '2', '3']),
    new DomainError('usage: canvas [w] [h]'),
  );

  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 400x200']);
});
