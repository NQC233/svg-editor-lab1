import { CliApplication } from './cli/CliApplication.js';
import { CommandCatalog } from './cli/CommandCatalog.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { ConsoleOutput } from './cli/ConsoleOutput.js';
import { LineTokenizer } from './cli/LineTokenizer.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CommandContext } from './commands/CommandContext.js';
import { CommandHistory } from './commands/CommandHistory.js';
import { CommandInvoker } from './commands/CommandInvoker.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { ShowFormatter } from './display/ShowFormatter.js';
import { TreeFormatter } from './display/TreeFormatter.js';
import { ShapeFactory } from './domain/ShapeFactory.js';

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
  ['move', () => new MoveCommand()],
  ['scale', () => new ScaleCommand()],
  ['tree', () => new TreeCommand()],
  ['show', () => new ShowCommand()],
  ['help', () => new HelpCommand()],
  ['undo', () => new UndoCommand()],
  ['redo', () => new RedoCommand()],
]);
const dispatcher = new CommandDispatcher(catalog, new CommandInvoker(context));
const application = new CliApplication({
  dispatcher,
  input: process.stdin,
  output: new ConsoleOutput(process.stdout),
  tokenizer: new LineTokenizer(),
});
await application.run();
