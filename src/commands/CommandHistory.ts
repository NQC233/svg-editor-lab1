import { DomainError } from '../shared/DomainError.js';
import type { CommandContext } from './CommandContext.js';
import type { CommandResult } from './CommandResult.js';
import type { EditCommand } from './EditCommand.js';

export class CommandHistory {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private locked = false;

  public record(command: EditCommand): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.locked = false;
  }

  public clearAndLock(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.locked = true;
  }

  public undo(context: CommandContext): CommandResult {
    this.assertUnlocked();
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      throw new DomainError('nothing to undo');
    }

    const result = command.undo(context);
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  public redo(context: CommandContext): CommandResult {
    this.assertUnlocked();
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      throw new DomainError('nothing to redo');
    }

    const result = command.redo(context);
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  private assertUnlocked(): void {
    if (this.locked) {
      throw new DomainError('undo not allowed after io command');
    }
  }
}
