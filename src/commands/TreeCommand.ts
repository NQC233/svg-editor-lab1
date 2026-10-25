import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';

export class TreeCommand extends Command {
  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length > 1) {
      throw new DomainError('usage: tree [id]');
    }

    const id = args.value(0);
    if (id === undefined) {
      return new CommandResult(context.treeFormatter.formatDocument(document), false);
    }

    return new CommandResult(context.treeFormatter.formatShape(document.require(id)), false);
  }
}
