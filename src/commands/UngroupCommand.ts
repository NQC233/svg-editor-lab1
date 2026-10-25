import { Container } from '../domain/Container.js';
import type { UngroupSnapshot } from '../domain/UngroupSnapshot.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  private static readonly USAGE = 'usage: ungroup <gid>';
  private ungrouped: UngroupSnapshot | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length !== 1) {
      throw new DomainError(UngroupCommand.USAGE);
    }

    const id = args.value(0);
    if (id === undefined) {
      throw new DomainError(UngroupCommand.USAGE);
    }

    const shape = document.require(id);
    if (!(shape instanceof Container)) {
      throw new DomainError(`not a container: ${id}`);
    }

    this.ungrouped = document.ungroup(shape);
    return new CommandResult([this.ungroupedMessage(this.ungrouped)]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const ungrouped = this.requireUngrouped();
    document.restoreUngrouped(ungrouped);
    return new CommandResult([
      `${ungrouped.container.label} restored with ${ungrouped.children.length} children`,
    ]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const ungrouped = this.requireUngrouped();
    this.ungrouped = document.ungroup(ungrouped.container);
    return new CommandResult([this.ungroupedMessage(this.ungrouped)]);
  }

  private requireUngrouped(): UngroupSnapshot {
    if (this.ungrouped === undefined) {
      throw new DomainError('ungroup command has not executed');
    }

    return this.ungrouped;
  }

  private ungroupedMessage(snapshot: UngroupSnapshot): string {
    return `${snapshot.container.label} ungrouped: ${snapshot.children.length} children`;
  }
}
