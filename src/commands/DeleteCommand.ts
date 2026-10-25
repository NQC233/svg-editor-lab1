import { DomainError } from '../shared/DomainError.js';
import type { ShapePlacement } from '../domain/ShapePlacement.js';
import type { Shape } from '../domain/Shape.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface DeletedShape {
  readonly shape: Shape;
  readonly placement: ShapePlacement;
}

export class DeleteCommand extends EditCommand {
  private static readonly USAGE = 'usage: delete <id>';
  private deleted: DeletedShape | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 1) {
      throw new DomainError(DeleteCommand.USAGE);
    }

    const id = args.value(0);
    if (id === undefined) {
      throw new DomainError(DeleteCommand.USAGE);
    }

    const shape = document.require(id);
    const placement = document.removeShape(shape);
    this.deleted = { shape, placement };
    return new CommandResult([this.deletedMessage(shape)]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, placement } = this.requireDeleted();
    document.insertShape(shape, placement.index, placement.parent);
    return new CommandResult([`${shape.label} restored into ${document.parentLabelOf(shape)}`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape } = this.requireDeleted();
    document.removeShape(shape);
    return new CommandResult([this.deletedMessage(shape)]);
  }

  private requireDeleted(): DeletedShape {
    if (this.deleted === undefined) {
      throw new DomainError('delete command has not executed');
    }

    return this.deleted;
  }

  private deletedMessage(shape: Shape): string {
    return `${shape.label} deleted`;
  }
}
