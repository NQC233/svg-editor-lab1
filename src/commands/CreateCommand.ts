import type { Shape } from '../domain/Shape.js';
import type { Container } from '../domain/Container.js';
import { ShapeUsageError } from '../domain/ShapeUsageError.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  private static readonly USAGE = 'usage: create <type> <id> [params...] [in <containerId>]';
  private createdShape: Shape | undefined;
  private insertionIndex: number | undefined;
  private insertionContainer: Container | undefined;
  private creationMessage: string | undefined;

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

    const inToken = args.get(args.length - 2);
    const hasContainerSuffix = inToken?.value === 'in' && !inToken.quoted;
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

    this.insertionIndex = document.appendShape(shape, container);
    this.insertionContainer = container;
    this.createdShape = shape;
    this.creationMessage =
      container === undefined
        ? `${shape.label} created`
        : `${shape.label} created in ${container.label}`;
    return new CommandResult([this.creationMessage]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const [shape] = this.requireCreatedShape();
    document.removeShape(shape);
    return new CommandResult([`${shape.label} removed`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const [shape, insertionIndex, container, creationMessage] = this.requireCreatedShape();
    document.insertShape(shape, insertionIndex, container);
    return new CommandResult([creationMessage]);
  }

  private requireCreatedShape(): readonly [Shape, number, Container | undefined, string] {
    if (
      this.createdShape === undefined ||
      this.insertionIndex === undefined ||
      this.creationMessage === undefined
    ) {
      throw new DomainError('create command has not executed');
    }

    return [this.createdShape, this.insertionIndex, this.insertionContainer, this.creationMessage];
  }
}
