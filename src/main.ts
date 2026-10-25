import { CliApplication } from './cli/CliApplication.js';
import { CommandCatalog } from './cli/CommandCatalog.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { CommandContext } from './commands/CommandContext.js';
import { CommandInvoker } from './commands/CommandInvoker.js';

const context = new CommandContext();
const dispatcher = new CommandDispatcher(new CommandCatalog(), new CommandInvoker(context));
const application = new CliApplication({ dispatcher });
await application.run();
