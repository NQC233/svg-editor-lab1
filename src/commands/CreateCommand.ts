import type { Shape } from '../domain/Shape.js';
import type { Container } from '../domain/Container.js';
import { ShapeUsageError } from '../domain/ShapeUsageError.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface CreatedShape {
  readonly shape: Shape;
  readonly insertionIndex: number;
  readonly container: Container | undefined;
  readonly message: string;
}

export class CreateCommand extends EditCommand {
  private static readonly USAGE = 'usage: create <type> <id> [params...] [in <containerId>]';
  private created: CreatedShape | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length < 2) {
      throw new DomainError(CreateCommand.USAGE);
    }

    const type = args.value(0);
    const id = args.value(1);
    if (type === undefined || id === undefined) {
      throw new DomainError(CreateCommand.USAGE);
    }

    const unquotedInIndexes: number[] = [];
    for (let index = 2; index < args.length; index += 1) {
      const token = args.get(index);
      if (token?.value === 'in' && !token.quoted) {
        unquotedInIndexes.push(index);
      }
    }

    const suffixStart = args.length - 2;
    const hasContainerSuffix =
      unquotedInIndexes.length === 1 && unquotedInIndexes[0] === suffixStart;
    if (unquotedInIndexes.length > 0 && !hasContainerSuffix) {
      throw new DomainError(CreateCommand.USAGE);
    }

    const containerId = hasContainerSuffix ? args.value(args.length - 1) : undefined;
    const container =
      containerId === undefined ? undefined : document.requireContainer(containerId);
    const shapeArgs = hasContainerSuffix ? args.slice(2, args.length - 2) : args.slice(2);

    let shape: Shape;
    try {
      shape = context.shapeFactory.create(type, id, shapeArgs.values());
    } catch (error) {
      if (error instanceof ShapeUsageError) {
        throw new DomainError(`usage: create ${error.syntax}`);
      }

      throw error;
    }

    const message =
      container === undefined
        ? `${shape.label} created`
        : `${shape.label} created in ${container.label}`;
    this.created = {
      shape,
      insertionIndex: document.appendShape(shape, container),
      container,
      message,
    };
    return new CommandResult([message]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape } = this.requireCreated();
    document.removeShape(shape);
    return new CommandResult([`${shape.label} removed`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, insertionIndex, container, message } = this.requireCreated();
    document.insertShape(shape, insertionIndex, container);
    return new CommandResult([message]);
  }

  private requireCreated(): CreatedShape {
    if (this.created === undefined) {
      throw new DomainError('create command has not executed');
    }

    return this.created;
  }
}
