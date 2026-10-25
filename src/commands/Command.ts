import type { CommandContext } from './CommandContext.js';

export abstract class Command {
  public abstract execute(context: CommandContext, args: readonly string[]): readonly string[];
}
