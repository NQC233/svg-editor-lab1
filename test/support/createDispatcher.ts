import { CommandCatalog } from '../../src/cli/CommandCatalog.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { AddToContainerCommand } from '../../src/commands/AddToContainerCommand.js';
import { CanvasCommand } from '../../src/commands/CanvasCommand.js';
import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandHistory } from '../../src/commands/CommandHistory.js';
import { CommandInvoker } from '../../src/commands/CommandInvoker.js';
import { CreateCommand } from '../../src/commands/CreateCommand.js';
import { DeleteCommand } from '../../src/commands/DeleteCommand.js';
import { HelpCommand } from '../../src/commands/HelpCommand.js';
import { InitCommand } from '../../src/commands/InitCommand.js';
import { MoveCommand } from '../../src/commands/MoveCommand.js';
import { RedoCommand } from '../../src/commands/RedoCommand.js';
import { ScaleCommand } from '../../src/commands/ScaleCommand.js';
import { SetCommand } from '../../src/commands/SetCommand.js';
import { ShowCommand } from '../../src/commands/ShowCommand.js';
import { TreeCommand } from '../../src/commands/TreeCommand.js';
import { UndoCommand } from '../../src/commands/UndoCommand.js';
import { UngroupCommand } from '../../src/commands/UngroupCommand.js';
import { ShowFormatter } from '../../src/display/ShowFormatter.js';
import { TreeFormatter } from '../../src/display/TreeFormatter.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';

export function createDispatcher(): CommandDispatcher {
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
    ['delete', () => new DeleteCommand()],
    ['ungroup', () => new UngroupCommand()],
    ['addto', () => new AddToContainerCommand()],
    ['move', () => new MoveCommand()],
    ['scale', () => new ScaleCommand()],
    ['set', () => new SetCommand()],
    ['tree', () => new TreeCommand()],
    ['show', () => new ShowCommand()],
    ['help', () => new HelpCommand()],
    ['undo', () => new UndoCommand()],
    ['redo', () => new RedoCommand()],
  ]);

  return new CommandDispatcher(catalog, new CommandInvoker(context));
}
