import type { Command } from '../commands/Command.js';

export type CommandRegistration = readonly [name: string, command: Command];

export class CommandCatalog {
  private readonly commands = new Map<string, Command>();

  public constructor(registrations: readonly CommandRegistration[]) {
    for (const [name, command] of registrations) {
      this.register(name, command);
    }
  }

  public find(name: string): Command | undefined {
    return this.commands.get(name);
  }

  private register(name: string, command: Command): void {
    this.commands.set(name, command);
  }
}
