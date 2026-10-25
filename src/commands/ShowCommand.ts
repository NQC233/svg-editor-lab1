import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import { CommandKind } from './CommandKind.js';
import { CommandResult } from './CommandResult.js';

export class ShowCommand extends Command {
  public override get kind(): CommandKind {
    return CommandKind.Display;
  }

  public execute(context: CommandContext, args: readonly string[]): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 1) {
      throw new DomainError('usage: show <id>');
    }

    const id = args[0];
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
