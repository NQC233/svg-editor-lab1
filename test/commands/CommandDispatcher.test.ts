import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandInvoker } from '../../src/commands/CommandInvoker.js';
import { CanvasCommand } from '../../src/commands/CanvasCommand.js';
import { HelpCommand } from '../../src/commands/HelpCommand.js';
import { InitCommand } from '../../src/commands/InitCommand.js';
import { CommandCatalog } from '../../src/cli/CommandCatalog.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { DomainError } from '../../src/shared/DomainError.js';

function createCatalog(): CommandCatalog {
  return new CommandCatalog([
    ['init', new InitCommand()],
    ['canvas', new CanvasCommand()],
    ['help', new HelpCommand()],
  ]);
}

test('[spec 6.11, 6.14] init creates an empty document that canvas can display', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(createCatalog(), new CommandInvoker(context));

  assert.deepEqual(dispatcher.dispatch(['init']), ['canvas 800x600 created']);
  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 800x600']);
});

test('[spec 6.17] help works without a document and lists the complete target grammar', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(createCatalog(), new CommandInvoker(context));

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
    'Canvas resizing is not available yet.',
  ]);
});

test('[spec 3.3, 6.14] failed canvas commands leave the existing size unchanged', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(createCatalog(), new CommandInvoker(context));

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
    () => dispatcher.dispatch(['canvas', '100', '200']),
    new DomainError('canvas resizing is not available yet'),
  );
  assert.throws(
    () => dispatcher.dispatch(['canvas', '1', '2', '3']),
    new DomainError('usage: canvas [w] [h]'),
  );

  assert.deepEqual(dispatcher.dispatch(['canvas']), ['canvas 400x200']);
});

test('[spec 3.1, 6.11] accepts decimal/scientific init values and rejects invalid numeric forms', () => {
  const context = new CommandContext();
  const dispatcher = new CommandDispatcher(createCatalog(), new CommandInvoker(context));

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
