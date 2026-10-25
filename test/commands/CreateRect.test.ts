import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandInvoker } from '../../src/commands/CommandInvoker.js';
import { CanvasCommand } from '../../src/commands/CanvasCommand.js';
import { CreateCommand } from '../../src/commands/CreateCommand.js';
import { HelpCommand } from '../../src/commands/HelpCommand.js';
import { InitCommand } from '../../src/commands/InitCommand.js';
import { ShowCommand } from '../../src/commands/ShowCommand.js';
import { TreeCommand } from '../../src/commands/TreeCommand.js';
import { CommandCatalog } from '../../src/cli/CommandCatalog.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { ShowFormatter } from '../../src/display/ShowFormatter.js';
import { TreeFormatter } from '../../src/display/TreeFormatter.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { DomainError } from '../../src/shared/DomainError.js';

function createDispatcher(): CommandDispatcher {
  const context = new CommandContext({
    shapeFactory: new ShapeFactory(),
    showFormatter: new ShowFormatter(),
    treeFormatter: new TreeFormatter(),
  });
  const catalog = new CommandCatalog([
    ['init', new InitCommand()],
    ['canvas', new CanvasCommand()],
    ['create', new CreateCommand()],
    ['tree', new TreeCommand()],
    ['show', new ShowCommand()],
    ['help', new HelpCommand()],
  ]);
  return new CommandDispatcher(catalog, new CommandInvoker(context));
}

test('[spec 5.5, 5.6, 6.1, 6.15, 6.16] creates a rectangle and displays its properties and tree', () => {
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['init', '800', '600']), ['canvas 800x600 created']);
  assert.deepEqual(dispatcher.dispatch(['create', 'rect', 'r1', '10', '20', '100', '50', '#eee']), [
    'rect#r1 created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'r1']), [
    'rect#r1  parent=svg',
    '  x=10 y=20 width=100 height=50',
    '  fill=#eee',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── rect#r1  x=10 y=20 w=100 h=50 fill=#eee',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'r1']), [
    'rect#r1  x=10 y=20 w=100 h=50 fill=#eee',
  ]);
});

test('[spec 3.1, 3.2, 5.5, 5.6] keeps insertion order, optional fill, and case-sensitive ids', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'rect', 'Upper', '-1.5', '2', '10', '20']);
  dispatcher.dispatch(['create', 'rect', 'upper', '3', '4', '5', '6', 'red']);
  dispatcher.dispatch(['create', 'rect', 'lowercase', '0', '0', '30', '40', 'red']);

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '├── rect#Upper      x=-1.5 y=2 w=10 h=20',
    '├── rect#upper      x=3 y=4 w=5 h=6 fill=red',
    '└── rect#lowercase  x=0 y=0 w=30 h=40 fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'Upper']), [
    'rect#Upper  parent=svg',
    '  x=-1.5 y=2 width=10 height=20',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'upper']), [
    'rect#upper  parent=svg',
    '  x=3 y=4 width=5 height=6',
    '  fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'lowercase']), [
    'rect#lowercase  parent=svg',
    '  x=0 y=0 width=30 height=40',
    '  fill=red',
  ]);
});

test('[spec 3.2, 5.5] aligns tree attribute columns by display width for non-ASCII ids', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '1', '1']);
  dispatcher.dispatch(['create', 'rect', '很长的', '10', '20', '30', '40']);
  dispatcher.dispatch(['create', 'rect', 'a\u093e', '2', '3', '4', '5']);
  dispatcher.dispatch(['create', 'rect', 'z', '5', '6', '7', '8']);

  const shortLabelPadding = ' '.repeat(7);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    `├── rect#a${shortLabelPadding}x=0 y=0 w=1 h=1`,
    '├── rect#很长的  x=10 y=20 w=30 h=40',
    `├── rect#a\u093e${shortLabelPadding}x=2 y=3 w=4 h=5`,
    `└── rect#z${shortLabelPadding}x=5 y=6 w=7 h=8`,
  ]);
});

test('[spec 3.3, 5.1, 5.2, 6.1, 6.16] rejects invalid rectangles without changing existing shapes', () => {
  const dispatcher = createDispatcher();
  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'base', '0', '0', '10', '10', 'red']);

  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'zero-width', '0', '0', '0', '10']),
    new DomainError('rect width must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'negative-height', '0', '0', '10', '-1']),
    new DomainError('rect height must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'bad-x', 'nope', '0', '10', '10']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'base', '0', '0', '20', '20']),
    new DomainError('id already exists: base'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'bad id', '0', '0', '10', '10']),
    new DomainError('invalid id: bad id'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'empty-fill', '0', '0', '10', '10', '']),
    new DomainError('fill must not be empty'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'hexagon', 'h1', '0', '0', '10', '10']),
    new DomainError('unknown shape type: hexagon (is the plugin loaded?)'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'rect', 'too-few']),
    new DomainError('usage: create rect <id> <x> <y> <w> <h> [fill]'),
  );
  assert.throws(
    () => dispatcher.dispatch(['show', 'missing']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['tree', 'missing']),
    new DomainError('no such shape: missing'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── rect#base  x=0 y=0 w=10 h=10 fill=red',
  ]);
});
