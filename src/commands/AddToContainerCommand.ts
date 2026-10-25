import type { Container } from '../domain/Container.js';
import type { ShapePlacement } from '../domain/ShapePlacement.js';
import type { Shape } from '../domain/Shape.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface AddedShape {
  readonly shape: Shape;
  readonly target: Container;
  readonly placement: ShapePlacement;
}

export class AddToContainerCommand extends EditCommand {
  private static readonly USAGE = 'usage: addto <gid> <id>';
  private added: AddedShape | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 2) {
      throw new DomainError(AddToContainerCommand.USAGE);
    }

    const targetId = args.value(0);
    const shapeId = args.value(1);
    if (targetId === undefined || shapeId === undefined) {
      throw new DomainError(AddToContainerCommand.USAGE);
    }

    const target = document.requireContainer(targetId);
    const shape = document.require(shapeId);
    const placement = document.moveToEnd(shape, target);
    if (placement === undefined) {
      return new CommandResult([`${shape.label} unchanged`], false);
    }

    this.added = { shape, target, placement };
    return new CommandResult([this.addedMessage(shape, target)]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, placement } = this.requireAdded();
    document.restorePlacement(shape, placement);
    return new CommandResult([`${shape.label} moved back to ${document.parentLabelOf(shape)}`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, target } = this.requireAdded();
    const placement = document.moveToEnd(shape, target);
    if (placement === undefined) {
      throw new DomainError('addto command cannot redo');
    }

    this.added = { shape, target, placement };
    return new CommandResult([this.addedMessage(shape, target)]);
  }

  private requireAdded(): AddedShape {
    if (this.added === undefined) {
      throw new DomainError('addto command has not executed');
    }

    return this.added;
  }

  private addedMessage(shape: Shape, target: Container): string {
    return `${shape.label} added to ${target.label}`;
  }
}
