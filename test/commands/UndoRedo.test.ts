import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandHistory } from '../../src/commands/CommandHistory.js';
import { CommandInvoker } from '../../src/commands/CommandInvoker.js';
import { CanvasCommand } from '../../src/commands/CanvasCommand.js';
import { CreateCommand } from '../../src/commands/CreateCommand.js';
import { HelpCommand } from '../../src/commands/HelpCommand.js';
import { InitCommand } from '../../src/commands/InitCommand.js';
import { RedoCommand } from '../../src/commands/RedoCommand.js';
import { ShowCommand } from '../../src/commands/ShowCommand.js';
import { TreeCommand } from '../../src/commands/TreeCommand.js';
import { UndoCommand } from '../../src/commands/UndoCommand.js';
import { CommandCatalog } from '../../src/cli/CommandCatalog.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { ShowFormatter } from '../../src/display/ShowFormatter.js';
import { TreeFormatter } from '../../src/display/TreeFormatter.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { DomainError } from '../../src/shared/DomainError.js';

function createDispatcher(): CommandDispatcher {
  const history = new CommandHistory();
  const context = new CommandContext({
    history,
    shapeFactory: new ShapeFactory(),
    showFormatter: new ShowFormatter(),
    treeFormatter: new TreeFormatter(),
  });
  const catalog = new CommandCatalog([
    ['init', () => new InitCommand()],
    ['canvas', () => new CanvasCommand()],
    ['create', () => new CreateCommand()],
    ['tree', () => new TreeCommand()],
    ['show', () => new ShowCommand()],
    ['help', () => new HelpCommand()],
    ['undo', () => new UndoCommand()],
    ['redo', () => new RedoCommand()],
  ]);
  return new CommandDispatcher(catalog, new CommandInvoker(context));
}

test('[spec 6.1, 6.10, 6.11, 9] undoes and redoes a rectangle without changing its order', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10', 'red']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '30', '40', '50', '#4a90d9']);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── rect#a  x=0 y=0 w=10 h=10 fill=red',
  ]);
  assert.throws(() => dispatcher.dispatch(['show', 'b']), new DomainError('no such shape: b'));

  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '├── rect#a  x=0 y=0 w=10 h=10 fill=red',
    '└── rect#b  x=20 y=30 w=40 h=50 fill=#4a90d9',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'b']), [
    'rect#b  parent=svg',
    '  x=20 y=30 width=40 height=50',
    '  fill=#4a90d9',
  ]);
});

test('[spec 6.10, 9] records one undo unit per create and clears redo after a new edit', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '10', '10', '10', '10']);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a removed']);

  dispatcher.dispatch(['create', 'rect', 'c', '20', '20', '10', '10']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#c removed']);
  assert.throws(() => dispatcher.dispatch(['undo']), new DomainError('nothing to undo'));
});

test('[spec 3.3, 6.10, 6.11, 9] enforces document, empty-stack, and init barrier errors', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError("no document. use 'init' or 'read' first"),
  );
  assert.throws(
    () => dispatcher.dispatch(['redo']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'old', '0', '0', '10', '10']);
  dispatcher.dispatch(['init', '320', '240']);

  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.throws(
    () => dispatcher.dispatch(['redo']),
    new DomainError('undo not allowed after io command'),
  );

  dispatcher.dispatch(['create', 'rect', 'new', '0', '0', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#new removed']);
  assert.throws(() => dispatcher.dispatch(['undo']), new DomainError('nothing to undo'));
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#new created']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
});

test('[spec 3.3, 6.10, 9] keeps redo after display, failed edits, and failed init', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '10', '10', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  dispatcher.dispatch(['tree']);
  dispatcher.dispatch(['help']);
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'a', '20', '20', '10', '10']),
    new DomainError('id already exists: a'),
  );

  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.throws(
    () => dispatcher.dispatch(['init', '0', '200']),
    new DomainError('init width and height must be positive'),
  );
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
});
