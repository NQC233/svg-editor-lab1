import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import type { CommandResult } from './CommandResult.js';

export class RedoCommand extends Command {
  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    context.requireDocument();
    if (args.length > 0) {
      throw new DomainError('usage: redo');
    }

    return context.history.redo(context);
  }
}
