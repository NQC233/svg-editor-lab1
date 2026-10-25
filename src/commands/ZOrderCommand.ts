import type { ShapePlacement } from '../domain/ShapePlacement.js';
import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface ZOrderChange {
  readonly shape: Shape;
  readonly placement: ShapePlacement;
}

export abstract class ZOrderCommand extends EditCommand {
  private change: ZOrderChange | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 1) {
      throw new DomainError(this.usage);
    }

    const id = args.value(0);
    if (id === undefined) {
      throw new DomainError(this.usage);
    }

    const shape = document.require(id);
    const placement = this.move(document, shape);
    if (placement === undefined) {
      return new CommandResult([`${shape.label} is already at ${this.direction}`], false);
    }

    this.change = { shape, placement };
    return new CommandResult([`${shape.label} moved to ${this.direction}`]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, placement } = this.requireChange();
    document.restorePlacement(shape, placement);
    return new CommandResult([`${shape.label} moved back`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape } = this.requireChange();
    const placement = this.move(document, shape);
    if (placement === undefined) {
      throw new DomainError(`${this.direction} command cannot redo`);
    }

    this.change = { shape, placement };
    return new CommandResult([`${shape.label} moved to ${this.direction}`]);
  }

  protected abstract get direction(): 'front' | 'back';

  protected abstract get usage(): string;

  protected abstract move(document: SvgDocument, shape: Shape): ShapePlacement | undefined;

  private requireChange(): ZOrderChange {
    if (this.change === undefined) {
      throw new DomainError(`${this.direction} command has not executed`);
    }

    return this.change;
  }
}
