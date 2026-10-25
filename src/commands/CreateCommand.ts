import type { Shape } from '../domain/Shape.js';
import { ShapeUsageError } from '../domain/ShapeUsageError.js';
import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class CreateCommand extends Command {
  private static readonly USAGE = 'usage: create <type> <id> [params...] [in <containerId>]';

  public execute(context: CommandContext, args: readonly string[]): readonly string[] {
    const document = context.requireDocument();
    if (args.length < 2) {
      throw new DomainError(CreateCommand.USAGE);
    }

    const type = args[0];
    const id = args[1];
    if (type === undefined || id === undefined) {
      throw new DomainError(CreateCommand.USAGE);
    }

    let shape: Shape;
    try {
      shape = context.shapeFactory.create(type, id, args.slice(2));
    } catch (error) {
      if (error instanceof ShapeUsageError) {
        throw new DomainError(`usage: create ${error.syntax}`);
      }

      throw error;
    }

    document.appendShape(shape);
    return [`${shape.label} created`];
  }
}
