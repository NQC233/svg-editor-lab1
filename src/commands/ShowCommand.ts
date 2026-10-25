import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';

export class ShowCommand extends Command {
  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 1) {
      throw new DomainError('usage: show <id>');
    }

    const id = args.value(0);
    if (id === undefined) {
      throw new DomainError('usage: show <id>');
    }

    const shape = document.require(id);
    return new CommandResult(
      context.showFormatter.format(shape, document.parentLabelOf(shape)),
      false,
    );
  }
}
