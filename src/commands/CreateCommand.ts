import type { Shape } from '../domain/Shape.js';
import { ShapeUsageError } from '../domain/ShapeUsageError.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  private static readonly USAGE = 'usage: create <type> <id> [params...] [in <containerId>]';
  private createdShape: Shape | undefined;
  private insertionIndex: number | undefined;

  public execute(context: CommandContext, args: readonly string[]): CommandResult {
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

    this.insertionIndex = document.appendShape(shape);
    this.createdShape = shape;
    return new CommandResult([`${shape.label} created`]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const [shape] = this.requireCreatedShape();
    document.removeShape(shape);
    return new CommandResult([`${shape.label} removed`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const [shape, insertionIndex] = this.requireCreatedShape();
    document.insertShape(shape, insertionIndex);
    return new CommandResult([`${shape.label} created`]);
  }

  private requireCreatedShape(): readonly [Shape, number] {
    if (this.createdShape === undefined || this.insertionIndex === undefined) {
      throw new DomainError('create command has not executed');
    }

    return [this.createdShape, this.insertionIndex];
  }
}
