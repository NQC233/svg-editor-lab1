import type { Shape } from '../domain/Shape.js';
import type { ShapeAttributeSnapshot } from '../domain/ShapeAttributeSnapshot.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface UpdatedShape {
  readonly shape: Shape;
  readonly attribute: string;
  readonly value: string;
  readonly snapshot: ShapeAttributeSnapshot;
}

export class SetCommand extends EditCommand {
  private static readonly USAGE = 'usage: set <id> <attr> <value>';
  private updated: UpdatedShape | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 3) {
      throw new DomainError(SetCommand.USAGE);
    }

    const id = args.value(0);
    const attribute = args.value(1);
    const value = args.value(2);
    if (id === undefined || attribute === undefined || value === undefined) {
      throw new DomainError(SetCommand.USAGE);
    }

    const shape = document.require(id);
    const snapshot = shape.setAttribute(attribute, value);
    if (!snapshot.changed) {
      return new CommandResult([`${shape.label} unchanged`], false);
    }

    this.updated = { shape, attribute, value, snapshot };
    return new CommandResult([`${shape.label} updated: ${snapshot.updatedDescription}`]);
  }

  public undo(context: CommandContext): CommandResult {
    context.requireDocument();
    const { shape, snapshot } = this.requireUpdated();
    snapshot.restore();
    return new CommandResult([`${shape.label} updated: ${snapshot.restoredDescription}`]);
  }

  public redo(context: CommandContext): CommandResult {
    context.requireDocument();
    const { shape, attribute, value } = this.requireUpdated();
    const snapshot = shape.setAttribute(attribute, value);
    return new CommandResult([`${shape.label} updated: ${snapshot.updatedDescription}`]);
  }

  private requireUpdated(): UpdatedShape {
    if (this.updated === undefined) {
      throw new DomainError('set command has not executed');
    }

    return this.updated;
  }
}
