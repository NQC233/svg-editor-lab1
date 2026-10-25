import type { Command } from '../commands/Command.js';

export type CommandFactory = () => Command;
export type CommandRegistration = readonly [name: string, createCommand: CommandFactory];

export class CommandCatalog {
  private readonly commands = new Map<string, CommandFactory>();

  public constructor(registrations: readonly CommandRegistration[]) {
    for (const [name, createCommand] of registrations) {
      this.register(name, createCommand);
    }
  }

  public find(name: string): CommandFactory | undefined {
    return this.commands.get(name);
  }

  private register(name: string, createCommand: CommandFactory): void {
    this.commands.set(name, createCommand);
  }
}
