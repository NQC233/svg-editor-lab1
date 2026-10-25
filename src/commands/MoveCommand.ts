import type { GeometrySnapshot } from '../domain/GeometrySnapshot.js';
import type { Shape } from '../domain/Shape.js';
import { DomainError } from '../shared/DomainError.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface MovedShape {
  readonly shape: Shape;
  readonly dx: number;
  readonly dy: number;
  readonly snapshots: readonly GeometrySnapshot[];
}

export class MoveCommand extends EditCommand {
  private static readonly USAGE = 'usage: move <id> <dx> <dy>';
  private moved: MovedShape | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 3) {
      throw new DomainError(MoveCommand.USAGE);
    }

    const id = args.value(0);
    const dxToken = args.value(1);
    const dyToken = args.value(2);
    if (id === undefined || dxToken === undefined || dyToken === undefined) {
      throw new DomainError(MoveCommand.USAGE);
    }

    const dx = NumberParser.parse(dxToken);
    const dy = NumberParser.parse(dyToken);
    const shape = document.require(id);
    if (dx === 0 && dy === 0) {
      return new CommandResult([shape.unchangedMessage], false);
    }

    const snapshots = document.move(shape, dx, dy);
    if (snapshots.length === 0) {
      return new CommandResult([shape.unchangedMessage], false);
    }

    this.moved = { shape, dx, dy, snapshots };
    return new CommandResult([shape.movedMessage(dx, dy)]);
  }

  public undo(context: CommandContext): CommandResult {
    context.requireDocument();
    const { shape, dx, dy, snapshots } = this.requireMoved();
    for (const snapshot of snapshots) {
      snapshot.restore();
    }

    return new CommandResult([shape.moveBackMessage(dx, dy)]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, dx, dy } = this.requireMoved();
    document.move(shape, dx, dy);
    return new CommandResult([shape.movedMessage(dx, dy)]);
  }

  private requireMoved(): MovedShape {
    if (this.moved === undefined) {
      throw new DomainError('move command has not executed');
    }

    return this.moved;
  }
}
