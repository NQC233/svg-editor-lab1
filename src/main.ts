import { CliApplication } from './cli/CliApplication.js';
import { CommandCatalog } from './cli/CommandCatalog.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { ConsoleOutput } from './cli/ConsoleOutput.js';
import { LineTokenizer } from './cli/LineTokenizer.js';
import { AddToContainerCommand } from './commands/AddToContainerCommand.js';
import { BackCommand } from './commands/BackCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CommandContext } from './commands/CommandContext.js';
import { CommandHistory } from './commands/CommandHistory.js';
import { CommandInvoker } from './commands/CommandInvoker.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { SaveCommand } from './commands/SaveCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { ShowFormatter } from './display/ShowFormatter.js';
import { TreeFormatter } from './display/TreeFormatter.js';
import { ShapeFactory } from './domain/ShapeFactory.js';
import { SvgIdAllocator } from './io/SvgIdAllocator.js';
import { SvgWriter } from './io/SvgWriter.js';
import { SvgReader } from './io/SvgReader.js';
import { XmlParser } from './io/XmlParser.js';

const history = new CommandHistory();
const shapeFactory = new ShapeFactory();
const context = new CommandContext({
  history,
  shapeFactory,
  showFormatter: new ShowFormatter(),
  svgReader: new SvgReader(new XmlParser(), shapeFactory, new SvgIdAllocator(shapeFactory)),
  svgWriter: new SvgWriter(),
  treeFormatter: new TreeFormatter(),
});
const catalog = new CommandCatalog([
  ['init', () => new InitCommand()],
  ['read', () => new ReadCommand()],
  ['canvas', () => new CanvasCommand()],
  ['create', () => new CreateCommand()],
  ['delete', () => new DeleteCommand()],
  ['group', () => new GroupCommand()],
  ['ungroup', () => new UngroupCommand()],
  ['addto', () => new AddToContainerCommand()],
  ['front', () => new FrontCommand()],
  ['back', () => new BackCommand()],
  ['move', () => new MoveCommand()],
  ['scale', () => new ScaleCommand()],
  ['set', () => new SetCommand()],
  ['save', () => new SaveCommand()],
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
