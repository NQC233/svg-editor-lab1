import type { GroupSnapshot } from '../domain/GroupSnapshot.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  private static readonly USAGE = 'usage: group <newGid> <id1> <id2>...';
  private grouped: GroupSnapshot | undefined;

  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length < 2) {
      throw new DomainError(GroupCommand.USAGE);
    }

    const newGroupId = args.value(0);
    if (newGroupId === undefined) {
      throw new DomainError(GroupCommand.USAGE);
    }

    const targetIds = args.values().slice(1);
    const group = context.shapeFactory.createGroup(newGroupId);
    this.grouped = document.groupShapes(group, targetIds);
    return new CommandResult([this.createdMessage(this.grouped)]);
  }

  public undo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const grouped = this.requireGrouped();
    document.restoreGrouped(grouped);
    return new CommandResult([
      `${grouped.group.label} removed; ${grouped.children.length} children restored`,
    ]);
  }

  public redo(context: CommandContext): CommandResult {
    const document = context.requireDocument();
    const grouped = this.requireGrouped();
    document.reapplyGroup(grouped);
    return new CommandResult([this.createdMessage(grouped)]);
  }

  private requireGrouped(): GroupSnapshot {
    if (this.grouped === undefined) {
      throw new DomainError('group command has not executed');
    }

    return this.grouped;
  }

  private createdMessage(snapshot: GroupSnapshot): string {
    return `${snapshot.group.label} created with ${snapshot.children.length} children`;
  }
}
