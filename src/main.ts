import { CliApplication } from './cli/CliApplication.js';
import { CommandCatalog } from './cli/CommandCatalog.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { ConsoleOutput } from './cli/ConsoleOutput.js';
import { LineTokenizer } from './cli/LineTokenizer.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CommandContext } from './commands/CommandContext.js';
import { CommandInvoker } from './commands/CommandInvoker.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { ShowFormatter } from './display/ShowFormatter.js';
import { TreeFormatter } from './display/TreeFormatter.js';
import { ShapeFactory } from './domain/ShapeFactory.js';

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
const dispatcher = new CommandDispatcher(catalog, new CommandInvoker(context));
const application = new CliApplication({
  dispatcher,
  input: process.stdin,
  output: new ConsoleOutput(process.stdout),
  tokenizer: new LineTokenizer(),
});
await application.run();
