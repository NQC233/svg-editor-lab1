import { CanvasCommand } from '../commands/CanvasCommand.js';
import type { Command } from '../commands/Command.js';
import { HelpCommand } from '../commands/HelpCommand.js';
import { InitCommand } from '../commands/InitCommand.js';

export class CommandCatalog {
  private readonly commands = new Map<string, Command>();

  public constructor() {
    this.register('init', new InitCommand());
    this.register('canvas', new CanvasCommand());
    this.register('help', new HelpCommand());
  }

  public find(name: string): Command | undefined {
    return this.commands.get(name);
  }

  private register(name: string, command: Command): void {
    this.commands.set(name, command);
  }
}
