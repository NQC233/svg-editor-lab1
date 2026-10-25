import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class CreateCommand extends Command {
  public execute(context: CommandContext, args: readonly string[]): readonly string[] {
    const document = context.requireDocument();
    if (args.length < 2) {
      throw new DomainError('usage: create <type> <id> [params...] [in <containerId>]');
    }

    const type = args[0];
    const id = args[1];
    if (type === undefined || id === undefined) {
      throw new DomainError('usage: create <type> <id> [params...] [in <containerId>]');
    }

    const shape = context.shapeFactory.create(type, id, args.slice(2));
    document.appendShape(shape);
    return [`${shape.label} created`];
  }
}
