import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class TreeCommand extends Command {
  public execute(context: CommandContext, args: readonly string[]): readonly string[] {
    const document = context.requireDocument();
    if (args.length > 1) {
      throw new DomainError('usage: tree [id]');
    }

    const id = args[0];
    if (id === undefined) {
      return context.treeFormatter.formatDocument(document);
    }

    return context.treeFormatter.formatShape(document.require(id));
  }
}
