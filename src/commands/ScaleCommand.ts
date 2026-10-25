import type { GeometrySnapshot } from '../domain/GeometrySnapshot.js';
import type { Shape } from '../domain/Shape.js';
import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

interface ScaledShape {
  readonly shape: Shape;
  readonly factor: number;
  readonly snapshots: readonly GeometrySnapshot[];
}

export class ScaleCommand extends EditCommand {
  private static readonly USAGE = 'usage: scale <id> <factor>';
  private scaled: ScaledShape | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 2) {
      throw new DomainError(ScaleCommand.USAGE);
    }

    const id = args.value(0);
    const factorToken = args.value(1);
    if (id === undefined || factorToken === undefined) {
      throw new DomainError(ScaleCommand.USAGE);
    }

    const factor = NumberParser.parse(factorToken);
    if (factor <= 0) {
      throw new DomainError('scale factor must be positive');
    }

    const shape = document.require(id);
    if (factor === 1) {
      return new CommandResult([this.unchangedMessage(shape)], false);
    }

    const snapshots = document.scale(shape, factor);
    if (snapshots.length === 0) {
      return new CommandResult([this.unchangedMessage(shape)], false);
    }

    this.scaled = { shape, factor, snapshots };
    return new CommandResult([this.scaledMessage(shape, factor)]);
  }

  public undo(context: CommandContext): CommandResult {
    context.requireDocument();
    const { shape, snapshots } = this.requireScaled();
    for (const snapshot of snapshots) {
      snapshot.restore();
    }

    return new CommandResult([`${shape.label} scale restored`]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const { shape, factor } = this.requireScaled();
    document.scale(shape, factor);
    return new CommandResult([this.scaledMessage(shape, factor)]);
  }

  private requireScaled(): ScaledShape {
    if (this.scaled === undefined) {
      throw new DomainError('scale command has not executed');
    }

    return this.scaled;
  }

  private unchangedMessage(shape: Shape): string {
    return `${shape.label} unchanged`;
  }

  private scaledMessage(shape: Shape, factor: number): string {
    return `${shape.label} scaled by ${NumberFormatter.format(factor)}`;
  }
}
