import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import { CommandKind } from './CommandKind.js';
import { CommandResult } from './CommandResult.js';

export class TreeCommand extends Command {
  public override get kind(): CommandKind {
    return CommandKind.Display;
  }

  public execute(context: CommandContext, args: readonly string[]): CommandResult {
    const document = context.requireDocument();
    if (args.length > 1) {
      throw new DomainError('usage: tree [id]');
    }

    const id = args[0];
    if (id === undefined) {
      return new CommandResult(context.treeFormatter.formatDocument(document), false);
    }

    return new CommandResult(context.treeFormatter.formatShape(document.require(id)), false);
  }
}
